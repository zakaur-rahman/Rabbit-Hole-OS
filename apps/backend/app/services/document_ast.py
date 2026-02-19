"""
Document AST Schema — Structured JSON for LaTeX Generation

Pydantic models defining the strict JSON AST schema that the LLM must produce.
These are then deterministically converted to LaTeX.
"""
from typing import List, Optional, Union, Literal
from pydantic import BaseModel, Field, validator


# ============================================================
# BLOCK DATA MODELS
# ============================================================

class ParagraphData(BaseModel):
    """Data for a paragraph block."""
    text: str
    citations: List[str] = Field(default_factory=list, description="Reference IDs cited in this paragraph")


class ListData(BaseModel):
    """Data for a list block."""
    ordered: bool = False
    items: List[str]


class TableData(BaseModel):
    """Data for a table block."""
    caption: str
    columns: List[str]
    rows: List[List[str]]
    source_refs: List[str] = Field(default_factory=list)
    
    @validator('rows')
    def validate_row_length(cls, v, values):
        if 'columns' in values:
            col_count = len(values['columns'])
            for i, row in enumerate(v):
                if len(row) != col_count:
                    # Auto-pad or truncate
                    if len(row) < col_count:
                        v[i] = row + [''] * (col_count - len(row))
                    else:
                        v[i] = row[:col_count]
        return v


class FigureData(BaseModel):
    """Data for a figure block."""
    path: str = Field(default="", description="Path to image or placeholder")
    caption: str
    source_refs: List[str] = Field(default_factory=list)


class QuoteData(BaseModel):
    """Data for a quote block."""
    text: str
    source_refs: List[str] = Field(default_factory=list)


class WarningData(BaseModel):
    """Data for a warning/note block."""
    text: str


# ============================================================
# BLOCK TYPES
# ============================================================

class ParagraphBlock(BaseModel):
    """A paragraph of text with optional citations."""
    type: Literal["paragraph"] = "paragraph"
    data: ParagraphData


class ListBlock(BaseModel):
    """An ordered or unordered list."""
    type: Literal["list"] = "list"
    data: ListData


class TableBlock(BaseModel):
    """A data table with caption."""
    type: Literal["table"] = "table"
    data: TableData


class FigureBlock(BaseModel):
    """A figure/image reference."""
    type: Literal["figure"] = "figure"
    data: FigureData


class QuoteBlock(BaseModel):
    """A block quote with source."""
    type: Literal["quote"] = "quote"
    data: QuoteData


class WarningBlock(BaseModel):
    """A warning or note block."""
    type: Literal["warning"] = "warning"
    data: WarningData


# Union of all block types
Block = Union[ParagraphBlock, ListBlock, TableBlock, FigureBlock, QuoteBlock, WarningBlock]


# ============================================================
# SECTION & DOCUMENT MODELS
# ============================================================

class Section(BaseModel):
    """A document section with content and optional subsections."""
    id: str
    title: str
    level: Literal[1, 2, 3] = 1
    content: List[Block] = Field(default_factory=list)
    subsections: List["Section"] = Field(default_factory=list)
    
    class Config:
        # Allow forward references for recursive model
        pass


# Update forward refs for recursive model
Section.update_forward_refs()


class Reference(BaseModel):
    """A bibliography reference."""
    id: str
    title: str
    url: str
    authors: List[str] = Field(default_factory=list)
    year: Optional[str] = None


class ValidationIssue(BaseModel):
    """A validation issue found in the AST."""
    severity: Literal["critical", "warning"]
    message: str
    location: str


class DocumentAST(BaseModel):
    """The root document AST structure."""
    title: str
    subtitle: Optional[str] = None
    authors: List[str] = Field(default_factory=lambda: ["AI Research Synthesis Engine"])
    date: str = Field(default="")
    abstract: str = ""
    sections: List[Section] = Field(default_factory=list)
    references: List[Reference] = Field(default_factory=list)
    
    def validate_structure(self) -> List[ValidationIssue]:
        """
        Validate document structure and integrity.
        Returns a list of issues.
        """
        issues = []
        
        # 1. Critical: Title Check
        if not self.title or not self.title.strip():
            issues.append(ValidationIssue(
                severity="critical",
                message="Document title is missing.",
                location="Root"
            ))
            
        # 2. Critical: Section Check
        if not self.sections:
            issues.append(ValidationIssue(
                severity="critical",
                message="Document has no sections.",
                location="Root"
            ))
            
        # 3. Check internal consistency
        ref_ids = {r.id for r in self.references}
        
        for i, section in enumerate(self.sections):
            loc = f"Section {i+1} ({section.title[:20]}...)"
            
            if not section.title.strip():
                issues.append(ValidationIssue(
                    severity="critical",
                    message="Section title is missing.",
                    location=f"Section {i+1}"
                ))
            
            if not section.content and not section.subsections:
                issues.append(ValidationIssue(
                    severity="warning",
                    message="Section is empty.",
                    location=loc
                ))
            
            # Check for orphaned citations in this section
            orphans = []
            def check_block(block: Block):
                if block.type == "paragraph":
                    for cit in block.data.citations:
                        if cit not in ref_ids:
                            orphans.append(cit)
                elif block.type in ("table", "figure", "quote"):
                    for ref in getattr(block.data, 'source_refs', []):
                        if ref not in ref_ids:
                            orphans.append(ref)
            
            for block in section.content:
                check_block(block)
                
            if orphans:
                issues.append(ValidationIssue(
                    severity="warning", 
                    message=f"Orphaned citations found: {', '.join(sorted(list(set(orphans))))}",
                    location=loc
                ))

        return issues

    def validate_citations(self) -> List[str]:
        """Legacy helper - use validate_structure instead."""
        issues = self.validate_structure()
        orphans = [i.message for i in issues if "Orphaned" in i.message]
        return orphans


def document_to_dict(doc: DocumentAST) -> dict:
    """Convert DocumentAST back to a JSON-serializable dict."""
    return doc.dict()


def _normalize_ast_data(data: dict) -> dict:
    """Normalize LLM output to match DocumentAST schema before parsing."""
    # Normalize sections: auto-generate missing 'id' fields
    for i, section in enumerate(data.get("sections", [])):
        if "id" not in section:
            section["id"] = f"sec-{i+1}"
        # Recursively normalize subsections
        for j, sub in enumerate(section.get("subsections", [])):
            if "id" not in sub:
                sub["id"] = f"sec-{i+1}-{j+1}"
    
    # Normalize references: map 'ref_id' -> 'id'
    for ref in data.get("references", []):
        if "id" not in ref and "ref_id" in ref:
            ref["id"] = ref.pop("ref_id")
    
    return data


def parse_document_ast(data: dict) -> DocumentAST:
    """Parse a dictionary into a DocumentAST model with normalization."""
    normalized = _normalize_ast_data(data)
    return DocumentAST(**normalized)


def create_insufficient_data_block(message: str) -> WarningBlock:
    """Create a warning block for insufficient data."""
    return WarningBlock(data=WarningData(text=message))
