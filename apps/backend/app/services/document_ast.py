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


class DocumentAST(BaseModel):
    """The root document AST structure."""
    title: str
    subtitle: Optional[str] = None
    authors: List[str] = Field(default_factory=lambda: ["AI Research Synthesis Engine"])
    date: str = Field(default="")
    abstract: str = ""
    sections: List[Section] = Field(default_factory=list)
    references: List[Reference] = Field(default_factory=list)
    
    def validate_citations(self) -> List[str]:
        """
        Validate that all citations in content map to references.
        Returns list of orphaned citation IDs.
        """
        ref_ids = {r.id for r in self.references}
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
        
        def check_section(section: Section):
            for block in section.content:
                check_block(block)
            for sub in section.subsections:
                check_section(sub)
        
        for section in self.sections:
            check_section(section)
        
        return orphans


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def create_insufficient_data_block(topic: str = "this section") -> ParagraphBlock:
    """Create a standard 'insufficient data' paragraph block."""
    return ParagraphBlock(
        type="paragraph",
        data=ParagraphData(
            text=f"Insufficient source data available for {topic}.",
            citations=[]
        )
    )


def parse_document_ast(json_data: dict) -> DocumentAST:
    """
    Parse and validate a JSON dict into a DocumentAST.
    
    Raises ValidationError if schema is invalid.
    """
    return DocumentAST.parse_obj(json_data)


def document_to_dict(doc: DocumentAST) -> dict:
    """Convert DocumentAST back to a JSON-serializable dict."""
    return doc.dict()
