import asyncio
import os
import json
import sys
from unittest.mock import AsyncMock, patch

# Add the apps/backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'apps', 'backend'))

from app.services.llm import generate_document_ast

async def test_prompt_construction():
    query = "AI Agentic Workflows"
    
    # Mock data
    source_map = {
        "1": {"title": "Introduction to Agents", "url": "https://example.com/agents"},
        "2": {"title": "Advanced Planning Techniques", "url": "https://example.com/planning"}
    }
    
    context_str = "Some context about agents."
    
    # Mock edges (ref-id based)
    transformed_edges = [
        {"source": "1", "target": "2", "label": "provides-foundation-for"}
    ]

    print("--- Verifying Prompt Construction ---")
    
    # Force provider to 'openai' to trigger prompt building
    with patch('app.services.llm.get_ai_client', AsyncMock(return_value=("openai", "test-key", "https://api.openai.com/v1"))):
        # Mock httpx.AsyncClient.post to avoid actual network call
        with patch('httpx.AsyncClient.post', new_callable=AsyncMock) as mock_post:
            # Set up mock response that looks like valid AST JSON
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "choices": [{
                    "message": {
                        "content": json.dumps({
                            "document": {
                                "title": "Synthesized Report",
                                "sections": []
                            }
                        })
                    }
                }]
            }
            mock_post.return_value = mock_response
            
            # This should print the prompt if I kept the print(prompt) in llm.py
            ast = await generate_document_ast(query, context_str, source_map, transformed_edges)
            
            print("\n--- Prompt Construction Result ---")
            # We check if httpx was called, and what the prompt was
            if mock_post.called:
                call_args = mock_post.call_args
                prompt_sent = call_args.kwargs['json']['messages'][1]['content']
                print("Prompt contains GRAPH-AWARE CONTEXT RULES:", "GRAPH-AWARE CONTEXT RULES" in prompt_sent)
                print("Prompt contains RELATIONSHIPS block:", "RELATIONSHIPS:" in prompt_sent)
                print("Prompt contains the labels:", "provides-foundation-for" in prompt_sent)
                print("Prompt contains the sequential IDs:", "- Introduction to Agents -> Advanced Planning Techniques" in prompt_sent)
                
                print("\nFULL PROMPT SAMPLE (Relationships section):")
                rel_start = prompt_sent.find("RELATIONSHIPS:")
                rel_end = prompt_sent.find("CONTEXT:", rel_start)
                print(prompt_sent[rel_start:rel_end])
            else:
                print("FAILED: httpx.post was not called.")

if __name__ == "__main__":
    asyncio.run(test_prompt_construction())
