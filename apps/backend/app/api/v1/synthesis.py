from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.services.llm import generate_synthesis, generate_edge_label
from app.models.node import Node
from app.core.database import get_db
from app.api.v1.oauth import get_current_user
from app.models.user import User
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from fastapi.responses import StreamingResponse
import json
from app.services.orchestrator import SynthesisOrchestrator

orchestrator = SynthesisOrchestrator()

router = APIRouter()

class SynthesisRequest(BaseModel):
    node_ids: List[str]
    query: str
    previous_summary: Optional[str] = None

class SynthesisResponse(BaseModel):
    summary: str
    sources: List[str]
    query: str

@router.post("/", response_model=SynthesisResponse)
async def create_synthesis(
    request: SynthesisRequest, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
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
    
    # Fetch nodes from DB
    result = await db.execute(select(Node).where(Node.id.in_(request.node_ids), Node.user_id == current_user.id))
    nodes = result.scalars().all()
    
    for node in nodes:
        node_contents.append({
            "title": node.title,
            "content": node.content or "",
            "url": node.url or ""
        })
        source_titles.append(node.title)
    
    if not node_contents:
        raise HTTPException(status_code=404, detail="No valid nodes found")
    
    # Generate synthesis
    summary = await generate_synthesis(request.query, node_contents, request.previous_summary)
    
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
async def get_edge_label(
    request: EdgeLabelRequest, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate a semantic label for an edge between two nodes."""
    source_result = await db.execute(select(Node).where(Node.id == request.source_id, Node.user_id == current_user.id))
    source_node = source_result.scalar_one_or_none()
    
    target_result = await db.execute(select(Node).where(Node.id == request.target_id, Node.user_id == current_user.id))
    target_node = target_result.scalar_one_or_none()
    
    if not source_node or not target_node:
        raise HTTPException(status_code=404, detail="One or both nodes not found")
    
    source_content = source_node.content or source_node.title
    target_content = target_node.content or target_node.title
    
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
async def search_nodes(
    request: SearchRequest, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search nodes by content or title."""
    query_text = f"%{request.query}%"
    stmt = select(Node).where(
        or_(
            Node.title.ilike(query_text), 
            Node.content.ilike(query_text)
        ),
        Node.user_id == current_user.id
    ).limit(request.limit)
    
    result = await db.execute(stmt)
    nodes = result.scalars().all()
    
    results = []
    for node in nodes:
        meta = node.metadata_ or {}
        results.append({
            "id": node.id,
            "title": node.title,
            "content": node.content,
            "url": node.url,
            "type": node.type,
            "metadata": meta
        })
    
    return SearchResponse(
        results=results,
        query=request.query
    )


# --- PDF Research Report Generation ---
# Note: For strict correctness, the PDF endpoints below would also need refactoring 
# to fetch data from the DB instead of assuming context_items strictly contain all content.
# However, the current implementations of research-pdf endpoints take 'context_items' 
# fully populated from the frontend request (which might have fetched them from the store/API),
# so they DO NOT strictly depend on 'nodes_store' unless they try to fetch missing content.
# Looking at the original file, 'generate_research_pdf' etc. utilize request.context_items directly.
# They do NOT import nodes_store. 
# So we only need to preserve the imports and the rest of the file content that handles PDF generation.

import io
import asyncio
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Image
from app.services.llm import (
    generate_research_report,
    summarize_topic_chunk,
    merge_topic_sections,
    assemble_research_document
)
from app.services.chart_renderer import render_chart
from app.services.chunk_service import (
    Chunk, NodeContext,
    segment_nodes,
    order_chunks_hierarchically,
    enforce_token_budget,
    group_chunks_by_topic,
    prepare_synthesis_context,
    build_source_map,
    get_url_to_ref_map,
    TOKEN_LIMITS
)
from app.services.latex_service import (
    generate_latex_document,
    compile_latex_to_pdf,
    get_latex_only
)
from app.services.document_ast import (
    DocumentAST,
    parse_document_ast,
    document_to_dict,
    create_insufficient_data_block
)
from app.services.ast_to_latex import convert_document_to_latex, convert_section_to_standalone_latex
from app.services.llm import generate_document_ast
from app.services.dummy_data import get_dummy_research_data, get_dummy_document_ast

class ResearchContextItem(BaseModel):
    title: str
    content: str  # Selected topics only or full content
    url: str
    system_instruction: Optional[str] = None

class ResearchPDFRequest(BaseModel):
    query: str
    context_items: List[ResearchContextItem]
    use_dummy_data: bool = False
    edges: Optional[List[dict]] = None

@router.post("/research-pdf")
async def generate_research_pdf(
    request: ResearchPDFRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Generate a full academic research PDF report from selected graph nodes.
    """
    if request.use_dummy_data:
        print(f"[Research PDF] Using dummy data for query: {request.query}")
        report_data = get_dummy_research_data(request.query)
    else:
        # 1. Prepare context for LLM
        context_str = ""
        for i, item in enumerate(request.context_items):
            instr = f"\\n[INSTRUCTION: {item.system_instruction}]" if item.system_instruction else ""
            context_str += f"Source {i+1} - {item.title} ({item.url}):\\n{item.content}{instr}\\n\\n"
        
        # 2. Get structured report from AI
        report_data = await generate_research_report(request.query, context_str)
    
    # 3. Generate PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=72)
    # ... (PDF generation logic reuse or refactor would be ideal, but for now copying inline logic is safer to avoid breaking changes in replace)
    
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='ResearchTitle', parent=styles['Title'], fontSize=24, spaceAfter=30))
    styles.add(ParagraphStyle(name='ResearchHeading', parent=styles['Heading1'], fontSize=16, spaceBefore=20, spaceAfter=12))
    styles.add(ParagraphStyle(name='ResearchSubHeading', parent=styles['Heading2'], fontSize=14, spaceBefore=15, spaceAfter=10))
    styles.add(ParagraphStyle(name='ResearchBody', parent=styles['Normal'], fontSize=11, leading=16, spaceAfter=12, alignment=4)) # 4=Justify
    styles.add(ParagraphStyle(name='AbstractBody', parent=styles['Italic'], fontSize=10, leading=14, leftIndent=40, rightIndent=40, spaceAfter=30))
    styles.add(ParagraphStyle(name='FigureCaption', parent=styles['Italic'], fontSize=9, leading=12, alignment=1, spaceBefore=6, spaceAfter=20))  # 1=Center
    
    story = []
    figure_counter = 0  # Global figure counter
    
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
        body_text = section.get("body", "").replace("\\n", "<br/>")
        story.append(Paragraph(body_text, styles['ResearchBody']))
        
        # --- Render Figures ---
        figures = section.get("figures", [])
        for fig in figures:
            if not fig or not isinstance(fig, dict):
                continue
                
            fig_type = fig.get("type", "")
            if not fig_type or fig_type == "image_placeholder":
                # Skip placeholders - we don't fabricate images
                continue
            
            # Render the chart
            chart_buffer = render_chart(fig)
            if chart_buffer:
                figure_counter += 1
                
                # Create Image flowable
                img = Image(chart_buffer, width=5*inch, height=3.5*inch)
                story.append(Spacer(1, 0.3*inch))
                story.append(img)
                
                # Add caption
                caption = fig.get("caption", f"Figure {figure_counter}")
                source_ref = fig.get("source_ref", "")
                if source_ref:
                    caption = f"{caption} {source_ref}"
                story.append(Paragraph(caption, styles['FigureCaption']))
        
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


# ============================================================
# CHUNKED MULTI-PASS SYNTHESIS ENDPOINT
# ============================================================

class ChunkedContextItem(BaseModel):
    """Enhanced context item with topic hierarchy info."""
    node_id: str
    title: str
    content: str
    url: str
    selected_topics: List[str] = []
    outline: List[dict] = []
    system_instruction: Optional[str] = None

class ChunkedPDFRequest(BaseModel):
    query: str
    context_items: List[ChunkedContextItem]
    use_dummy_data: bool = False
    edges: Optional[List[dict]] = None

@router.post("/research-pdf-chunked")
async def generate_chunked_research_pdf(
    request: ChunkedPDFRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Generate a research PDF using token-efficient multi-pass synthesis.
    """
    if request.use_dummy_data:
        print(f"[Chunked PDF] Using dummy data for query: {request.query}")
        report_data = get_dummy_research_data(request.query)
        # Add dummy chunks context info just for correctness of flow
        chunks = [] 
    else:
        print(f"[Chunked PDF] Starting for query: {request.query}, nodes: {len(request.context_items)}")
        
        # 1. Convert to NodeContext and segment
        node_contexts = [
            NodeContext(
                node_id=item.node_id,
                url=item.url,
                title=item.title,
                content=item.content,
                selected_topics=item.selected_topics,
                outline=item.outline,
                system_instruction=item.system_instruction or ""
            )
            for item in request.context_items
        ]
        
        chunks = segment_nodes(node_contexts)
        chunks = order_chunks_hierarchically(chunks)
        chunks = enforce_token_budget(chunks, TOKEN_LIMITS["synthesis_pass"])
        
        print(f"[Chunked PDF] Created {len(chunks)} chunks")
        
        # 2. Pass 1: Parallel topic summarization
        url_to_ref = get_url_to_ref_map(chunks)
        source_map = build_source_map(chunks)
        
        async def summarize_chunk(chunk: Chunk):
            ref_id = url_to_ref.get(chunk.source_url, "0")
            ref = f"[{ref_id}]"
            return await summarize_topic_chunk(chunk.content, chunk.heading, ref)
        
        summaries = await asyncio.gather(*[
            summarize_chunk(chunk) for chunk in chunks
        ])
        
        print(f"[Chunked PDF] Pass 1 complete: {len(summaries)} summaries")
        
        # 3. Pass 2: Group and merge by topic
        topic_groups = group_chunks_by_topic(chunks)
        merged_sections = []
        
        for topic_heading, topic_chunks in topic_groups.items():
            # Get corresponding summaries
            topic_summaries = []
            for chunk in topic_chunks:
                idx = chunks.index(chunk)
                topic_summaries.append(summaries[idx])
            
            merged = await merge_topic_sections(topic_heading, topic_summaries)
            merged_sections.append(merged)
        
        print(f"[Chunked PDF] Pass 2 complete: {len(merged_sections)} sections")
        
        # 4. Pass 3: Assemble document
        report_data = await assemble_research_document(request.query, merged_sections, source_map)
    
    print(f"[Chunked PDF] Pass 3 complete, generating PDF...")
    
    # 5. Generate PDF (reuse existing PDF builder)
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=72)
    
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='ResearchTitle', parent=styles['Title'], fontSize=24, spaceAfter=30))
    styles.add(ParagraphStyle(name='ResearchHeading', parent=styles['Heading1'], fontSize=16, spaceBefore=20, spaceAfter=12))
    styles.add(ParagraphStyle(name='ResearchBody', parent=styles['Normal'], fontSize=11, leading=16, spaceAfter=12, alignment=4))
    styles.add(ParagraphStyle(name='AbstractBody', parent=styles['Italic'], fontSize=10, leading=14, leftIndent=40, rightIndent=40, spaceAfter=30))
    styles.add(ParagraphStyle(name='FigureCaption', parent=styles['Italic'], fontSize=9, leading=12, alignment=1, spaceBefore=6, spaceAfter=20))
    
    story = []
    figure_counter = 0
    
    # Title Page
    story.append(Spacer(1, 2*inch))
    story.append(Paragraph(report_data.get("title", f"Research Report: {request.query}"), styles['ResearchTitle']))
    story.append(Spacer(1, 0.5*inch))
    story.append(Paragraph(f"Multi-Pass Synthesis", styles['Normal']))
    from datetime import datetime
    story.append(Paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y')}", styles['Normal']))
    story.append(PageBreak())
    
    # Abstract & Introduction
    story.append(Paragraph("Abstract", styles['ResearchHeading']))
    story.append(Paragraph(report_data.get("abstract", ""), styles['AbstractBody']))
    
    story.append(Paragraph("Introduction", styles['ResearchHeading']))
    story.append(Paragraph(report_data.get("introduction", ""), styles['ResearchBody']))
    
    # Sections with figures
    for section in report_data.get("sections", []):
        story.append(Paragraph(section.get("heading", ""), styles['ResearchHeading']))
        body_text = section.get("body", "").replace("\\n", "<br/>")
        story.append(Paragraph(body_text, styles['ResearchBody']))
        
        # Render figures
        for fig in section.get("figures", []):
            if not fig or fig.get("type") == "image_placeholder":
                continue
            chart_buffer = render_chart(fig)
            if chart_buffer:
                figure_counter += 1
                img = Image(chart_buffer, width=5*inch, height=3.5*inch)
                story.append(Spacer(1, 0.3*inch))
                story.append(img)
                caption = fig.get("caption", f"Figure {figure_counter}")
                story.append(Paragraph(caption, styles['FigureCaption']))
    
    # Conclusion
    story.append(Paragraph("Conclusion", styles['ResearchHeading']))
    story.append(Paragraph(report_data.get("conclusion", ""), styles['ResearchBody']))
    
    # References
    story.append(PageBreak())
    story.append(Paragraph("References", styles['ResearchHeading']))
    for ref in report_data.get("references", []):
        story.append(Paragraph(ref, styles['BodyText']))
        story.append(Spacer(1, 6))
    
    doc.build(story)
    buffer.seek(0)
    
    headers = {
        'Content-Disposition': f'attachment; filename="Research_Report_Chunked_{request.query.replace(" ", "_").lower()}.pdf"'
    }
    
    print(f"[Chunked PDF] Complete!")
    return StreamingResponse(buffer, media_type='application/pdf', headers=headers)


# ============================================================
# LATEX PDF GENERATION ENDPOINT
# ============================================================

class LaTeXPDFRequest(BaseModel):
    """Request for LaTeX-based PDF generation."""
    query: str
    context_items: List[ChunkedContextItem]
    return_tex: bool = False  # If True, return .tex file instead of PDF
    use_dummy_data: bool = False
    strict_mode: bool = True
    edges: Optional[List[dict]] = None

@router.post("/research-latex")
async def generate_latex_research_pdf(
    request: LaTeXPDFRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Generate a publication-quality PDF using LaTeX.
    """
    source_map = {}
    
    if request.use_dummy_data:
        print(f"[LaTeX PDF] Using dummy data for query: {request.query}")
        report_data = get_dummy_research_data(request.query)
        # Create minimal source map for dummy
        source_map = {"[1]": {"url": "http://dummy.url", "title": "Dummy Source"}}
    else:
        print(f"[LaTeX PDF] Starting for query: {request.query}, nodes: {len(request.context_items)}")
        
        # 1. Convert to NodeContext and segment
        node_contexts = [
            NodeContext(
                node_id=item.node_id,
                url=item.url,
                title=item.title,
                content=item.content,
                selected_topics=item.selected_topics,
                outline=item.outline,
                system_instruction=item.system_instruction or ""
            )
            for item in request.context_items
        ]
        
        chunks = segment_nodes(node_contexts)
        chunks = order_chunks_hierarchically(chunks)
        chunks = enforce_token_budget(chunks, TOKEN_LIMITS["synthesis_pass"])
        
        print(f"[LaTeX PDF] Created {len(chunks)} chunks")
        
        # 2. Pass 1: Parallel topic summarization
        url_to_ref = get_url_to_ref_map(chunks)
        source_map = build_source_map(chunks)
        
        async def summarize_chunk(chunk: Chunk):
            ref_id = url_to_ref.get(chunk.source_url, "0")
            ref = f"[{ref_id}]"
            return await summarize_topic_chunk(chunk.content, chunk.heading, ref)
        
        summaries = await asyncio.gather(*[
            summarize_chunk(chunk) for chunk in chunks
        ])
        
        print(f"[LaTeX PDF] Pass 1 complete: {len(summaries)} summaries")
        
        # 3. Pass 2: Group and merge by topic
        topic_groups = group_chunks_by_topic(chunks)
        merged_sections = []
        
        for topic_heading, topic_chunks in topic_groups.items():
            topic_summaries = []
            for chunk in topic_chunks:
                idx = chunks.index(chunk)
                topic_summaries.append(summaries[idx])
            
            merged = await merge_topic_sections(topic_heading, topic_summaries)
            merged_sections.append(merged)
        
        print(f"[LaTeX PDF] Pass 2 complete: {len(merged_sections)} sections")
        
        # 4. Pass 3: Assemble document
        report_data = await assemble_research_document(request.query, merged_sections, source_map)
    
    print(f"[LaTeX PDF] Pass 3 complete, generating LaTeX...")
    
    # 5. Generate LaTeX
    latex_code = generate_latex_document(report_data, source_map)
    
    # 6. If user wants raw .tex, return it
    if request.return_tex:
        buffer = io.BytesIO(latex_code.encode('utf-8'))
        headers = {
            'Content-Disposition': f'attachment; filename="Research_Report_{request.query.replace(" ", "_").lower()}.tex"'
        }
        return StreamingResponse(buffer, media_type='text/x-tex', headers=headers)
    
    # 7. Compile to PDF
    pdf_buffer, errors = compile_latex_to_pdf(latex_code, strict_mode=request.strict_mode)
    
    if pdf_buffer:
        headers = {
            'Content-Disposition': f'attachment; filename="Research_Report_{request.query.replace(" ", "_").lower()}.pdf"'
        }
        print(f"[LaTeX PDF] Complete!")
        return StreamingResponse(pdf_buffer, media_type='application/pdf', headers=headers)
    else:
        # Fallback: return .tex file if compilation failed
        print(f"[LaTeX PDF] Compilation failed, returning .tex file")
        buffer = io.BytesIO(latex_code.encode('utf-8'))
        headers = {
            'Content-Disposition': f'attachment; filename="Research_Report_{request.query.replace(" ", "_").lower()}.tex"',
            'X-Compilation-Failed': 'true',
            'X-Compilation-Errors': str(len(errors))
        }
        # We can't easily return JSON errors with a file download unless we use a specific header or status
        # For this endpoint, we default to the .tex fallback behavior but log the errors
        print(f"[LaTeX PDF] Errors: {errors}")
        return StreamingResponse(buffer, media_type='text/x-tex', headers=headers)


# ============================================================
# JSON AST DOCUMENT GENERATION ENDPOINTS
# ============================================================

class ASTPDFRequest(BaseModel):
    """Request for AST-based document generation."""
    query: str
    context_items: List[ChunkedContextItem]
    use_dummy_data: bool = False
    strict_mode: bool = True
    edges: Optional[List[dict]] = None
    whiteboard_id: Optional[str] = None
    parent_job_id: Optional[str] = None

@router.post("/research-ast")
async def get_research_ast(
    request: ASTPDFRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Generate and return the raw JSON AST for a research document.
    """
    if request.use_dummy_data:
        print(f"[AST] Using dummy data for query: {request.query}")
        validated = get_dummy_document_ast(request.query)
        return {"status": "success", "document": document_to_dict(validated)}
    
    print(f"[AST] Generating for query: {request.query}")
    
    # 1. Convert to NodeContext and segment
    node_contexts = [
        NodeContext(
            node_id=item.node_id,
            url=item.url,
            title=item.title,
            content=item.content,
            selected_topics=item.selected_topics,
            outline=item.outline
        )
        for item in request.context_items
    ]
    
    chunks = segment_nodes(node_contexts)
    chunks = order_chunks_hierarchically(chunks)
    chunks = enforce_token_budget(chunks, TOKEN_LIMITS["synthesis_pass"])
    
    # 2. Build context and source map
    context_str = prepare_synthesis_context(chunks)
    source_map = build_source_map(chunks)
    
    # 3. Build edge relationships for LLM
    url_to_ref = get_url_to_ref_map(chunks)
    node_to_ref = {c.node_id: url_to_ref[c.source_url] for c in chunks}
    
    transformed_edges = []
    if request.edges:
        for edge in request.edges:
            s_ref = node_to_ref.get(edge.get('source'))
            t_ref = node_to_ref.get(edge.get('target'))
            if s_ref and t_ref:
                transformed_edges.append({
                    "source": s_ref,
                    "target": t_ref,
                    "label": edge.get('label', '')
                })

    # 4. Generate AST via Multi-Agent Orchestrator
    ast_dict = await orchestrator.run_to_completion(
        request.query, 
        context_str, 
        source_map, 
        transformed_edges,
        user_id=current_user.id,
        whiteboard_id=request.whiteboard_id or "default",
        parent_job_id=request.parent_job_id
    )
    
    # 4. Validate against schema
    try:
        validated = parse_document_ast(ast_dict)
        orphans = validated.validate_citations()
        if orphans:
            print(f"[AST] Warning: Orphaned citations: {orphans}")
        
        return {"status": "success", "document": document_to_dict(validated)}
    except Exception as e:
        print(f"[AST] Validation failed: {e}")
        return {"status": "partial", "document": ast_dict, "validation_error": str(e)}


@router.post("/research-ast-stream")
async def stream_research_ast(
    request: ASTPDFRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Stream the research synthesis process using Server-Sent Events.
    """
    node_contexts = [
        NodeContext(
            node_id=item.node_id,
            url=item.url,
            title=item.title,
            content=item.content,
            selected_topics=item.selected_topics,
            outline=item.outline
        )
        for item in request.context_items
    ]
    
    chunks = segment_nodes(node_contexts)
    chunks = order_chunks_hierarchically(chunks)
    chunks = enforce_token_budget(chunks, TOKEN_LIMITS["synthesis_pass"])
    
    context_str = prepare_synthesis_context(chunks)
    source_map = build_source_map(chunks)
    
    url_to_ref = get_url_to_ref_map(chunks)
    node_to_ref = {c.node_id: url_to_ref[c.source_url] for c in chunks}
    
    transformed_edges = []
    if request.edges:
        for edge in request.edges:
            s_ref = node_to_ref.get(edge.get('source'))
            t_ref = node_to_ref.get(edge.get('target'))
            if s_ref and t_ref:
                transformed_edges.append({
                    "source": s_ref,
                    "target": t_ref,
                    "label": edge.get('label', '')
                })

    async def event_generator():
        async for step in orchestrator.execute(
            request.query, 
            context_str, 
            source_map, 
            transformed_edges,
            user_id=current_user.id,
            whiteboard_id=request.whiteboard_id or "default",
            parent_job_id=request.parent_job_id
        ):
            yield f"data: {json.dumps(step)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/research-ast-pdf")
async def generate_ast_pdf(
    request: ASTPDFRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Generate a PDF using the AST → LaTeX pipeline.
    """
    if request.use_dummy_data:
        print(f"[AST-PDF] Using dummy data for query: {request.query}")
        validated = get_dummy_document_ast(request.query)
    else:
        print(f"[AST-PDF] Starting for query: {request.query}")
        
        # 1. Convert to NodeContext and segment
        node_contexts = [
            NodeContext(
                node_id=item.node_id,
                url=item.url,
                title=item.title,
                content=item.content,
                selected_topics=item.selected_topics,
                outline=item.outline,
                system_instruction=item.system_instruction or ""
            )
            for item in request.context_items
        ]
        
        chunks = segment_nodes(node_contexts)
        chunks = order_chunks_hierarchically(chunks)
        chunks = enforce_token_budget(chunks, TOKEN_LIMITS["synthesis_pass"])
        
        # 2. Build context and source map
        context_str = prepare_synthesis_context(chunks)
        source_map = build_source_map(chunks)
        
        # 3. Build edge relationships for LLM
        url_to_ref = get_url_to_ref_map(chunks)
        node_to_ref = {c.node_id: url_to_ref[c.source_url] for c in chunks}
        
        transformed_edges = []
        if request.edges:
            for edge in request.edges:
                s_ref = node_to_ref.get(edge.get('source'))
                t_ref = node_to_ref.get(edge.get('target'))
                if s_ref and t_ref:
                    transformed_edges.append({
                        "source": s_ref,
                        "target": t_ref,
                        "label": edge.get('label', '')
                    })

        # 4. Generate AST
        ast_dict = await generate_document_ast(request.query, context_str, source_map, transformed_edges)
        
        # 4. Validate and convert
        try:
            validated = parse_document_ast(ast_dict)
            print(f"[AST-PDF] AST validated, converting to LaTeX...")
        except Exception as e:
            print(f"[AST-PDF] Validation warning: {e}")
            # Continue with unvalidated dict
            validated = DocumentAST(**ast_dict) if isinstance(ast_dict, dict) else None
            if not validated:
                return {"error": "AST generation failed"}
    
    # 5. Convert to LaTeX
    latex_code = convert_document_to_latex(validated)
    
    print(f"[AST-PDF] LaTeX generated, compiling...")
    
    # 6. Compile to PDF
    pdf_buffer, errors = compile_latex_to_pdf(latex_code, strict_mode=request.strict_mode)
    
    if pdf_buffer:
        headers = {
            'Content-Disposition': f'attachment; filename="Research_AST_{request.query.replace(" ", "_").lower()}.pdf"'
        }
        print(f"[AST-PDF] Complete!")
        return StreamingResponse(pdf_buffer, media_type='application/pdf', headers=headers)
    else:
        # Return .tex fallback
        print(f"[AST-PDF] Compilation failed, returning .tex")
        buffer = io.BytesIO(latex_code.encode('utf-8'))
        headers = {
            'Content-Disposition': f'attachment; filename="Research_AST_{request.query.replace(" ", "_").lower()}.tex"',
            'X-Compilation-Failed': 'true',
            'X-Compilation-Errors': str(len(errors))
        }
        return StreamingResponse(buffer, media_type='text/x-tex', headers=headers)


@router.post("/research-pdf-from-ast")
async def generate_pdf_from_ast(
    request_data: dict,
    current_user: User = Depends(get_current_user)
):
    """
    Generate a PDF directly from a provided JSON AST.
    
    Used by the advanced editor to compile the user's EDITED version.
    """
    document = request_data.get('document')
    strict_mode = request_data.get('strict_mode', True)
    
    if not document:
         raise HTTPException(status_code=400, detail="Missing document AST")

    print(f"[AST-Compile] Compiling edited AST: {document.get('title')}")
    
    try:
        # 1. Parse and validate
        validated = DocumentAST(**document)
        # We skip strict validation here to allow flexibility during editing,
        # but the DocumentAST constructor ensures basic schema conformity.
        
        # 2. Convert to LaTeX
        latex_code = convert_document_to_latex(validated)
        
        print(f"[AST-Compile] LaTeX generated, compiling...")
        
        # 3. Compile to PDF
        pdf_buffer, errors = compile_latex_to_pdf(latex_code, strict_mode=strict_mode)
        
        safe_title = validated.title.replace(" ", "_").lower() if validated.title else "document"
        
        if pdf_buffer:
            headers = {
                'Content-Disposition': f'attachment; filename="{safe_title}.pdf"'
            }
            print(f"[AST-Compile] Complete!")
            return StreamingResponse(pdf_buffer, media_type='application/pdf', headers=headers)
        else:
            # --- Section-Level Isolation ---
            print(f"[AST-Compile] Compilation failed. Starting section-level isolation...")
            broken_sections = []
            
            for section in validated.sections:
                print(f"[AST-Compile] Testing section: {section.title}")
                section_latex = convert_section_to_standalone_latex(section, validated.references)
                # Note: We use strict_mode=False for isolation to see if it compiles AT ALL
                sec_buffer, sec_errors = compile_latex_to_pdf(section_latex, strict_mode=False)
                
                if not sec_buffer:
                    print(f"[AST-Compile] Section {section.id} is BROKEN: {sec_errors}")
                    broken_sections.append({
                        "id": section.id,
                        "title": section.title,
                        "errors": sec_errors
                    })
            
            # Raise error with detailed isolation data
            print(f"[AST-Compile] Failed with {len(errors)} primary errors and {len(broken_sections)} broken sections")
            raise HTTPException(
                status_code=400, 
                detail={
                    "message": "PDF compilation failed", 
                    "errors": errors,
                    "broken_sections": broken_sections
                }
            )
            
    except HTTPException:
        # Re-raise HTTPExceptions as-is to preserve detail objects
        raise
    except Exception as e:
        print(f"[AST-Compile] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# SECTION REGENERATION ENDPOINT
# ============================================================

@router.post("/research-ast-to-latex")
async def generate_latex_from_ast(document: dict):
    """
    Convert a JSON AST directly to LaTeX source code.
    """
    try:
        validated = DocumentAST(**document)
        latex_code = convert_document_to_latex(validated)
        return {"latex": latex_code}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate-ast")
async def validate_ast(document: dict):
    """
    Validate an AST document structure before compilation.
    Returns list of issues (critical/warning).
    """
    try:
        # Pydantic validation first
        validated = DocumentAST(**document)
        
        # Structural validation
        issues = validated.validate_structure()
        
        return {
            "valid": len([i for i in issues if i.severity == "critical"]) == 0,
            "issues": [i.dict() for i in issues]
        }
    except Exception as e:
        return {
            "valid": False, 
            "issues": [{
                "severity": "critical", 
                "message": f"Schema validation error: {str(e)}", 
                "node_id": "root"
            }]
        }
