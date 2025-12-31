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

class ResearchPDFRequest(BaseModel):
    query: str
    context_items: List[ResearchContextItem]
    use_dummy_data: bool = False

@router.post("/research-pdf")
async def generate_research_pdf(request: ResearchPDFRequest):
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
            context_str += f"Source {i+1} - {item.title} ({item.url}):\n{item.content}\n\n"
        
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
        body_text = section.get("body", "").replace("\n", "<br/>")
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

class ChunkedPDFRequest(BaseModel):
    query: str
    context_items: List[ChunkedContextItem]
    use_dummy_data: bool = False

@router.post("/research-pdf-chunked")
async def generate_chunked_research_pdf(request: ChunkedPDFRequest):
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
                outline=item.outline
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
        body_text = section.get("body", "").replace("\n", "<br/>")
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

@router.post("/research-latex")
async def generate_latex_research_pdf(request: LaTeXPDFRequest):
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
                outline=item.outline
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

@router.post("/research-ast")
async def get_research_ast(request: ASTPDFRequest):
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
    
    print(f"[AST] Prepared {len(chunks)} chunks")
    
    # 3. Generate AST
    ast_dict = await generate_document_ast(request.query, context_str, source_map)
    
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


@router.post("/research-ast-pdf")
async def generate_ast_pdf(request: ASTPDFRequest):
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
        
        print(f"[AST-PDF] Prepared {len(chunks)} chunks")
        
        # 3. Generate AST
        ast_dict = await generate_document_ast(request.query, context_str, source_map)
        
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
async def generate_pdf_from_ast(request_data: dict):
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
            
    except Exception as e:
        print(f"[AST-Compile] Error: {e}")
        # If it's already an HTTPException, re-raise
        if isinstance(e, HTTPException):
            raise e
        return {"error": str(e)}


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
        # Schema validation failed
        return {
            "valid": False,
            "issues": [{
                "severity": "critical",
                "message": f"Schema Error: {str(e)}",
                "location": "Schema Validation"
            }]
        }


class LatexCompileRequest(BaseModel):
    latex_source: str
    strict_mode: bool = True


@router.post("/compile-latex")
async def compile_raw_latex(request: LatexCompileRequest):
    """
    Compile raw LaTeX source code to PDF.
    """
    try:
        pdf_buffer, errors = compile_latex_to_pdf(request.latex_source, strict_mode=request.strict_mode)
        
        if pdf_buffer:
            headers = {
                'Content-Disposition': 'attachment; filename="document.pdf"'
            }
            return StreamingResponse(pdf_buffer, media_type='application/pdf', headers=headers)
        else:
            raise HTTPException(status_code=400, detail={"message": "LaTeX compilation failed", "errors": errors})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class RegenerateSectionRequest(BaseModel):
    """Request for regenerating a specific section's content."""
    section_id: str
    section_title: str
    current_content: str  # Current section body for context
    source_context: str   # Relevant source material
    reference_ids: List[str]  # Available reference IDs to cite

@router.post("/regenerate-section")
async def regenerate_section(request: RegenerateSectionRequest):
    """
    Regenerate a section's content using AI while preserving structure.
    
    - Keeps section title and ID
    - Preserves reference IDs
    - Only replaces content blocks
    """
    print(f"[Regenerate] Section: {request.section_title}")
    
    provider, api_key, _ = await get_ai_client()
    
    if provider != "gemini":
        # Mock response
        return {
            "section_id": request.section_id,
            "content": [
                {
                    "type": "paragraph",
                    "data": {
                        "text": f"Regenerated content for {request.section_title}. This is a placeholder.",
                        "citations": request.reference_ids[:2] if request.reference_ids else []
                    }
                }
            ]
        }
    
    try:
        from google import genai
        from google.genai import types
        import asyncio
        
        client = genai.Client(api_key=api_key)
        
        prompt = f'''Regenerate ONLY the content blocks for this document section.

SECTION TITLE: {request.section_title}
SECTION ID: {request.section_id}

CURRENT CONTENT (for reference):
{request.current_content[:2000]}

SOURCE MATERIAL:
{request.source_context[:5000]}

AVAILABLE REFERENCE IDs: {json.dumps(request.reference_ids)}

OUTPUT FORMAT (STRICT JSON):
{{
  "content": [
    {{
      "type": "paragraph",
      "data": {{
        "text": "New content with citations [ref_id] inline.",
        "citations": ["ref_id"]
      }}
    }}
  ]
}}

RULES:
1. Return ONLY valid JSON.
2. Use ONLY reference IDs from the available list.
3. Preserve factual accuracy from source material.
4. Do NOT fabricate information.
5. If data is insufficient, include a warning block.
'''

        def call():
            return client.models.generate_content(
                model="gemini-2.5-flash-preview-09-2025",
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    max_output_tokens=2000,
                    response_mime_type="application/json"
                )
            )
        
        response = await asyncio.to_thread(call)
        
        if response and response.text:
            result = json.loads(response.text.strip())
            return {
                "section_id": request.section_id,
                "content": result.get("content", [])
            }
    
    except Exception as e:
        print(f"[Regenerate] Error: {e}")
    
    return {
        "section_id": request.section_id,
        "content": [
            {
                "type": "warning",
                "data": {"text": "Failed to regenerate section content."}
            }
        ]
    }
