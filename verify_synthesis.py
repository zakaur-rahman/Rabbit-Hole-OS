import asyncio
import os
import json
import sys

# Add the apps/backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'apps', 'backend'))

from app.services.llm import generate_document_ast
from app.services.chunk_service import Chunk

async def test_synthesis():
    query = "AI Agentic Workflows"
    
    # Mock data
    source_map = {
        "1": {"title": "Introduction to Agents", "url": "https://example.com/agents"},
        "2": {"title": "Advanced Planning Techniques", "url": "https://example.com/planning"}
    }
    
    context_str = """
[1] Source: Introduction to Agents (https://example.com/agents)
Topic: Overview
---
AI agents are autonomous systems that use LLMs as reasoning engines to perform complex tasks. 
They often follow iterative loops like plan-act-observe.

[2] Source: Advanced Planning Techniques (https://example.com/planning)
Topic: Reasoning
---
Advanced agents use techniques like Tree of Thoughts and ReAct to navigate complex decision spaces. 
This node depends on the basic definition of agents provided in the intro node.
"""

    # Mock edges (ref-id based after transformation)
    transformed_edges = [
        {"source": "1", "target": "2", "label": "provides-foundation-for"}
    ]

    print("Testing generate_document_ast with master prompt...")
    
    try:
        ast = await generate_document_ast(query, context_str, source_map, transformed_edges)
        print("\nSUCCESS: AST Generated!")
        print(json.dumps(ast, indent=2))
        
        # Verify specific fields in the prompt were likely respected
        if "document" in ast:
            doc = ast["document"]
            print(f"\nTitle: {doc.get('title')}")
            print(f"Abstract: {doc.get('abstract')[:100]}...")
            print(f"Sections Count: {len(doc.get('sections', []))}")
            
            for sec in doc.get('sections', []):
                print(f"- Section: {sec.get('title')}")
                for block in sec.get('content', []):
                    if block.get('type') == 'paragraph':
                        citations = block.get('data', {}).get('citations', [])
                        print(f"  - Paragraph with citations: {citations}")
        else:
            print("\nWARNING: AST structure might be direct or wrapped differently.")
            print(ast.keys())
            
    except Exception as e:
        print(f"\nERROR during synthesis: {e}")

if __name__ == "__main__":
    # Ensure mocked environment variables if needed
    if not os.environ.get("GEMINI_API_KEY") and not os.environ.get("OPENAI_API_KEY") and not os.environ.get("CHUTES_API_KEY"):
        print("NOTE: No LLM API keys found. This will use MOCK mode.")
    
    asyncio.run(test_synthesis())
