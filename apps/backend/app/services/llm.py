from typing import List, Optional
import os
import json

# Chutes.ai API configuration
# Set CHUTES_API_KEY in environment to use Chutes.ai
# Falls back to OpenAI if OPENAI_API_KEY is set, then to mock

CHUTES_API_BASE = "https://llm.chutes.ai/v1"

async def get_ai_client():
    """Determine which AI provider to use based on environment variables."""
    gemini_key = os.environ.get("GEMINI_API_KEY")
    hf_token = os.environ.get("HF_TOKEN")
    chutes_key = os.environ.get("CHUTES_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")
    
    if gemini_key:
        print("--- AI Service: Using GEMINI (Priority)")
        return ("gemini", gemini_key, "https://generativelanguage.googleapis.com/v1beta")
    elif hf_token:
        print("--- AI Service: Using HUGGINGFACE")
        return ("huggingface", hf_token, None)
    elif chutes_key:
        print("--- AI Service: Using CHUTES.AI")
        return ("chutes", chutes_key, CHUTES_API_BASE)
    elif openai_key:
        print("--- AI Service: Using OPENAI")
        return ("openai", openai_key, "https://api.openai.com/v1")
    else:
        print("--- AI Service: NO API KEYS FOUND - Using MOCK mode")
        return ("mock", None, None)

async def generate_synthesis(query: str, node_contents: List[dict], previous_summary: Optional[str] = None) -> str:
    """
    Generate an AI synthesis from multiple node contents.
    Uses Chutes.ai if available, falls back to OpenAI, then mock.
    """
    provider, api_key, base_url = await get_ai_client()
    print(f"Generating synthesis using provider: {provider} (Refining: {bool(previous_summary)})")
    
    if provider in ("chutes", "openai"):
        return await generate_llm_synthesis(query, node_contents, api_key, base_url, provider, previous_summary)
    else:
        return generate_mock_synthesis(query, node_contents)

async def generate_research_report(query: str, context: str) -> dict:
    """
    Generate a structured research report from context.
    Returns a dict with: title, abstract, introduction, sections[], conclusion, references[].
    """
    provider, api_key, base_url = await get_ai_client()
    print(f"Generating research report using provider: {provider}")
    
    if provider == "gemini":
        return await generate_gemini_report(query, context, api_key)
    elif provider in ("chutes", "openai"):
        return await generate_llm_report(query, context, api_key, base_url, provider)
    else:
        return generate_mock_report(query, context)


async def generate_document_ast(query: str, context: str, source_map: dict, edges: Optional[List[dict]] = None) -> dict:
    """
    Generate a structured JSON AST for document synthesis.
    
    Returns a dict following the DocumentAST schema with sections, blocks, and references.
    """
    provider, api_key, base_url = await get_ai_client()
    print(f"Generating document AST using provider: {provider}")
    
    # Build references from source_map
    references_json = json.dumps([
        {"id": ref_id, "title": data.get("title", "Source"), "url": data.get("url", "")}
        for ref_id, data in source_map.items()
    ], indent=2)
    
    if provider == "gemini":
        try:
            from google import genai
            from google.genai import types
            import asyncio
            from datetime import datetime
            
            client = genai.Client(api_key=api_key)
            
            # Build relationships context from edges
            rel_context = ""
            if edges:
                rel_parts = []
                for edge in edges:
                    source_title = source_map.get(edge.get('source'), {}).get('title', edge.get('source'))
                    target_title = source_map.get(edge.get('target'), {}).get('title', edge.get('target'))
                    label = edge.get('label', 'connected to')
                    rel_parts.append(f"- {source_title} -> {target_title} ({label})")
                rel_context = "\n".join(rel_parts)

            prompt = f'''You are an AI research synthesis engine responsible for generating a publication-ready structured document AST.

Your role is NOT summarization. Your role is SYNTHESIS.

────────────────────────────────────────
DOCUMENT INTENT
────────────────────────────────────────
Generate a cohesive research report using ONLY the provided contexts extracted from connected knowledge graph nodes.
The final document must read as a single, logically connected paper — not as independent summaries.

TOPIC: {query}

────────────────────────────────────────
GRAPH-AWARE CONTEXT RULES
────────────────────────────────────────
RELATIONSHIPS:
{rel_context or "No explicit edges provided; synthesize based on thematic resonance."}

CONTEXT:
{context[:20000]}

IMPORTANT:
• Parent nodes define high-level context. 
• Child nodes must be analyzed in relation to their parent.
• Multi-layered connections should reflect structural intentionality.

────────────────────────────────────────
CONTENT SELECTION RULES
────────────────────────────────────────
1. Include ONLY selected topics and selected subtopics found in the context.
2. If data is insufficient, insert a warning block.

────────────────────────────────────────
REPETITION CONTROL
────────────────────────────────────────
Deduplicate semantic context across sources. If two sections overlap, mention it once and cross-reference conceptually.

────────────────────────────────────────
AVAILABLE REFERENCES
────────────────────────────────────────
{references_json}

Every factual paragraph must include citation IDs inline, e.g. [1], [2]. Do NOT fabricate references.

────────────────────────────────────────
OUTPUT FORMAT (STRICT JSON ONLY)
────────────────────────────────────────
{{
  "document": {{
    "title": "string",
    "subtitle": "string or null",
    "authors": ["AI Research Synthesis Engine"],
    "date": "{datetime.now().strftime('%B %d, %Y')}",
    "abstract": "150-word synthesized abstract connecting all major sections",
    "sections": [
      {{
        "id": "sec-1",
        "title": "Section Title",
        "level": 1,
        "content": [
          {{
            "type": "paragraph",
            "data": {{
              "text": "Text with inline citations [1].",
              "citations": ["1"]
            }}
          }}
        ],
        "subsections": []
      }}
    ],
    "references": {references_json}
  }}
}}

ALLOWED BLOCK TYPES: paragraph, list, table, quote, warning.

SCHEMA for 'warning' block:
{{
  "type": "warning",
  "data": {{ "text": "Insufficient data available..." }}
}}

STRICT RULES:
1. Return ONLY valid JSON.
2. No markdown, No explanation text, No assistant commentary.
3. Prioritize accuracy over completeness.
'''

            # Log the final prompt for debugging (handle Windows encoding)
            try:
                print("\n" + "="*80)
                print("[generate_document_ast] FINAL PROMPT:")
                print("="*80)
                # Encode to ASCII with replacement for console compatibility
                safe_prompt = prompt.encode('ascii', errors='replace').decode('ascii')
                print(safe_prompt[:2000] + "..." if len(safe_prompt) > 2000 else safe_prompt)
                print("="*80 + "\n")
            except Exception:
                print("[generate_document_ast] Prompt logged (encoding issues skipped)")


            def call():
                return client.models.generate_content(
                    model="gemini-2.5-flash-preview-09-2025",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.1,
                        max_output_tokens=8000,
                        response_mime_type="application/json"
                    )
                )
            
            response = await asyncio.to_thread(call)
            if response and response.text:
                data = json.loads(response.text.strip())
                # Fix: Unwrap 'document' if LLM followed the nested schema prompt
                if isinstance(data, dict) and "document" in data and "title" not in data:
                    return data["document"]
                return data
        except Exception as e:
            print(f"Error generating Gemini document AST: {e}")
            return _generate_mock_ast(query, source_map)
    elif provider in ("chutes", "openai"):
        return await generate_llm_document_ast(query, context, source_map, api_key, base_url, provider, edges)
    else:
        # Mock AST for other providers
        return _generate_mock_ast(query, source_map)
    
    
async def generate_llm_document_ast(
    query: str, 
    context: str, 
    source_map: dict,
    api_key: str, 
    base_url: str,
    provider: str,
    edges: Optional[List[dict]] = None
) -> dict:
    """Generate structured JSON AST using generic LLM."""
    try:
        import httpx
        from datetime import datetime
        
        references_json = json.dumps([
            {"id": ref_id, "title": data.get("title", "Source"), "url": data.get("url", "")}
            for ref_id, data in source_map.items()
        ], indent=2)
        
        # Build relationships context from edges
        rel_context = ""
        if edges:
            rel_parts = []
            for edge in edges:
                source_title = source_map.get(edge.get('source'), {}).get('title', edge.get('source'))
                target_title = source_map.get(edge.get('target'), {}).get('title', edge.get('target'))
                label = edge.get('label', 'connected to')
                rel_parts.append(f"- {source_title} -> {target_title} ({label})")
            rel_context = "\n".join(rel_parts)

        prompt = f'''You are an AI research synthesis engine responsible for generating a publication-ready structured document AST.

Your role is NOT summarization. Your role is SYNTHESIS.

────────────────────────────────────────
DOCUMENT INTENT
────────────────────────────────────────
Generate a cohesive research report using ONLY the provided contexts extracted from connected knowledge graph nodes.
The final document must read as a single, logically connected paper — not as independent summaries.

TOPIC: {query}

────────────────────────────────────────
GRAPH-AWARE CONTEXT RULES
────────────────────────────────────────
RELATIONSHIPS:
{rel_context or "No explicit edges provided; synthesize based on thematic resonance."}

CONTEXT:
{context[:15000]}

IMPORTANT:
• Parent nodes define high-level context. 
• Child nodes must be analyzed in relation to their parent.
• Multi-layered connections should reflect structural intentionality.

────────────────────────────────────────
CONTENT SELECTION RULES
────────────────────────────────────────
1. Include ONLY selected topics and selected subtopics found in the context.
2. If data is insufficient, insert a warning block.

────────────────────────────────────────
REPETITION CONTROL
────────────────────────────────────────
Deduplicate semantic context across sources. If two sections overlap, mention it once and cross-reference conceptually.

────────────────────────────────────────
AVAILABLE REFERENCES
────────────────────────────────────────
{references_json}

Every factual paragraph must include citation IDs inline, e.g. [1], [2]. Do NOT fabricate references.

────────────────────────────────────────
OUTPUT FORMAT (STRICT JSON ONLY)
────────────────────────────────────────
{{
  "document": {{
    "title": "string",
    "subtitle": "string or null",
    "authors": ["AI Research Synthesis Engine"],
    "date": "{datetime.now().strftime('%B %d, %Y')}",
    "abstract": "150-word synthesized abstract connecting all major sections",
    "sections": [
      {{
        "id": "sec-1",
        "title": "Section Title",
        "level": 1,
        "content": [
          {{
            "type": "paragraph",
            "data": {{
              "text": "Text with inline citations [1].",
              "citations": ["1"]
            }}
          }}
        ],
        "subsections": []
      }}
    ],
    "references": {references_json}
  }}
}}

ALLOWED BLOCK TYPES: paragraph, list, table, quote, warning.

STRICT RULES:
1. Return ONLY valid JSON.
2. No markdown, No explanation text, No assistant commentary.
3. Prioritize accuracy over completeness.
'''

        # Log the final prompt for debugging
        print("\n" + "="*80)
        print(f"[generate_llm_document_ast] FINAL PROMPT (query: {query}):")
        print("="*80)
        print(prompt)
        print("="*80 + "\n")

        model = "deepseek-ai/DeepSeek-V3-0324" if provider == "chutes" else "gpt-4o"

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "You are a research storage engine. Output valid JSON AST only."},
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 4000,
                    "temperature": 0.3
                },
                timeout=120.0
            )
            
            if response.status_code == 200:
                data = response.json()
                content = data["choices"][0]["message"]["content"].strip()
                
                # Strip markdown code blocks
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.strip().startswith("json"):
                        # Correcting potential double split or prefix
                        content = content.strip()[4:] if content.strip().lower().startswith("json") else content
                elif "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0].strip()
                
                # Basic JSON cleanup
                try:
                    ast_data = json.loads(content)
                    # If it returned {"document": {...}}, return just the inner part if expected
                    # The get_research_ast expects the direct AST or something it can parse
                    if "document" in ast_data:
                        return ast_data["document"]
                    return ast_data
                except json.JSONDecodeError:
                    print(f"Error decoding JSON: {content[:200]}...")
                    return _generate_mock_ast(query, source_map)
            else:
                print(f"AST generation error: {response.status_code} - {response.text}")
                return _generate_mock_ast(query, source_map)
                
    except Exception as e:
        print(f"Error generating LLM document AST: {e}")
        return _generate_mock_ast(query, source_map)


def _generate_mock_ast(query: str, source_map: dict) -> dict:
    """Generate a mock AST for testing."""
    from datetime import datetime
    
    refs = [
        {"id": ref_id, "title": data.get("title", "Source"), "url": data.get("url", "")}
        for ref_id, data in source_map.items()
    ]
    
    return {
        "title": f"Research Report: {query}",
        "subtitle": None,
        "authors": ["AI Research Synthesis Engine"],
        "date": datetime.now().strftime("%B %d, %Y"),
        "abstract": f"This document synthesizes research on {query} from multiple sources.",
        "sections": [
            {
                "id": "sec-intro",
                "title": "Introduction",
                "level": 1,
                "content": [
                    {
                        "type": "paragraph",
                        "data": {
                            "text": f"This report examines {query} based on curated source materials.",
                            "citations": list(source_map.keys())[:2] if source_map else []
                        }
                    }
                ],
                "subsections": []
            },
            {
                "id": "sec-conclusion",
                "title": "Conclusion",
                "level": 1,
                "content": [
                    {
                        "type": "paragraph",
                        "data": {
                            "text": "Further research is recommended to expand on these findings.",
                            "citations": []
                        }
                    }
                ],
                "subsections": []
            }
        ],
        "references": refs
    }


# ============================================================
# MULTI-PASS SYNTHESIS PIPELINE
# ============================================================

async def summarize_topic_chunk(chunk_content: str, chunk_heading: str, source_ref: str) -> dict:
    """
    Pass 1: Summarize a single topic chunk.
    
    Returns: {summary: str, citations: [str], data_available: bool}
    """
    provider, api_key, base_url = await get_ai_client()
    
    if provider == "gemini":
        try:
            from google import genai
            from google.genai import types
            import asyncio
            
            client = genai.Client(api_key=api_key)
            
            prompt = f"""Summarize this topic chunk for a research report.

Topic: {chunk_heading}
Source Reference: {source_ref}

Content:
{chunk_content[:3000]}

Requirements:
1. Return ONLY valid JSON.
2. Summarize key facts and insights.
3. Mark citations with {source_ref} inline.
4. If data is missing, set data_available to false.

Output format:
{{
    "summary": "Clear factual summary with inline citations like {source_ref}",
    "citations": ["{source_ref}"],
    "data_available": true
}}

IMPORTANT: Do NOT infer or fabricate information. If data is not present, say "Data not available".
"""

            # Log the final prompt for debugging
            print("\n" + "="*80)
            print(f"[summarize_topic_chunk] FINAL PROMPT (topic: {chunk_heading}):")
            print("="*80)
            print(prompt)
            print("="*80 + "\n")

            def call():
                return client.models.generate_content(
                    model="gemini-2.5-flash-preview-09-2025",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.1,
                        max_output_tokens=1000,
                        response_mime_type="application/json"
                    )
                )
            
            response = await asyncio.to_thread(call)
            if response and response.text:
                return json.loads(response.text.strip())
        except Exception as e:
            print(f"Pass 1 error (Gemini): {e}")
    elif provider in ("chutes", "openai"):
        return await generate_llm_summarize_topic_chunk(chunk_content, chunk_heading, source_ref, api_key, base_url, provider)
    
    return {"summary": chunk_content[:500], "citations": [source_ref], "data_available": True}


async def merge_topic_sections(topic_heading: str, summaries: List[dict]) -> dict:
    """
    Pass 2: Merge multiple summaries of the same topic across nodes.
    
    Returns: {heading: str, body: str, figures: [], citations: []}
    """
    provider, api_key, base_url = await get_ai_client()
    
    # Combine summaries
    combined = "\n\n".join([
        f"Summary {i+1}: {s.get('summary', '')}" 
        for i, s in enumerate(summaries)
    ])
    all_citations = []
    for s in summaries:
        all_citations.extend(s.get("citations", []))
    
    if provider == "gemini":
        try:
            from google import genai
            from google.genai import types
            import asyncio
            
            client = genai.Client(api_key=api_key)
            
            prompt = f"""Merge these summaries into a unified section for a research report.

Topic: {topic_heading}

Summaries from different sources:
{combined}

Requirements:
1. Return ONLY valid JSON.
2. Synthesize insights across sources.
3. Preserve all citation markers.
4. Add figures ONLY if numerical data is present.

Output format:
{{
    "heading": "{topic_heading}",
    "body": "Merged analysis with preserved citations.",
    "figures": [],
    "citations": {json.dumps(list(set(all_citations)))}
}}

IMPORTANT: Do NOT fabricate data. Use "Data not available" if information is missing.
"""

            # Log the final prompt for debugging
            print("\n" + "="*80)
            print(f"[merge_topic_sections] FINAL PROMPT (topic: {topic_heading}):")
            print("="*80)
            print(prompt)
            print("="*80 + "\n")

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
                return json.loads(response.text.strip())
        except Exception as e:
            print(f"Pass 2 error (Gemini): {e}")
    elif provider in ("chutes", "openai"):
        return await generate_llm_merge_topic_sections(topic_heading, summaries, api_key, base_url, provider)
    
    return {
        "heading": topic_heading,
        "body": combined,
        "figures": [],
        "citations": list(set(all_citations))
    }


async def assemble_research_document(query: str, sections: List[dict], source_map: dict) -> dict:
    """
    Pass 3: Assemble final research document from merged sections.
    
    Returns full report structure for PDF generation.
    """
    provider, api_key, base_url = await get_ai_client()
    
    # Build sections context
    sections_text = "\n\n".join([
        f"## {s.get('heading', 'Section')}\n{s.get('body', '')}"
        for s in sections
    ])
    
    # Build references
    references = []
    for ref_num, ref_data in source_map.items():
        references.append(f"[{ref_num}] {ref_data.get('title', 'Source')} - {ref_data.get('url', '')}")
    
    if provider == "gemini":
        try:
            from google import genai
            from google.genai import types
            import asyncio
            
            client = genai.Client(api_key=api_key)
            
            prompt = f"""Assemble a final research document from these sections.

Query: {query}

Sections:
{sections_text}

References:
{json.dumps(references)}

Requirements:
1. Return ONLY valid JSON.
2. Write compelling title, abstract, and introduction.
3. Pass through sections as-is (they are already processed).
4. Write a synthesis conclusion.
5. Include all references.

Output format:
{{
    "title": "Academic Title",
    "abstract": "150-word summary",
    "introduction": "Context and scope",
    "sections": {json.dumps([{"heading": s.get("heading", ""), "body": s.get("body", ""), "figures": s.get("figures", [])} for s in sections])},
    "conclusion": "Final synthesis",
    "references": {json.dumps(references)}
}}

IMPORTANT: Preserve all citations. Do NOT add new claims.
"""

            # Log the final prompt for debugging
            print("\n" + "="*80)
            print(f"[assemble_research_document] FINAL PROMPT (query: {query}):")
            print("="*80)
            print(prompt)
            print("="*80 + "\n")

            def call():
                return client.models.generate_content(
                    model="gemini-2.5-flash-preview-09-2025",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.2,
                        max_output_tokens=4000,
                        response_mime_type="application/json"
                    )
                )
            
            response = await asyncio.to_thread(call)
            if response and response.text:
                return json.loads(response.text.strip())
        except Exception as e:
            print(f"Pass 3 error (Gemini): {e}")
    elif provider in ("chutes", "openai"):
        return await generate_llm_assemble_research_document(query, sections, source_map, api_key, base_url, provider)
    
    return {
        "title": f"Research Report: {query}",
        "abstract": "This report synthesizes information from multiple sources.",
        "introduction": f"This document examines {query} based on curated sources.",
        "sections": sections,
        "conclusion": "This report synthesizes the available information on the topic.",
        "references": references
    }

async def generate_gemini_report(query: str, context: str, api_key: str) -> dict:
    """Generate structured research report using Gemini SDK."""
    try:
        from google import genai
        from google.genai import types
        import asyncio
        import json
        
        client = genai.Client(api_key=api_key)
        model_id = "gemini-2.5-flash-preview-09-2025" 

        prompt = f"""You are an advanced academic research assistant. 
Based on the provided context, write a comprehensive, professional research report on: "{query}"

Context:
{context[:25000]}

Requirements:
1.  **Format**: Return ONLY valid JSON.
2.  **Voice**: Academic, objective, authoritative.
3.  **Citations**: Cite sources using [1], [2] format inline.
4.  **Visuals**: ONLY include figures if the source data explicitly supports them. Do NOT fabricate statistics.
5.  **Structure**:
    {{
        "title": "Compelling Academic Title",
        "abstract": "Executive summary of findings (100-150 words)",
        "introduction": "Context, significance, and scope (200-300 words)",
        "sections": [
            {{
                "heading": "Section Title",
                "body": "Detailed analysis with citations [1]. Reference figures like (See Figure 1).",
                "figures": [
                    {{
                        "type": "bar | line | pie | table",
                        "caption": "Figure X: Description",
                        "source_ref": "[1]",
                        "data": {{
                            "labels": ["Label1", "Label2"],
                            "values": [10, 20],
                            "title": "Chart Title",
                            "x_label": "X Axis",
                            "y_label": "Y Axis"
                        }}
                    }}
                ]
            }}
        ],
        "conclusion": "Final synthesis and implications (150-200 words)",
        "references": [
            "1. Source Title - URL",
            "2. Source Title - URL"
        ]
    }}

IMPORTANT: Only include figures if the context contains explicit numerical data or statistics. If no data is available, set figures to an empty array [].

Do not include any conversational text outside the JSON.
"""

        # Log the final prompt for debugging
        print("\n" + "="*80)
        print(f"[generate_gemini_report] FINAL PROMPT (query: {query}):")
        print("="*80)
        print(prompt)
        print("="*80 + "\n")

        def call_gemini():
            return client.models.generate_content(
                model=model_id,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    max_output_tokens=4000,
                    response_mime_type="application/json"
                )
            )

        print(f"--- Gemini: Generating research report on '{query}'")
        response = await asyncio.to_thread(call_gemini)
        
        if not response or not response.text:
            return generate_mock_report(query, context)

        text = response.text.strip()
        # Cleanup
        if text.startswith("```"):
            parts = text.split("```")
            text = parts[1] if len(parts) > 1 else text
            if text.startswith("json"):
                text = text[4:]
        
        return json.loads(text.strip())

    except Exception as e:
        print(f"Error generating Gemini report: {e}")
        return generate_mock_report(query, context)

async def generate_llm_report(
    query: str, 
    context: str, 
    api_key: str, 
    base_url: str,
    provider: str
) -> dict:
    """Generate structured research report using LLM."""
    try:
        import httpx
        import json
        
        prompt = f"""You are an advanced academic research assistant. 
Based on the provided context, write a comprehensive, professional research report on: "{query}"

Context:
{context[:15000]}

Requirements:
1.  **Format**: Return ONLY valid JSON.
2.  **Voice**: Academic, objective, authoritative.
3.  **Citations**: Cite sources using [1], [2] format inline.
4.  **Structure**:
    {{
        "title": "Compelling Academic Title",
        "abstract": "Executive summary of findings (100-150 words)",
        "introduction": "Context, significance, and scope (200-300 words)",
        "sections": [
            {{
                "heading": "Section Title",
                "body": "Detailed analysis with citations [1]."
            }}
        ],
        "conclusion": "Final synthesis and implications (150-200 words)",
        "references": [
            "1. Source Title - URL",
            "2. Source Title - URL"
        ]
    }}

Do not include any conversational text outside the JSON.
"""

        # Log the final prompt for debugging
        print("\n" + "="*80)
        print(f"[generate_llm_report] FINAL PROMPT (query: {query}):")
        print("="*80)
        print(prompt)
        print("="*80 + "\n")

        model = "deepseek-ai/DeepSeek-V3-0324" if provider == "chutes" else "gpt-4o"

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "You are a research storage engine. Output valid JSON only."},
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 4000,
                    "temperature": 0.3
                },
                timeout=120.0
            )
            
            if response.status_code == 200:
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                
                # Strip markdown code blocks
                if content.strip().startswith("```"):
                    content = content.split("```")[1]
                    if content.strip().startswith("json"):
                        content = content.replace("json", "", 1)
                
                return json.loads(content.strip())
            else:
                print(f"Report generation error: {response.status_code} - {response.text}")
                return generate_mock_report(query, context)
                
    except Exception as e:
        print(f"Error generating report: {e}")
        return generate_mock_report(query, context)

async def generate_llm_synthesis(
    query: str, 
    node_contents: List[dict], 
    api_key: str, 
    base_url: str,
    provider: str,
    previous_summary: Optional[str] = None
) -> str:
    """Generate synthesis using LLM API (Chutes.ai or OpenAI compatible)."""
    try:
        import httpx
        
        # Build context from nodes
        context_parts = []
        for i, node in enumerate(node_contents[:5]):  # Limit to 5 sources
            title = node.get("title", "Untitled")
            content = node.get("content", "")[:1500]  # Limit content per source
            context_parts.append(f"Source {i+1} - {title}:\n{content}\n")
        
        context = "\n---\n".join(context_parts)
        
        if previous_summary:
            prompt = f"""You previously synthesized these sources as follows:
            
"{previous_summary}"

The user now has a follow-up query/instruction: "{query}"

Please refine or expand the synthesis based on this new instruction, while maintaining factual consistency with the sources.

SOURCES:
{context}

Updated Synthesis:"""
        else:
            prompt = f"""Based on the following sources, provide a comprehensive synthesis answering this query: "{query}"

{context}

Provide a clear, well-structured synthesis that:
1. Addresses the query directly
2. Cites specific sources when relevant (e.g., "According to Source 1...")
3. Identifies key patterns or consensus across sources
4. Notes any conflicting information

Synthesis:"""

        # Log the final prompt for debugging
        print("\n" + "="*80)
        print(f"[generate_llm_synthesis] FINAL PROMPT (query: {query}):")
        print("="*80)
        print(prompt)
        print("="*80 + "\n")

        # Determine model based on provider
        model = "deepseek-ai/DeepSeek-V3-0324" if provider == "chutes" else "gpt-3.5-turbo"

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "You are a research synthesis assistant that helps users understand and connect information from multiple sources."},
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 1000,
                    "temperature": 0.7
                },
                timeout=60.0
            )
            
            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"]
            else:
                print(f"{provider} API error: {response.status_code} - {response.text}")
                return generate_mock_synthesis(query, node_contents)
    except Exception as e:
        print(f"Error generating {provider} synthesis: {e}")
        return generate_mock_synthesis(query, node_contents)

def generate_mock_synthesis(query: str, node_contents: List[dict]) -> str:
    """Generate a structured mock synthesis when API is unavailable."""
    num_sources = len(node_contents)
    
    if num_sources == 0:
        return "No sources available for synthesis. Please select some nodes to analyze."
    
    titles = [node.get("title", "Untitled") for node in node_contents]
    
    synthesis = f"""## Synthesis: {query}

Based on analysis of {num_sources} source(s):

### Key Sources
{chr(10).join(f"- **{title}**" for title in titles[:5])}

### Analysis
This synthesis analyzes the selected sources regarding "{query}". 

To get AI-powered insights, set one of these environment variables:
- `CHUTES_API_KEY` - For Chutes.ai (recommended)
- `OPENAI_API_KEY` - For OpenAI

### Patterns Identified
- Multiple sources discuss related concepts
- Cross-referencing reveals connected themes

---
*Note: This is a mock synthesis. Set an API key for real AI analysis.*
"""
    return synthesis

def generate_mock_report(query: str, context: str) -> dict:
    """Generate a mock research report structure."""
    return {
        "title": f"Research Report: {query}",
        "abstract": "This is a mock abstract generated because no AI provider is configured. Please set CHUTES_API_KEY or OPENAI_API_KEY.",
        "introduction": "This introduction demonstrates the structure of the report. In a real scenario, this would contain synthesized context from your selected nodes.",
        "sections": [
            {
                "heading": "Analysis of Selected Topics",
                "body": f"The user selected content related to '{query}'. However, without an active LLM connection, we cannot synthesize the specific insights. Please configure the backend environment."
            },
            {
                "heading": "Key Findings",
                "body": "1. Mock finding one.\n2. Mock finding two.\n3. Mock finding three."
            }
        ],
        "conclusion": "This concludes the mock report. The system is ready to generate high-quality PDFs once the AI connection is established.",
        "references": [
            "1. Rabbit Hole OS - Local Documentation",
            "2. User Selected Nodes - Context"
        ]
    }

async def generate_edge_label(source_content: str, target_content: str) -> str:
    """Generate a semantic label for an edge between two nodes."""
    provider, api_key, base_url = await get_ai_client()
    
    if provider in ("chutes", "openai"):
        try:
            import httpx
            
            prompt = f"""Given two pieces of content, generate a short (2-4 words) label describing the relationship between them.

Content A: {source_content[:500]}

Content B: {target_content[:500]}

Relationship label (2-4 words):"""

            # Log the final prompt for debugging
            print("\n" + "="*80)
            print("[generate_edge_label] FINAL PROMPT:")
            print("="*80)
            print(prompt)
            print("="*80 + "\n")

            model = "deepseek-ai/DeepSeek-V3-0324" if provider == "chutes" else "gpt-3.5-turbo"

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 20,
                        "temperature": 0.5
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            print(f"Error generating edge label: {e}")
    
    return "relates to"

async def generate_llm_summarize_topic_chunk(chunk_content: str, chunk_heading: str, source_ref: str, api_key: str, base_url: str, provider: str) -> dict:
    """Pass 1 using generic LLM."""
    try:
        import httpx
        prompt = f"""Summarize this topic chunk for a research report.

Topic: {chunk_heading}
Source Reference: {source_ref}

Content:
{chunk_content[:3000]}

Requirements:
1. Return ONLY valid JSON.
2. Summarize key facts and insights.
3. Mark citations with {source_ref} inline.
4. If data is missing, set data_available to false.

Output format:
{{
    "summary": "Clear factual summary with inline citations like {source_ref}",
    "citations": ["{source_ref}"],
    "data_available": true
}}
"""
        # Log the final prompt for debugging
        print("\n" + "="*80)
        print(f"[generate_llm_summarize_topic_chunk] FINAL PROMPT:")
        print("="*80)
        print(prompt)
        print("="*80 + "\n")

        model = "deepseek-ai/DeepSeek-V3-0324" if provider == "chutes" else "gpt-4o"
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "Output valid JSON only."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.1
                },
                timeout=60.0
            )
            if response.status_code == 200:
                content = response.json()["choices"][0]["message"]["content"].strip()
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.strip().startswith("json"): content = content.replace("json", "", 1)
                return json.loads(content.strip())
    except Exception as e:
        print(f"Pass 1 error (LLM): {e}")
    return {"summary": chunk_content[:500], "citations": [source_ref], "data_available": True}

async def generate_llm_merge_topic_sections(topic_heading: str, summaries: List[dict], api_key: str, base_url: str, provider: str) -> dict:
    """Pass 2 using generic LLM."""
    try:
        import httpx
        combined = "\n\n".join([f"Summary {i+1}: {s.get('summary', '')}" for i, s in enumerate(summaries)])
        all_citations = []
        for s in summaries: all_citations.extend(s.get("citations", []))
        
        prompt = f"""Merge these summaries into a unified section for a research report.

Topic: {topic_heading}
Summaries:
{combined}

Output format:
{{
    "heading": "{topic_heading}",
    "body": "Merged analysis with preserved citations.",
    "figures": [],
    "citations": {json.dumps(list(set(all_citations)))}
}}
"""
        # Log the final prompt for debugging
        print("\n" + "="*80)
        print(f"[generate_llm_merge_topic_sections] FINAL PROMPT:")
        print("="*80)
        print(prompt)
        print("="*80 + "\n")

        model = "deepseek-ai/DeepSeek-V3-0324" if provider == "chutes" else "gpt-4o"
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": model,
                    "messages": [{"role": "system", "content": "Output valid JSON only."}, {"role": "user", "content": prompt}],
                    "temperature": 0.2
                },
                timeout=60.0
            )
            if response.status_code == 200:
                content = response.json()["choices"][0]["message"]["content"].strip()
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.strip().startswith("json"): content = content.replace("json", "", 1)
                return json.loads(content.strip())
    except Exception as e:
        print(f"Pass 2 error (LLM): {e}")
    return {"heading": topic_heading, "body": combined, "figures": [], "citations": []}

async def generate_llm_assemble_research_document(query: str, sections: List[dict], source_map: dict, api_key: str, base_url: str, provider: str) -> dict:
    """Pass 3 using generic LLM."""
    try:
        import httpx
        sections_text = "\n\n".join([f"## {s.get('heading', 'Section')}\n{s.get('body', '')}" for s in sections])
        references = [f"[{k}] {v.get('title')} - {v.get('url')}" for k, v in source_map.items()]
        
        prompt = f"""Assemble a final research document from these sections.
Query: {query}
Sections:
{sections_text}

Output format:
{{
    "title": "Academic Title",
    "abstract": "Summary",
    "introduction": "Intro",
    "sections": {json.dumps(sections)},
    "conclusion": "Final",
    "references": {json.dumps(references)}
}}
"""
        # Log the final prompt for debugging
        print("\n" + "="*80)
        print(f"[generate_llm_assemble_research_document] FINAL PROMPT:")
        print("="*80)
        print(prompt)
        print("="*80 + "\n")

        model = "deepseek-ai/DeepSeek-V3-0324" if provider == "chutes" else "gpt-4o"
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": model,
                    "messages": [{"role": "system", "content": "Output valid JSON only."}, {"role": "user", "content": prompt}],
                    "temperature": 0.2
                },
                timeout=120.0
            )
            if response.status_code == 200:
                content = response.json()["choices"][0]["message"]["content"].strip()
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.strip().startswith("json"): content = content.replace("json", "", 1)
                return json.loads(content.strip())
    except Exception as e:
        print(f"Pass 3 error (LLM): {e}")
    return {"title": query, "abstract": "", "introduction": "", "sections": sections, "conclusion": "", "references": []}

async def generate_embedding(text: str) -> List[float]:
    """Generate embeddings - currently uses mock, would need embedding model for real."""
    # Chutes.ai primarily focuses on LLM, for embeddings we'd use a separate service
    # For now, return mock embedding
    import hashlib
    
    text_hash = hashlib.sha256(text.encode()).hexdigest()
    embedding = []
    for i in range(1536):
        idx = (i * 2) % len(text_hash)
        val = int(text_hash[idx:idx+2], 16) / 255.0
        embedding.append((val - 0.5) * 2)
    
    return embedding
