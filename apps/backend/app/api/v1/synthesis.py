from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.services.llm import generate_synthesis, generate_edge_label
from app.api.v1.nodes import nodes_store

router = APIRouter()

class SynthesisRequest(BaseModel):
    node_ids: List[str]
    query: str

class SynthesisResponse(BaseModel):
    summary: str
    sources: List[str]
    query: str

@router.post("/", response_model=SynthesisResponse)
async def create_synthesis(request: SynthesisRequest):
    """
    Generate an AI synthesis from selected nodes.
    """
    print(f"Received synthesis request for {len(request.node_ids)} nodes: {request.node_ids}")
    if not request.node_ids:
        raise HTTPException(status_code=400, detail="No nodes selected")
    
    if not request.query:
        raise HTTPException(status_code=400, detail="Query is required")
    
    # Gather node contents
    node_contents = []
    source_titles = []
    
    for node_id in request.node_ids:
        node = nodes_store.get(node_id)
        if node:
            node_contents.append({
                "title": node.get("title", "Untitled"),
                "content": node.get("content", ""),
                "url": node.get("url", "")
            })
            source_titles.append(node.get("title", "Untitled"))
    
    if not node_contents:
        raise HTTPException(status_code=404, detail="No valid nodes found")
    
    # Generate synthesis
    summary = await generate_synthesis(request.query, node_contents)
    
    return SynthesisResponse(
        summary=summary,
        sources=source_titles,
        query=request.query
    )

class EdgeLabelRequest(BaseModel):
    source_id: str
    target_id: str

class EdgeLabelResponse(BaseModel):
    label: str
    source_id: str
    target_id: str

@router.post("/edge-label", response_model=EdgeLabelResponse)
async def get_edge_label(request: EdgeLabelRequest):
    """Generate a semantic label for an edge between two nodes."""
    source_node = nodes_store.get(request.source_id)
    target_node = nodes_store.get(request.target_id)
    
    if not source_node or not target_node:
        raise HTTPException(status_code=404, detail="One or both nodes not found")
    
    source_content = source_node.get("content", source_node.get("title", ""))
    target_content = target_node.get("content", target_node.get("title", ""))
    
    label = await generate_edge_label(source_content, target_content)
    
    return EdgeLabelResponse(
        label=label,
        source_id=request.source_id,
        target_id=request.target_id
    )

class SearchRequest(BaseModel):
    query: str
    limit: int = 10

class SearchResponse(BaseModel):
    results: List[dict]
    query: str

@router.post("/search", response_model=SearchResponse)
async def search_nodes(request: SearchRequest):
    """Search nodes by content or title."""
    query_lower = request.query.lower()
    
    results = []
    for node in nodes_store.values():
        title = node.get("title", "").lower()
        content = node.get("content", "").lower()
        
        if query_lower in title or query_lower in content:
            results.append(node)
    
    return SearchResponse(
        results=results[:request.limit],
        query=request.query
    )


# --- PDF Research Report Generation ---

import io
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from app.services.llm import generate_research_report

class ResearchContextItem(BaseModel):
    title: str
    content: str  # Selected topics only or full content
    url: str

class ResearchPDFRequest(BaseModel):
    query: str
    context_items: List[ResearchContextItem]

@router.post("/research-pdf")
async def generate_research_pdf(request: ResearchPDFRequest):
    """
    Generate a full academic research PDF report from selected graph nodes.
    """
    # 1. Prepare context for LLM
    context_str = ""
    for i, item in enumerate(request.context_items):
        context_str += f"Source {i+1} - {item.title} ({item.url}):\n{item.content}\n\n"
    
    # 2. Get structured report from AI
    report_data = await generate_research_report(request.query, context_str)
    
    # 3. Generate PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=72)
    
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='ResearchTitle', parent=styles['Title'], fontSize=24, spaceAfter=30))
    styles.add(ParagraphStyle(name='ResearchHeading', parent=styles['Heading1'], fontSize=16, spaceBefore=20, spaceAfter=12))
    styles.add(ParagraphStyle(name='ResearchSubHeading', parent=styles['Heading2'], fontSize=14, spaceBefore=15, spaceAfter=10))
    styles.add(ParagraphStyle(name='ResearchBody', parent=styles['Normal'], fontSize=11, leading=16, spaceAfter=12, alignment=4)) # 4=Justify
    styles.add(ParagraphStyle(name='AbstractBody', parent=styles['Italic'], fontSize=10, leading=14, leftIndent=40, rightIndent=40, spaceAfter=30))
    
    story = []
    
    # --- Title Page ---
    story.append(Spacer(1, 2*inch))
    story.append(Paragraph(report_data.get("title", f"Research Report: {request.query}"), styles['ResearchTitle']))
    story.append(Spacer(1, 0.5*inch))
    story.append(Paragraph(f"Synthesized Research on: {request.query}", styles['Normal']))
    story.append(Spacer(1, 0.2*inch))
    from datetime import datetime
    story.append(Paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y')}", styles['Normal']))
    story.append(PageBreak())
    
    # --- Abstract & Introduction ---
    story.append(Paragraph("Abstract", styles['ResearchHeading']))
    story.append(Paragraph(report_data.get("abstract", "No abstract available"), styles['AbstractBody']))
    
    story.append(Paragraph("Introduction", styles['ResearchHeading']))
    story.append(Paragraph(report_data.get("introduction", ""), styles['ResearchBody']))
    
    # --- Main Sections ---
    sections = report_data.get("sections", [])
    for section in sections:
        story.append(Paragraph(section.get("heading", "Untitled Section"), styles['ResearchHeading']))
        # Handle newlines in body
        body_text = section.get("body", "").replace("\n", "<br/>")
        story.append(Paragraph(body_text, styles['ResearchBody']))
        
    # --- Conclusion ---
    story.append(Paragraph("Conclusion", styles['ResearchHeading']))
    story.append(Paragraph(report_data.get("conclusion", ""), styles['ResearchBody']))
    
    # --- References ---
    story.append(PageBreak())
    story.append(Paragraph("References", styles['ResearchHeading']))
    
    refs = report_data.get("references", [])
    for ref in refs:
        story.append(Paragraph(ref, styles['BodyText']))
        story.append(Spacer(1, 6))
        
    # Build PDF
    doc.build(story)
    
    # Return buffer
    buffer.seek(0)
    
    headers = {
        'Content-Disposition': f'attachment; filename="Research_Report_{request.query.replace(" ", "_").lower()}.pdf"'
    }
    
    return StreamingResponse(buffer, media_type='application/pdf', headers=headers)
