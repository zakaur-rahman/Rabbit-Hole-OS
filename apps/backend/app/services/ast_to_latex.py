"""
AST to LaTeX Converter — Deterministic Document Rendering

Converts a validated DocumentAST to compilable LaTeX code.
Handles all block types with consistent styling.
"""
from typing import List
from .document_ast import (
    DocumentAST, Section, Block,
    ParagraphBlock, ListBlock, TableBlock,
    FigureBlock, QuoteBlock, WarningBlock,
    Reference
)
from .latex_service import escape_latex
import os
import urllib.parse


# ============================================================
# BLOCK CONVERTERS
# ============================================================

def convert_paragraph(block: ParagraphBlock) -> str:
    """Convert a paragraph block to LaTeX."""
    text = escape_latex(block.data.text)

    # Convert citation markers [1] to \cite{1}
    for cit in block.data.citations:
        # Replace [ref_id] with \cite{ref_id}
        text = text.replace(f"[{cit}]", f"\\cite{{{cit}}}")

    return f"\n{text}\n"


def convert_list(block: ListBlock) -> str:
    """Convert a list block to LaTeX."""
    env = "enumerate" if block.data.ordered else "itemize"

    items = []
    for item in block.data.items:
        escaped = escape_latex(item)
        items.append(f"    \\item {escaped}")

    items_str = "\n".join(items)

    return f"""
\\begin{{{env}}}
{items_str}
\\end{{{env}}}
"""


def convert_table(block: TableBlock) -> str:
    """Convert a table block to LaTeX with booktabs styling."""
    data = block.data

    if not data.columns or not data.rows:
        return f"\n% Table data unavailable: {escape_latex(data.caption)}\n"

    num_cols = len(data.columns)
    col_spec = "l" + "c" * (num_cols - 1)

    # Header row
    header = " & ".join([escape_latex(col) for col in data.columns])

    # Data rows
    rows = []
    for row in data.rows:
        cells = " & ".join([escape_latex(str(cell)) for cell in row])
        rows.append(cells + " \\\\")

    rows_str = "\n".join(rows)

    # Source refs
    source_note = ""
    if data.source_refs:
        refs = ", ".join([f"\\cite{{{r}}}" for r in data.source_refs])
        source_note = f"\\\\\\small{{Source: {refs}}}"

    return f"""
\\begin{{table}}[htbp]
\\centering
\\caption{{{escape_latex(data.caption)}{source_note}}}
\\begin{{tabular}}{{{col_spec}}}
\\toprule
{header} \\\\
\\midrule
{rows_str}
\\bottomrule
\\end{{tabular}}
\\end{{table}}
"""


def convert_figure(block: FigureBlock) -> str:
    """Convert a figure block to LaTeX."""
    data = block.data
    caption = escape_latex(data.caption)

    # Source refs
    source_note = ""
    if data.source_refs:
        refs = ", ".join([f"\\cite{{{r}}}" for r in data.source_refs])
        source_note = f" Source: {refs}"

    # Verify path exists locally to prevent pdflatex from crashing
    is_valid_file = False
    local_path = data.path
    if local_path:
        if local_path.startswith("file://"):
            local_path = urllib.parse.unquote(local_path[7:])
        
        # Check if local absolute path exists
        if os.path.isfile(local_path):
            is_valid_file = True

    if is_valid_file:
        return f"""
\\begin{{figure}}[htbp]
\\centering
\\includegraphics[width=0.8\\textwidth]{{{local_path}}}
\\caption{{{caption}.{source_note}}}
\\end{{figure}}
"""
    else:
        # Placeholder for missing, invalid, or remote image
        hint = f" [Path: {escape_latex(data.path)}]" if data.path else ""
        return f"""
\\begin{{figure}}[htbp]
\\centering
\\fbox{{\\parbox{{0.7\\textwidth}}{{\\centering\\textit{{[Figure: {caption}]{hint}}}}}}}
\\caption{{{caption}.{source_note}}}
\\end{{figure}}
"""


def convert_quote(block: QuoteBlock) -> str:
    """Convert a quote block to LaTeX."""
    data = block.data
    text = escape_latex(data.text)

    source = ""
    if data.source_refs:
        refs = ", ".join([f"\\cite{{{r}}}" for r in data.source_refs])
        source = f"\\hfill--- {refs}"

    return f"""
\\begin{{quote}}
\\textit{{{text}}}
{source}
\\end{{quote}}
"""


def convert_warning(block: WarningBlock) -> str:
    """Convert a warning/note block to LaTeX."""
    text = escape_latex(block.data.text)

    return f"""
\\begin{{center}}
\\fbox{{\\parbox{{0.9\\textwidth}}{{
\\textbf{{Note:}} {text}
}}}}
\\end{{center}}
"""


def convert_block(block: Block) -> str:
    """Route a block to its appropriate converter."""
    if block.type == "paragraph":
        return convert_paragraph(block)
    elif block.type == "list":
        return convert_list(block)
    elif block.type == "table":
        return convert_table(block)
    elif block.type == "figure":
        return convert_figure(block)
    elif block.type == "quote":
        return convert_quote(block)
    elif block.type == "warning":
        return convert_warning(block)
    else:
        return f"\n% Unknown block type: {block.type}\n"


# ============================================================
# SECTION CONVERTER
# ============================================================

def convert_section(section: Section, parent_level: int = 0) -> str:
    """Convert a section and its subsections to LaTeX."""
    # Determine LaTeX section command
    level = section.level
    if level == 1:
        cmd = "section"
    elif level == 2:
        cmd = "subsection"
    else:
        cmd = "subsubsection"

    title = escape_latex(section.title)

    parts = [f"\n\\{cmd}{{{title}}}"]

    # Convert content blocks
    for block in section.content:
        parts.append(convert_block(block))

    # Convert subsections
    for sub in section.subsections:
        parts.append(convert_section(sub, level))

    return "\n".join(parts)


# ============================================================
# DOCUMENT CONVERTER
# ============================================================

def convert_section_to_standalone_latex(section: Section, references: List[Reference]) -> str:
    """
    Convert a single section to a standalone LaTeX document for isolation testing.
    """
    doc = DocumentAST(
        title=f"Isolation Test: {section.title}",
        authors=["Isolation Tester"],
        sections=[section],
        references=references
    )
    return convert_document_to_latex(doc)


def convert_document_to_latex(doc: DocumentAST) -> str:
    """
    Convert a complete DocumentAST to compilable LaTeX code.

    Returns a complete LaTeX document string.
    """
    title = escape_latex(doc.title)
    subtitle = escape_latex(doc.subtitle) if doc.subtitle else ""
    authors = ", ".join([escape_latex(a) for a in doc.authors])
    date = escape_latex(doc.date) if doc.date else "\\today"
    abstract = escape_latex(doc.abstract)

    # Build preamble
    preamble = r"""\documentclass[11pt,a4paper]{article}

% Packages
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage{geometry}
\usepackage{graphicx}
\usepackage{booktabs}
\usepackage{xcolor}
\usepackage{fancyhdr}
\usepackage{titlesec}
\usepackage{parskip}
\usepackage{microtype}
\usepackage{hyperref}

% Page geometry
\geometry{
    a4paper,
    margin=1in,
    top=1.2in,
    bottom=1.2in
}

% Colors
\definecolor{linkblue}{RGB}{0,102,204}
\definecolor{sectioncolor}{RGB}{31,78,121}

% Hyperref setup
\hypersetup{
    colorlinks=true,
    linkcolor=sectioncolor,
    urlcolor=linkblue,
    citecolor=sectioncolor,
    pdfauthor={""" + authors + r"""},
    pdftitle={""" + title.replace('\\', '').replace('{', '').replace('}', '') + r"""}
}

% Section styling
\titleformat{\section}
    {\Large\bfseries\color{sectioncolor}}
    {\thesection}{1em}{}
\titleformat{\subsection}
    {\large\bfseries\color{sectioncolor}}
    {\thesubsection}{1em}{}
\titleformat{\subsubsection}
    {\normalsize\bfseries}
    {\thesubsubsection}{1em}{}

% Header/Footer
\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{\small\leftmark}
\fancyhead[R]{\small AI Research Synthesis}
\fancyfoot[C]{\thepage}
\renewcommand{\headrulewidth}{0.4pt}

% Citation command (simple implementation)
% In a real LaTeX doc this would use biblatex, but for our AST converter
% we use a simple bracketed cite or actual \cite if packages are loaded.
% To prevent "undefined citation" errors during isolation tests,
% we ensure all cited keys exist in the bibliography.

"""

    # Title section
    title_section = f"""\\title{{{title}"""
    if subtitle:
        title_section += f"\\\\ \\large{{{subtitle}}}"
    title_section += "}"
    title_section += f"""
\\author{{{authors}}}
\\date{{{date}}}

\\begin{{document}}

\\maketitle
\\thispagestyle{{empty}}

\\begin{{abstract}}
{abstract}
\\end{{abstract}}

\\newpage
\\tableofcontents
\\newpage

"""

    # Sections
    sections_latex = []
    for section in doc.sections:
        sections_latex.append(convert_section(section))

    sections_str = "\n".join(sections_latex)

    # References
    refs_latex = "\n\\newpage\n\\begin{thebibliography}{99}\n"
    if not doc.references:
         # Add a dummy ref if none exist to avoid empty thebibliography error
         refs_latex += "\\bibitem{dummy} Dummy Reference\n"
    else:
        for ref in doc.references:
            authors = ", ".join(ref.authors) if ref.authors else "Unknown Authors"
            year_str = f" ({ref.year})" if ref.year else ""
            ref_title = escape_latex(ref.title)
            ref_url = ref.url

            # Format: Authors (Year). Title. \url{URL}
            refs_latex += f"\\bibitem{{{ref.id}}} {authors}{year_str}. \\textit{{{ref_title}}}. \\url{{{ref_url}}}\n"
    refs_latex += "\\end{thebibliography}\n"

    # Combine all parts
    document = preamble + title_section + sections_str + refs_latex + "\n\\end{document}\n"

    return document
