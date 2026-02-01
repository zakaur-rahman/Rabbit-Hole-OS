import json
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from pydantic import BaseModel
from datetime import datetime

from app.services.llm import get_ai_client
from app.services.document_ast import DocumentAST

# ============================================================
# BASE AGENT
# ============================================================

class AgentResponse(BaseModel):
    agent_name: str
    status: str
    data: Any
    reasoning: Optional[str] = None
    timestamp: str = datetime.now().isoformat()

class BaseAgent:
    def __init__(self, name: str, role: str):
        self.name = name
        self.role = role

    async def _call_llm(self, prompt: str, system_instruction: Optional[str] = None, temperature: float = 0.1) -> str:
        provider, api_key, base_url = await get_ai_client()
        
        if provider == "gemini":
            from google import genai
            from google.genai import types
            client = genai.Client(api_key=api_key)
            
            # --- AGENT LOGGING (Safe for Windows) ---
            try:
                print(f"\n[{self.name}] Thinking...")
                safe_prompt = prompt.encode('ascii', errors='replace').decode('ascii')
                print(f"[{self.name}] PROMPT:\n{safe_prompt[:500]}..." if len(safe_prompt) > 500 else safe_prompt)
            except:
                pass
            # ----------------------------------------

            config = types.GenerateContentConfig(
                temperature=temperature,
                max_output_tokens=8000,
                response_mime_type="application/json",
                system_instruction=system_instruction
            )
            
            def call():
                # Log system instruction if present
                if system_instruction:
                    try:
                        safe_sys = system_instruction.encode('ascii', errors='replace').decode('ascii')
                        print(f"[{self.name}] SYSTEM: {safe_sys[:200]}...")
                    except: pass

                return client.models.generate_content(
                    model="gemini-2.0-flash-preview-09-2025",
                    contents=prompt,
                    config=config
                )
            
            response = await asyncio.to_thread(call)
            text_resp = response.text.strip() if response and response.text else "{}"
            
            # --- RESPONSE LOGGING ---
            try:
                safe_resp = text_resp.encode('ascii', errors='replace').decode('ascii')
                print(f"[{self.name}] RESPONSE:\n{safe_resp[:500]}..." if len(safe_resp) > 500 else safe_resp)
                print(f"[{self.name}] DONE.\n")
            except: pass
            # ------------------------
            
            return text_resp
        
        elif provider in ("openai", "chutes"):
            import httpx
            model = "gpt-4o" if provider == "openai" else "deepseek-ai/DeepSeek-V3-0324"
            
            messages = []
            if system_instruction:
                messages.append({"role": "system", "content": system_instruction})
            messages.append({"role": "user", "content": prompt})

            
            # --- AGENT LOGGING (Safe for Windows) ---
            try:
                print(f"\n[{self.name}] Thinking (via {provider})...")
                safe_prompt = prompt.encode('ascii', errors='replace').decode('ascii')
                print(f"[{self.name}] PROMPT:\n{safe_prompt[:500]}..." if len(safe_prompt) > 500 else safe_prompt)
            except: pass
            # ----------------------------------------

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": temperature,
                        "response_format": {"type": "json_object"}
                    },
                    timeout=60.0
                )
                
                resp_content = "{}"
                if response.status_code == 200:
                    data = response.json()
                    resp_content = data["choices"][0]["message"]["content"]
                
                # --- RESPONSE LOGGING ---
                try:
                    safe_resp = resp_content.encode('ascii', errors='replace').decode('ascii')
                    print(f"[{self.name}] RESPONSE:\n{safe_resp[:500]}..." if len(safe_resp) > 500 else safe_resp)
                    print(f"[{self.name}] DONE.\n")
                except: pass
                # ------------------------

                return resp_content
        
        return "{}"

# ============================================================
# 1. PLANNER AGENT
# ============================================================

class PlannerAgent(BaseAgent):
    def __init__(self):
        super().__init__("Planner", "AI Research Architect")

    async def plan(self, query: str, context: str, relationships: str) -> AgentResponse:
        system = f"You are the {self.role}. Your task is to architect a synthesis plan for a research document."
        prompt = f'''
TOPIC: {query}

RELATIONSHIPS:
{relationships}

CONTEXT:
{context[:10000]}

TASK:
1. Analyze the context and graph relationships.
2. Define a logical section ordering.
3. Identify cross-node dependencies.
4. Prevent content duplication.

NO content generation. ONLY structure.

OUTPUT FORMAT (JSON):
{{
  "document_outline": [
    {{ "id": "sec-1", "title": "...", "objective": "...", "ref_ids": ["1", "2"] }}
  ],
  "section_dependencies": {{ "sec-2": ["sec-1"] }},
  "reasoning_plan": "Cohesive logic explaining the flow...",
  "constraints": ["Keep it technical", "Focus on specific sub-topics..."]
}}
'''
        raw_response = await self._call_llm(prompt, system_instruction=system)
        return AgentResponse(
            agent_name=self.name,
            status="success",
            data=json.loads(raw_response)
        )

# ============================================================
# 2. WRITER AGENT
# ============================================================

class WriterAgent(BaseAgent):
    def __init__(self):
        super().__init__("Writer", "Research Synthesis Writer")

    async def write(self, query: str, context: str, plan: Dict[str, Any], references_json: str) -> AgentResponse:
        system = f"You are the {self.role}. Your task is to generate a structured JSON AST for a research document."
        prompt = f'''
TOPIC: {query}

PLAN:
{json.dumps(plan, indent=2)}

CONTEXT:
{context[:20000]}

REFERENCES:
{references_json}

TASK:
- Generate a complete Document AST based on the plan.
- Use ONLY the provided context.
- Insert inline citations [1], [2] using ref_ids.
- STRICT JSON ONLY.

OUTPUT SCHEMA:
(Follow standard DocumentAST schema with 'document': {{ title, abstract, sections: [{{ id, title, content: [{{ type, data }}] }}], references }})
'''
        raw_response = await self._call_llm(prompt, system_instruction=system)
        
        data = json.loads(raw_response)
        # Fix: Unwrap 'document' if LLM followed the nested schema prompt
        if isinstance(data, dict) and "document" in data and "title" not in data:
            data = data["document"]
            
        return AgentResponse(
            agent_name=self.name,
            status="success",
            data=data
        )

# ============================================================
# 3. REVIEWER AGENT
# ============================================================

class ReviewerAgent(BaseAgent):
    def __init__(self):
        super().__init__("Reviewer", "Academic Validation Agent")

    async def review(self, ast: Dict[str, Any], context: str) -> AgentResponse:
        system = f"You are the {self.role}. Your task is to validate and improve a research AST."
        prompt = f'''
CURRENT AST:
{json.dumps(ast, indent=2)}

CONTEXT:
{context[:5000]}

TASK:
1. Detect hallucinations (facts not in context).
2. Detect missing citations.
3. Fix awkward headers or repetition.
4. If a claim is weak, insert a warning block into the section content.
5. Return the corrected AST.

OUTPUT: Corrected JSON AST.
'''
        raw_response = await self._call_llm(prompt, system_instruction=system)
        return AgentResponse(
            agent_name=self.name,
            status="success",
            data=json.loads(raw_response)
        )

# ============================================================
# 4. CHART & FIGURE AGENT
# ============================================================

class ChartFigureAgent(BaseAgent):
    def __init__(self):
        super().__init__("ChartAgent", "Visual Reasoning Agent")

    async def analyze(self, ast: Dict[str, Any]) -> AgentResponse:
        system = f"You are the {self.role}. Your task is to identify data visualization opportunities."
        prompt = f'''
DOCUMENT AST:
{json.dumps(ast, indent=2)}

TASK:
- Identify numeric, comparative, or temporal data.
- Recommend figures (bar, line, table, timeline).
- Provide the data in the required format for the renderer.

OUTPUT FORMAT:
{{
  "figures": [
    {{
      "type": "bar | line | table",
      "section_id": "sec-x",
      "reason": "Why this chart helps...",
      "data": {{ "title": "...", "labels": [...], "values": [...] }}
    }}
  ]
}}
'''
        raw_response = await self._call_llm(prompt, system_instruction=system)
        return AgentResponse(
            agent_name=self.name,
            status="success",
            data=json.loads(raw_response)
        )

# ============================================================
# 5. BIBLIOGRAPHY NORMALIZER
# ============================================================

class BibNormalizerAgent(BaseAgent):
    def __init__(self):
        super().__init__("BibNormalizer", "Citation & Reference Engine")

    async def normalize(self, ast: Dict[str, Any], references: List[Dict[str, Any]]) -> AgentResponse:
        # This agent can often be programmatic, but we'll use LLM for smart deduplication if titles are messy
        system = f"You are the {self.role}. Your task is to deduplicate and normalize references."
        prompt = f'''
REFS USED IN AST: {json.dumps(ast.get('references', []), indent=2)}
ALL REFS: {json.dumps(references, indent=2)}

TASK:
1. Map all source_urls to unique ref_ids.
2. Clean titles.
3. Ensure the AST citations use these normalized IDs.

OUTPUT:
{{
  "normalized_references": [...],
  "ast_updates": {{ "old_id": "new_id" }}
}}
'''
        raw_response = await self._call_llm(prompt, system_instruction=system)
        return AgentResponse(
            agent_name=self.name,
            status="success",
            data=json.loads(raw_response)
        )

# ============================================================
# 6. MEMORY AGENT
# ============================================================

class MemoryAgent(BaseAgent):
    def __init__(self):
        super().__init__("Memory", "Cross-Document Learning Engine")

    async def learn(self, query: str, ast: Dict[str, Any]) -> AgentResponse:
        system = f"You are the {self.role}. Your task is to extract high-level conceptual patterns."
        # Memory storage logic will be in orchestrator/service, agent just extracts
        prompt = f'''
TOPIC: {query}
AST: (Look at titles and abstract) {ast.get('document', {}).get('title')}

TASK:
- Extract main concepts and their relationships.
- DO NOT store raw text.
- Analyze structural preferences (e.g., "The user prefers beginning with architectural overviews").

OUTPUT:
{{
  "concepts": ["id": "...", "relation": "..."],
  "structural_patterns": [...]
}}
'''
        raw_response = await self._call_llm(prompt, system_instruction=system)
        return AgentResponse(
            agent_name=self.name,
            status="success",
            data=json.loads(raw_response)
        )

# ============================================================
# 7. RECOVERY AGENT
# ============================================================

class RecoveryAgent(BaseAgent):
    def __init__(self):
        super().__init__("Recovery", "Stability & Recovery Engine")

    async def diagnose(self, error: str, failed_agent: str, last_output: str) -> AgentResponse:
        system = f"You are the {self.role}. Your task is to fix pipeline failures."
        prompt = f'''
FAILED AGENT: {failed_agent}
ERROR: {error}
LAST OUTPUT: {last_output}

TASK:
- Analyze why it failed (JSON error, hallucination, etc.).
- Provide a recovery plan or a simplified instruction for the failed agent.

OUTPUT:
{{
  "retry_action": "retry | fallback | stop",
  "instruction_tweak": "Simplified prompt addition..."
}}
'''
        raw_response = await self._call_llm(prompt, system_instruction=system)
        return AgentResponse(
            agent_name=self.name,
            status="success",
            data=json.loads(raw_response)
        )
