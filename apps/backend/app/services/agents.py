import json
import asyncio
import re
import html
import random
import logging
from typing import List, Dict, Any, Optional, Tuple, Union
from pydantic import BaseModel
from datetime import datetime
from json.decoder import JSONDecodeError

import httpx

from app.services.llm import get_ai_client
from app.services.document_ast import DocumentAST

logger = logging.getLogger(__name__)

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
    # Class-level HTTP client (shared across instances)
    _http_client: Optional[httpx.AsyncClient] = None
    _client_lock = asyncio.Lock()
    
    # Retry configuration
    MAX_RETRIES = 3
    RETRY_DELAYS = [1, 2, 4]  # Exponential backoff

    def __init__(self, name: str, role: str):
        self.name = name
        self.role = role
        self.logger = logging.getLogger(f"agent.{name.lower()}")

    @classmethod
    async def _get_http_client(cls) -> httpx.AsyncClient:
        """Get or create shared HTTP client."""
        if cls._http_client is None:
            async with cls._client_lock:
                if cls._http_client is None:
                    cls._http_client = httpx.AsyncClient(
                        timeout=httpx.Timeout(60.0),
                        limits=httpx.Limits(
                            max_keepalive_connections=10,
                            max_connections=20
                        )
                    )
        return cls._http_client

    @classmethod
    async def cleanup_http_client(cls):
        """Close shared HTTP client. Call on application shutdown."""
        if cls._http_client:
            await cls._http_client.aclose()
            cls._http_client = None

    def _clean_json_response(self, raw_text: str) -> str:
        """Clean LLM response to extract valid JSON."""
        # Remove markdown code blocks
        cleaned = re.sub(r'^```(?:json)?\s*\n', '', raw_text, flags=re.MULTILINE)
        cleaned = re.sub(r'\n```\s*$', '', cleaned, flags=re.MULTILINE)
        
        # Try to find JSON object boundaries
        brace_match = re.search(r'\{.*\}', cleaned, re.DOTALL)
        bracket_match = re.search(r'\[.*\]', cleaned, re.DOTALL)
        
        if brace_match:
            cleaned = brace_match.group(0)
        elif bracket_match:
            cleaned = bracket_match.group(0)
        
        return cleaned.strip()

    async def _parse_llm_json(
        self, 
        raw_response: str, 
        expected_keys: list = None
    ) -> Union[dict, list]:
        """Parse LLM response as JSON with error recovery."""
        cleaned = self._clean_json_response(raw_response)
        
        try:
            data = json.loads(cleaned)
            if expected_keys and isinstance(data, dict):
                missing = [k for k in expected_keys if k not in data]
                if missing:
                    self.logger.warning(f"[{self.name}] Response missing keys: {missing}")
            return data
        except JSONDecodeError as e:
            # Attempt 1: Fix common issues (e.g., mixed quotes)
            try:
                fixed = cleaned.replace("'", '"')
                return json.loads(fixed)
            except JSONDecodeError:
                pass
            
            # Attempt 2: Handle "Extra data" — LLM may have appended text after valid JSON
            if "Extra data" in str(e):
                try:
                    decoder = json.JSONDecoder()
                    data, _ = decoder.raw_decode(cleaned)
                    self.logger.warning(f"[{self.name}] Recovered JSON with trailing data")
                    return data
                except JSONDecodeError:
                    pass
            
            error_msg = f"Failed to parse LLM response as JSON: {str(e)}"
            self.logger.error(f"{error_msg}\nPreview: {raw_response[:200]}...")
            raise ValueError(error_msg)

    def _smart_truncate(self, text: str, max_chars: int) -> Tuple[str, bool]:
        """Intelligently truncate text while preserving sentence boundaries."""
        if len(text) <= max_chars:
            return text, False
        
        truncated = text[:max_chars]
        last_period = truncated.rfind('. ')
        if last_period > max_chars * 0.8:
            truncated = truncated[:last_period + 1]
        
        return truncated + "\n\n[... content truncated ...]", True

    def _validate_input(self, value: Optional[str], name: str, min_length: int = 1, max_length: int = 100000, allow_empty: bool = False) -> str:
        """Validate and sanitize text input."""
        if value is None:
            if allow_empty: return ""
            raise ValueError(f"{name} cannot be None")
        if not isinstance(value, str):
            raise ValueError(f"{name} must be a string")
            
        value = value.strip()
        if not allow_empty and len(value) < min_length:
            raise ValueError(f"{name} too short")
        if len(value) > max_length:
            raise ValueError(f"{name} too long")
            
        return html.unescape(value)

    def _log_llm_call(self, prompt: str, system_instruction: Optional[str] = None, direction: str = "request", response: str = ""):
        """Log LLM interaction with proper formatting."""
        if direction == "request":
            self.logger.info(f"[{self.name}] Calling LLM for task: {self.role}")
            if system_instruction:
                instr_preview = system_instruction[:100].replace('\n', ' ')
                self.logger.debug(f"[{self.name}] System: {instr_preview}...")
            prompt_preview = prompt[:200].replace('\n', ' ')
            self.logger.debug(f"[{self.name}] Prompt: {prompt_preview}...")
        else:
            resp_preview = response[:500].replace('\n', ' ')
            self.logger.info(f"[{self.name}] Received LLM response: {resp_preview}...")

    async def _call_llm_with_retry(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.1
    ) -> str:
        """Call LLM with automatic retry on transient failures."""
        last_error = None
        for attempt in range(self.MAX_RETRIES):
            try:
                response = await self._call_llm_impl(prompt, system_instruction, temperature)
                if response and response != "{}":
                    return response
                last_error = "Empty response"
            except httpx.HTTPStatusError as e:
                last_error = e
                if e.response.status_code in (429, 500, 502, 503, 504):
                    if attempt < self.MAX_RETRIES - 1:
                        delay = self.RETRY_DELAYS[attempt] + random.uniform(0, 0.5)
                        self.logger.warning(f"Retry {attempt+1} after {e.response.status_code} in {delay:.1f}s")
                        await asyncio.sleep(delay)
                        continue
                raise
            except (httpx.ConnectError, httpx.TimeoutException) as e:
                last_error = e
                if attempt < self.MAX_RETRIES - 1:
                    delay = self.RETRY_DELAYS[attempt]
                    await asyncio.sleep(delay)
                    continue
                raise
        raise RuntimeError(f"LLM call failed after {self.MAX_RETRIES} attempts: {last_error}")

    async def _call_llm_impl(self, prompt: str, system_instruction: Optional[str] = None, temperature: float = 0.1) -> str:
        """Implementation of LLM call."""
        provider, api_key, base_url = await get_ai_client()
        self._log_llm_call(prompt, system_instruction, direction="request")
        
        if provider == "gemini":
            from google import genai
            from google.genai import types
            client = genai.Client(api_key=api_key)
            
            config = types.GenerateContentConfig(
                temperature=temperature,
                max_output_tokens=8000,
                response_mime_type="application/json",
                system_instruction=system_instruction
            )
            
            def call():
                return client.models.generate_content(
                    model="gemini-2.5-flash-lite",
                    contents=prompt,
                    config=config
                )
            
            response = await asyncio.to_thread(call)
            
            # Diagnostics for empty responses
            if not response or not response.text:
                finish_reason = "UNKNOWN"
                safety_ratings = []
                
                if response and hasattr(response, 'candidates') and response.candidates:
                    cand = response.candidates[0]
                    finish_reason = getattr(cand, 'finish_reason', 'NONE')
                    if hasattr(cand, 'safety_ratings'):
                        safety_ratings = [f"{r.category}: {r.probability}" for r in cand.safety_ratings if r.blocked]
                
                self.logger.warning(f"[{self.name}] Gemini returned EMPTY. Reason: {finish_reason}, Safety: {safety_ratings}")
                text_resp = "{}"
            else:
                text_resp = response.text.strip()
                
            self._log_llm_call(prompt, direction="response", response=text_resp)
            return text_resp
        
        elif provider in ("openai", "chutes"):
            model = "gpt-4o" if provider == "openai" else "deepseek-ai/DeepSeek-V3-0324"
            messages = []
            if system_instruction:
                messages.append({"role": "system", "content": system_instruction})
            messages.append({"role": "user", "content": prompt})

            client = await self._get_http_client()
            response = await client.post(
                f"{base_url}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": temperature,
                    "response_format": {"type": "json_object"}
                }
            )
            response.raise_for_status()
            data = response.json()
            resp_content = data["choices"][0]["message"]["content"]
            self._log_llm_call(prompt, direction="response", response=resp_content)
            return resp_content
        
        else:
            self.logger.warning(f"[{self.name}] Unhandled LLM provider: {provider}")
        
        return "{}"

# ============================================================
# 1. PLANNER AGENT
# ============================================================

class PlannerAgent(BaseAgent):
    def __init__(self):
        super().__init__("Planner", "AI Research Architect")

    async def plan(self, query: str, context: str, relationships: str) -> AgentResponse:
        try:
            # Validate inputs
            query = self._validate_input(query, "query", min_length=3, max_length=1000)
            context_truncated, was_truncated = self._smart_truncate(context, 10000)
            relationships = self._validate_input(relationships, "relationships", allow_empty=True, max_length=50000)
            
            system = f"You are the {self.role}. Your task is to architect a synthesis plan for a research document. Respond ONLY with valid JSON."
            prompt = f'''
CRITICAL: Respond ONLY with valid JSON. No preamble, no markdown.

TOPIC: {query}
RELATIONSHIPS: {relationships}
CONTEXT: {context_truncated}
{f"NOTE: Context was truncated. Focus on available information." if was_truncated else ""}

TASK:
1. Analyze the context and graph relationships.
2. Define a logical section ordering (max 8 sections).
3. Identify cross-node dependencies.
4. Prevent content duplication.

OUTPUT FORMAT (JSON):
{{
  "document_outline": [
    {{ "id": "sec-1", "title": "...", "objective": "...", "ref_ids": ["1", "2"] }}
  ],
  "section_dependencies": {{ "sec-2": ["sec-1"] }},
  "reasoning_plan": "...",
  "constraints": ["Keep it technical", "Focus on specific sub-topics"]
}}
'''
            raw_response = await self._call_llm_with_retry(prompt, system_instruction=system, temperature=0.2)
            data = await self._parse_llm_json(raw_response, expected_keys=["document_outline", "section_dependencies"])
            
            return AgentResponse(
                agent_name=self.name,
                status="success",
                data=data
            )
        except Exception as e:
            self.logger.error(f"Planner failed: {e}", exc_info=True)
            return AgentResponse(
                agent_name=self.name,
                status="failed",
                data={},
                reasoning=str(e)
            )

# ============================================================
# 2. WRITER AGENT
# ============================================================

class WriterAgent(BaseAgent):
    def __init__(self):
        super().__init__("Writer", "Research Synthesis Writer")

    async def write(self, query: str, context: str, plan: Dict[str, Any], references_json: str) -> AgentResponse:
        try:
            # Validate inputs
            query = self._validate_input(query, "query", max_length=1000)
            context_truncated, was_truncated = self._smart_truncate(context, 20000)
            
            system = f"You are the {self.role}. Your task is to generate a structured JSON AST for a research document. Respond ONLY with valid JSON."
            prompt = f'''
TOPIC: {query}
PLAN: {json.dumps(plan)}
CONTEXT: {context_truncated}
{f"NOTE: Context was truncated." if was_truncated else ""}
REFERENCES: {references_json}

────────────────────────────────────────
NODE TYPE MARKERS — MANDATORY HANDLING
────────────────────────────────────────
The context may contain special markers from different node types.
You MUST apply the following rules when you encounter each marker:

[IMAGE] → Insert a "figure" block:
  {{ "type": "figure", "data": {{ "path": "<url>", "caption": "<title>", "source_refs": [] }} }}

[CODE:<lang>] → Insert a "code_block" block:
  {{ "type": "code_block", "data": {{ "language": "<lang>", "code": "<snippet>", "caption": "<title>", "source_refs": [] }} }}

[RESEARCHER_NOTE] → Insert a "quote" block:
  {{ "type": "quote", "data": {{ "text": "<note content>", "source_refs": [] }} }}

[ANNOTATION] → Insert as a "quote" block inline in the nearest section.

[ACADEMIC_PAPER] → Treat with highest citation priority. Include abstract in the relevant section as a paragraph. Add to references.

[PRODUCT] → Consider including in a "table" block with columns: Name, Brand, Price, Rating.

[SUB_CANVAS] → Use as a section heading. Treat child-node titles as topic keywords.

[GROUP] → Use as a section heading for thematic grouping.

Plain content (no marker) → Standard synthesis into "paragraph" blocks with citations.

TASK:
- Generate a complete Document AST based on the plan above.
- Use ONLY the provided context.
- Insert inline citations [1], [2] in paragraphs using ref IDs from REFERENCES.
- Apply NODE TYPE MARKER rules strictly.
- STRICT JSON ONLY. No markdown, no preamble.

OUTPUT SCHEMA (JSON):
{{
  "title": "string",
  "abstract": "string",
  "sections": [
    {{
      "id": "sec-1",
      "title": "string",
      "level": 1,
      "content": [
        {{ "type": "paragraph", "data": {{ "text": "...", "citations": ["1"] }} }},
        {{ "type": "figure", "data": {{ "path": "https://...", "caption": "Figure caption", "source_refs": [] }} }},
        {{ "type": "code_block", "data": {{ "language": "python", "code": "print('hello')", "caption": "Example", "source_refs": [] }} }},
        {{ "type": "quote", "data": {{ "text": "Researcher note text", "source_refs": [] }} }},
        {{ "type": "list", "data": {{ "ordered": false, "items": ["item 1", "item 2"] }} }},
        {{ "type": "table", "data": {{ "caption": "Comparison", "columns": ["Name", "Value"], "rows": [["A", "1"]] }} }}
      ],
      "subsections": []
    }}
  ],
  "references": [
    {{ "id": "1", "title": "Source Title", "url": "https://...", "authors": [], "year": "" }}
  ]
}}
'''
            raw_response = await self._call_llm_with_retry(prompt, system_instruction=system)
            data = await self._parse_llm_json(raw_response)
            
            if isinstance(data, dict) and "document" in data and "title" not in data:
                data = data["document"]
            
            if not isinstance(data, dict) or "title" not in data:
                raise ValueError("Incomplete AST returned")

            return AgentResponse(
                agent_name=self.name,
                status="success",
                data=data
            )
        except Exception as e:
            self.logger.error(f"Writer failed: {e}", exc_info=True)
            return AgentResponse(
                agent_name=self.name,
                status="failed",
                data={},
                reasoning=str(e)
            )

# ============================================================
# 3. REVIEWER AGENT
# ============================================================

class ReviewerAgent(BaseAgent):
    def __init__(self):
        super().__init__("Reviewer", "Academic Validation Agent")

    async def review(self, ast: Dict[str, Any], context: str) -> AgentResponse:
        try:
            context_truncated, _ = self._smart_truncate(context, 10000)
            system = f"You are the {self.role}. Your task is to validate and improve a research AST. Respond ONLY with valid JSON."
            prompt = f'''
CURRENT AST: {json.dumps(ast)}
CONTEXT: {context_truncated}

TASK:
1. Detect hallucinations (facts not in context).
2. Detect missing citations.
3. Fix headers or repetition.
4. Return the corrected AST as JSON.
'''
            raw_response = await self._call_llm_with_retry(prompt, system_instruction=system)
            data = await self._parse_llm_json(raw_response)
            
            return AgentResponse(
                agent_name=self.name,
                status="success",
                data=data
            )
        except Exception as e:
            self.logger.error(f"Reviewer failed: {e}")
            return AgentResponse(
                agent_name=self.name,
                status="failed",
                data=ast, # Return original on failure
                reasoning=str(e)
            )

# ============================================================
# 4. CHART & FIGURE AGENT
# ============================================================

class ChartFigureAgent(BaseAgent):
    def __init__(self):
        super().__init__("ChartAgent", "Visual Reasoning Agent")

    async def analyze(self, ast: Dict[str, Any]) -> AgentResponse:
        try:
            system = f"You are the {self.role}. Your task is to identify data visualization opportunities. Respond ONLY with valid JSON."
            prompt = f'''
DOCUMENT AST: {json.dumps(ast)}
TASK:
- Identify numeric, comparative, or temporal data.
- Recommend figures (bar, line, table).
- Provide JSON output.
'''
            raw_response = await self._call_llm_with_retry(prompt, system_instruction=system)
            data = await self._parse_llm_json(raw_response, expected_keys=["figures"])
            
            return AgentResponse(
                agent_name=self.name,
                status="success",
                data=data
            )
        except Exception as e:
            self.logger.error(f"Chart analysis failed: {e}")
            return AgentResponse(
                agent_name=self.name,
                status="failed",
                data={"figures": []},
                reasoning=str(e)
            )

# ============================================================
# 5. BIBLIOGRAPHY NORMALIZER
# ============================================================

class BibNormalizerAgent(BaseAgent):
    def __init__(self):
        super().__init__("BibNormalizer", "Citation & Reference Engine")

    async def normalize(self, ast: Dict[str, Any], references: List[Dict[str, Any]]) -> AgentResponse:
        try:
            system = f"You are the {self.role}. Your task is to deduplicate and normalize references. Respond ONLY with valid JSON."
            prompt = f'''
REFS USED IN AST: {json.dumps(ast.get('references', []))}
ALL REFS: {json.dumps(references)}

TASK:
1. Map all source_urls to unique ref_ids.
2. Clean titles.
3. Return a JSON OBJECT (not array) in this exact format:

{{{{
  "normalized_references": [
    {{"ref_id": "R1", "url": "...", "title": "..."}}
  ]
}}}}
'''
            raw_response = await self._call_llm_with_retry(prompt, system_instruction=system)
            data = await self._parse_llm_json(raw_response, expected_keys=["normalized_references"])
            
            # If LLM returned a raw array, wrap it
            if isinstance(data, list):
                data = {"normalized_references": data}
            
            return AgentResponse(
                agent_name=self.name,
                status="success",
                data=data
            )
        except Exception as e:
            self.logger.error(f"Bib normalization failed: {e}")
            return AgentResponse(
                agent_name=self.name,
                status="failed",
                data={"normalized_references": references},
                reasoning=str(e)
            )

# ============================================================
# 6. MEMORY AGENT
# ============================================================

class MemoryAgent(BaseAgent):
    def __init__(self):
        super().__init__("Memory", "Cross-Document Learning Engine")

    async def learn(self, query: str, ast: Dict[str, Any]) -> AgentResponse:
        try:
            system = f"You are the {self.role}. Extract conceptual patterns. Respond ONLY with valid JSON."
            prompt = f'''
TOPIC: {query}
TITLE: {ast.get('document', {}).get('title')}

TASK:
- Extract main concepts and relationships.
- Analyze structural preferences.
- Output JSON.
'''
            raw_response = await self._call_llm_with_retry(prompt, system_instruction=system)
            data = await self._parse_llm_json(raw_response)
            
            return AgentResponse(
                agent_name=self.name,
                status="success",
                data=data
            )
        except Exception as e:
            self.logger.error(f"Memory learning failed: {e}")
            return AgentResponse(
                agent_name=self.name,
                status="failed",
                data={},
                reasoning=str(e)
            )

# ============================================================
# 7. RECOVERY AGENT
# ============================================================

class RecoveryAgent(BaseAgent):
    def __init__(self):
        super().__init__("Recovery", "Stability & Recovery Engine")

    async def diagnose(self, error: str, failed_agent: str, last_output: str) -> AgentResponse:
        try:
            system = f"You are the {self.role}. Your task is to fix pipeline failures. Respond ONLY with valid JSON."
            prompt = f'''
FAILED AGENT: {failed_agent}
ERROR: {error}
LAST OUTPUT: {last_output}

TASK:
- Analyze why it failed.
- Provide a recovery plan.
'''
            raw_response = await self._call_llm_with_retry(prompt, system_instruction=system)
            data = await self._parse_llm_json(raw_response, expected_keys=["retry_action"])
            
            return AgentResponse(
                agent_name=self.name,
                status="success",
                data=data
            )
        except Exception as e:
            self.logger.error(f"Recovery agent failed: {e}")
            return AgentResponse(
                agent_name=self.name,
                status="failed",
                data={"retry_action": "stop"},
                reasoning=str(e)
            )
