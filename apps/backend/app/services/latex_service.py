"""
LaTeX Service — Publication-Quality PDF Generation

Generates compilable LaTeX documents from structured research data.
Compiles to PDF using tectonic or pdflatex.
"""
import io
import os
import re
import subprocess
import tempfile
from typing import Dict, List, Any, Optional
from pathlib import Path


# LaTeX special characters that need escaping
LATEX_SPECIAL_CHARS = {
    '&': r'\&',
    '%': r'\%',
    '$': r'\$',
    '#': r'\#',
    '_': r'\_',
    '{': r'\{',
    '}': r'\}',
    '~': r'\textasciitilde{}',
    '^': r'\textasciicircum{}',
    '\\': r'\textbackslash{}',
    '<': r'\textless{}',
    '>': r'\textgreater{}',
}


def escape_latex(text: str) -> str:
    """
    Escape LaTeX special characters in text.
    
    Preserves already escaped sequences and LaTeX commands.
    """
    if not text:
        return ""
    
    # First, protect existing LaTeX commands and escaped chars
    protected = []
    result = text
    
    # Preserve existing backslash commands (like \section, \cite, etc.)
    command_pattern = r'\\[a-zA-Z]+(?:\{[^}]*\})*'
    for i, match in enumerate(re.finditer(command_pattern, text)):
        placeholder = f"__LATEX_CMD_{i}__"
        protected.append((placeholder, match.group()))
        result = result.replace(match.group(), placeholder, 1)
    
    # Now escape special characters
    for char, escaped in LATEX_SPECIAL_CHARS.items():
        if char != '\\':  # Handle backslash separately
            result = result.replace(char, escaped)
    
    # Restore protected commands
    for placeholder, original in protected:
        result = result.replace(placeholder, original)
    
    return result


def sanitize_for_latex(text: str) -> str:
    """
    Sanitize text for LaTeX, removing problematic characters.
    """
    if not text:
        return ""
    
    # Remove control characters
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    
    # Escape special chars
    return escape_latex(text)


def generate_latex_document(report_data: Dict[str, Any], source_map: Dict[str, Dict]) -> str:
    """
    Generate a complete LaTeX document from structured report data.
    
    Args:
        report_data: Dict with title, abstract, introduction, sections, conclusion, references
        source_map: Dict mapping reference numbers to source URLs and titles
    
    Returns:
        Complete, compilable LaTeX code as string.
    """
    title = sanitize_for_latex(report_data.get("title", "Research Report"))
    abstract = sanitize_for_latex(report_data.get("abstract", ""))
    introduction = sanitize_for_latex(report_data.get("introduction", ""))
    conclusion = sanitize_for_latex(report_data.get("conclusion", ""))
    sections = report_data.get("sections", [])
    references = report_data.get("references", [])
    
    # Build LaTeX document
    latex_parts = []
    
    # Preamble
    latex_parts.append(r"""\documentclass[11pt,a4paper]{article}

% Packages
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage{geometry}
\usepackage{graphicx}
\usepackage{booktabs}
\usepackage{hyperref}
\usepackage{xcolor}
\usepackage{fancyhdr}
\usepackage{titlesec}
\usepackage{parskip}
\usepackage{microtype}

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
    pdfauthor={AI Research Synthesis Engine},
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

""")
    
    # Title and abstract
    latex_parts.append(r"\title{" + title + r"}")
    latex_parts.append(r"\author{AI Research Synthesis Engine}")
    latex_parts.append(r"\date{\today}")
    latex_parts.append(r"""
\begin{document}

% Title Page
\maketitle
\thispagestyle{empty}

\begin{abstract}
""" + abstract + r"""
\end{abstract}

\newpage
\tableofcontents
\newpage

""")
    
    # Introduction
    latex_parts.append(r"""% Introduction
\section{Introduction}
""" + introduction + "\n\n")
    
    # Main sections
    for section in sections:
        heading = sanitize_for_latex(section.get("heading", ""))
        body = sanitize_for_latex(section.get("body", ""))
        figures = section.get("figures", [])
        
        # Determine section level based on heading structure
        latex_parts.append(f"\\section{{{heading}}}\n")
        latex_parts.append(body + "\n\n")
        
        # Add figures if present
        for i, fig in enumerate(figures):
            if not fig or fig.get("type") == "image_placeholder":
                continue
            
            fig_type = fig.get("type", "")
            caption = sanitize_for_latex(fig.get("caption", f"Figure {i+1}"))
            
            if fig_type == "table":
                # Render table
                latex_parts.append(_generate_latex_table(fig, caption))
            else:
                # For charts, we note that data exists but can't render without pgfplots data
                latex_parts.append(f"""
\\begin{{figure}}[htbp]
\\centering
\\fbox{{\\parbox{{0.8\\textwidth}}{{\\centering\\textit{{[Chart: {caption}]}}\\\\Data visualization available in source.}}}}
\\caption{{{caption}}}
\\end{{figure}}
""")
    
    # Conclusion
    latex_parts.append(r"""
% Conclusion
\section{Conclusion}
""" + conclusion + "\n\n")
    
    # References
    latex_parts.append(r"""
% References
\newpage
\begin{thebibliography}{99}
""")
    
    for i, ref in enumerate(references):
        ref_clean = sanitize_for_latex(str(ref))
        latex_parts.append(f"\\bibitem{{{i+1}}} {ref_clean}\n")
    
    # Also add source map entries not in references
    for ref_num, ref_data in source_map.items():
        url = ref_data.get("url", "")
        title = sanitize_for_latex(ref_data.get("title", "Source"))
        if url:
            latex_parts.append(f"\\bibitem{{{ref_num}}} {title}. \\url{{{url}}}\n")
    
    latex_parts.append(r"""
\end{thebibliography}

\end{document}
""")
    
    return "".join(latex_parts)


def _generate_latex_table(fig: Dict, caption: str) -> str:
    """Generate a LaTeX table from figure data."""
    data = fig.get("data", {})
    headers = data.get("headers", [])
    rows = data.get("rows", [])
    
    if not headers or not rows:
        return f"\n% Table data not available for: {caption}\n"
    
    num_cols = len(headers)
    col_spec = "l" + "c" * (num_cols - 1)
    
    table_latex = f"""
\\begin{{table}}[htbp]
\\centering
\\caption{{{caption}}}
\\begin{{tabular}}{{{col_spec}}}
\\toprule
"""
    
    # Header row
    header_row = " & ".join([sanitize_for_latex(str(h)) for h in headers])
    table_latex += header_row + " \\\\\n\\midrule\n"
    
    # Data rows
    for row in rows:
        row_cells = " & ".join([sanitize_for_latex(str(cell)) for cell in row])
        table_latex += row_cells + " \\\\\n"
    
    table_latex += """\\bottomrule
\\end{tabular}
\\end{table}
"""
    
    return table_latex


def compile_latex_to_pdf(latex_code: str) -> Optional[io.BytesIO]:
    """
    Compile LaTeX code to PDF using tectonic or pdflatex.
    
    Returns:
        BytesIO buffer with PDF content, or None if compilation fails.
    """
    # Find tectonic executable - check local directories first
    tectonic_paths = [
        Path(__file__).parent.parent.parent / "tectonic.exe",  # backend/tectonic.exe
        Path.cwd() / "tectonic.exe",  # current working dir
        Path(__file__).parent / "tectonic.exe",  # beside this script
        "tectonic",  # system PATH
    ]
    
    tectonic_exe = None
    for p in tectonic_paths:
        if isinstance(p, Path):
            if p.exists():
                tectonic_exe = str(p)
                print(f"[LaTeX] Found tectonic at: {tectonic_exe}")
                break
        else:
            tectonic_exe = p  # Use system PATH
    
    with tempfile.TemporaryDirectory() as tmpdir:
        tex_path = Path(tmpdir) / "document.tex"
        pdf_path = Path(tmpdir) / "document.pdf"
        
        # Write LaTeX file
        tex_path.write_text(latex_code, encoding='utf-8')
        
        # Try tectonic first
        if tectonic_exe:
            try:
                result = subprocess.run(
                    [tectonic_exe, str(tex_path)],
                    cwd=tmpdir,
                    capture_output=True,
                    timeout=120
                )
                
                if pdf_path.exists():
                    print("[LaTeX] Compiled successfully with tectonic")
                    buffer = io.BytesIO(pdf_path.read_bytes())
                    return buffer
                else:
                    print(f"[LaTeX] Tectonic failed: {result.stderr.decode()[:500]}")
            except FileNotFoundError:
                print("[LaTeX] Tectonic not found, trying pdflatex...")
            except subprocess.TimeoutExpired:
                print("[LaTeX] Tectonic timed out")
            except Exception as e:
                print(f"[LaTeX] Tectonic error: {e}")

        
        # Try pdflatex
        try:
            # Run twice for TOC
            for _ in range(2):
                result = subprocess.run(
                    ["pdflatex", "-interaction=nonstopmode", str(tex_path)],
                    cwd=tmpdir,
                    capture_output=True,
                    timeout=60
                )
            
            if pdf_path.exists():
                print("[LaTeX] Compiled successfully with pdflatex")
                buffer = io.BytesIO(pdf_path.read_bytes())
                return buffer
            else:
                print(f"[LaTeX] pdflatex failed: {result.stderr.decode()[:500]}")
        except FileNotFoundError:
            print("[LaTeX] pdflatex not found")
        except subprocess.TimeoutExpired:
            print("[LaTeX] pdflatex timed out")
        except Exception as e:
            print(f"[LaTeX] pdflatex error: {e}")
    
    return None


def get_latex_only(report_data: Dict[str, Any], source_map: Dict[str, Dict]) -> str:
    """
    Generate LaTeX code without compiling.
    
    Useful when no LaTeX compiler is available.
    """
    return generate_latex_document(report_data, source_map)
