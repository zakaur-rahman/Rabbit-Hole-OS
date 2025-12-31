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

    # Only use source_map for bibliography if available to avoid double listing
    if source_map:
        for ref_num, ref_data in sorted(source_map.items(), key=lambda x: int(x[0]) if x[0].isdigit() else 0):
            url = ref_data.get("url", "")
            title = sanitize_for_latex(ref_data.get("title", "Source"))
            # Ensure ref_num is clean (no brackets)
            clean_id = str(ref_num).strip("[]")
            latex_parts.append(f"\\bibitem{{{clean_id}}} {title}. \\url{{{url}}}\n")
    elif references:
        # Fallback for reports that only have formatted strings
        for i, ref in enumerate(references):
            ref_clean = sanitize_for_latex(str(ref))
            latex_parts.append(f"\\bibitem{{{i+1}}} {ref_clean}\n")
    
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


def parse_latex_log(log: str) -> List[Dict[str, Any]]:
    """
    Parse LaTeX compiler log to extract structured errors.
    """
    errors = []
    lines = log.split('\n')
    
    current_error = None
    
    for i, line in enumerate(lines):
        # 1. Tectonic/pdflatex style: document.tex:58: error: ... or document.tex:58: ! LaTeX...
        # We make the second colon and error level optional
        match = re.search(r'document\.tex:(\d+):(?:\s*(error|warning):)?\s*(.*)', line, re.IGNORECASE)
        if match:
            line_num = int(match.group(1))
            msg = match.group(3).strip()
            errors.append({
                'message': msg,
                'line': line_num,
                'context': line.strip()
            })
            current_error = errors[-1]
            continue

        # 2. Standard LaTeX Error: "! LaTeX Error: <message>" or "! Package <pkg> Error: <message>"
        if line.startswith('! '):
            msg = line[2:].strip()
            if msg.startswith('LaTeX Error:'):
                msg = msg.replace('LaTeX Error:', '').strip()
            
            current_error = {
                'message': msg,
                'line': 0,
                'context': line.strip()
            }
            errors.append(current_error)
            continue
        
        # 3. Specific Tectonic style: "  error: <message>" followed by line info
        tectonic_error_match = re.search(r'^\s*error:\s+(.*)', line)
        if tectonic_error_match and not current_error:
            current_error = {
                'message': tectonic_error_match.group(1).strip(),
                'line': 0,
                'context': line.strip()
            }
            errors.append(current_error)
            continue

        # 4. Line number indicator: "l.<line> <context>" or "line <line>"
        line_match = re.search(r'l\.(\d+)', line)
        if not line_match:
            line_match = re.search(r'line (\d+)', line, re.IGNORECASE)
        
        # 5. Tectonic pointer style: "  --> document.tex:5:1"
        if not line_match:
            line_match = re.search(r'-->\s+document\.tex:(\d+)', line)
            
        if line_match and current_error:
            # Only update if we don't have a line yet (line 0)
            if current_error.get('line') == 0:
                current_error['line'] = int(line_match.group(1))
                # Add visual context if possible
                context_match = re.search(r'(?:l\.\d+|-->.*?:\d+)\s+(.*)', line)
                if context_match:
                    current_error['context'] = context_match.group(1).strip()
            continue

    return errors

def validate_latex_safety(latex_code: str) -> List[str]:
    """
    Check LaTeX code for unsafe or disallowed commands (Strict Mode).
    
    Returns list of error messages if violations found.
    """
    violations = []
    
    # Safe packages whitelist
    SAFE_PACKAGES = {
        'inputenc', 'fontenc', 'geometry', 'graphicx', 'booktabs', 
        'xcolor', 'fancyhdr', 'titlesec', 'parskip', 'microtype', 
        'hyperref', 'amsmath', 'amssymb', 'amsfonts', 'url', 'enumitem',
        'caption', 'subcaption', 'float', 'array', 'longtable'
    }

    # Safe commands whitelist (targets for \renewcommand, etc)
    SAFE_REDEFINITIONS = {
        '\\headrulewidth', '\\footrulewidth', '\\thesection', 
        '\\thesubsection', '\\thesubsubsection', '\\contentsname',
        '\\abstractname'
    }

    # High-risk commands that are always blocked
    BLACKLIST = [
        (r'\\write18', 'Shell execution (\\write18) is not allowed'),
        (r'\\immediate', 'Command \\immediate is not allowed'),
        (r'\\input\{', 'Command \\input is not allowed in Strict Mode (use the AST to structure documents)'),
        (r'\\include\{', 'Command \\include is not allowed in Strict Mode'),
        (r'\\closeout', 'File operations are not allowed'),
        (r'\\newwrite', 'File operations are not allowed'),
        (r'\\openin', 'File operations are not allowed'),
        (r'\\openout', 'File operations are not allowed'),
        (r'\\read', 'File operations are not allowed'),
        (r'\\catcode', 'Catcode modification is not allowed'),
    ]
    
    lines = latex_code.split('\n')
    for i, line in enumerate(lines):
        # Strip comments
        clean_line = line.split('%')[0].strip()
    
    # Check for forbidden packages
    FORBIDDEN_PACKAGES = [
        'shellesc', 'write18', 'catchfile', 'pythontex', 'bashful'
    ]
    
    for i, line in enumerate(lines):
        # Strip comments for safety checks
        clean_line = line.split('%')[0].strip()
        if not clean_line:
            continue
            
        # 1. Check for forbidden packages
        for pkg in FORBIDDEN_PACKAGES:
            if re.search(rf'\\usepackage(?:\s*\[[^\]]*\])?\s*\{{{pkg}\}}', clean_line):
                violations.append({
                    "message": f"Package '{pkg}' is forbidden for security reasons.",
                    "line": i + 1,
                    "context": "Strict Mode Violation"
                })
        
        # 2. Check for high-risk commands
        for pattern, msg in BLACKLIST:
            if re.search(pattern, clean_line):
                violations.append({
                    "message": msg,
                    "line": i + 1,
                    "context": "Strict Mode Violation"
                })
        
        # 3. Check for arbitrary redefinitions (preventing \def, \let, \renewcommand of core primitives)
        # We allow a whitelist of redefinitions used in our standard template
        SAFE_REDEFINITIONS = [
            '\\headrulewidth', '\\footrulewidth', '\\thesection', '\\topmargin', 
            '\\textheight', '\\textwidth', '\\oddsidemargin', '\\evensidemargin'
        ]
        
        redef_match = re.search(r'(\\def(?![a-zA-Z])|\\let(?![a-zA-Z])|\\renewcommand)\s*(\\[a-zA-Z]+)', line)
        if redef_match:
            cmd = redef_match.group(2)
            if cmd not in SAFE_REDEFINITIONS:
                # Special case: \definecolor is safe
                if not line.strip().startswith('\\definecolor'):
                    violations.append({
                        "message": f"Arbitrary redefinition ({cmd}) is not allowed in Strict Mode.",
                        "line": i + 1,
                        "context": "Strict Mode Violation"
                    })

    return violations


def compile_latex_to_pdf(latex_code: str, strict_mode: bool = True) -> (Optional[io.BytesIO], List[Dict[str, Any]]):
    """
    Compile LaTeX code to PDF using tectonic or pdflatex.
    
    Args:
        latex_code: The LaTeX source.
        strict_mode: If True, validate code against safety blacklist before compiling.
        
    Returns:
        Tuple (pdf_bytes, errors)
    """
    # 1. Validation (Strict Mode)
    if strict_mode:
        violations = validate_latex_safety(latex_code)
        if violations:
            print(f"[LaTeX] Strict Mode violations: {violations}")
            return None, violations

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
    
    errors = []
    
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
                    return buffer, []
                else:
                    log_output = result.stdout.decode() + "\n" + result.stderr.decode()
                    print(f"[LaTeX] Tectonic failed: {log_output[:500]}")
                    errors = parse_latex_log(log_output)
                    return None, errors
                    
            except FileNotFoundError:
                print("[LaTeX] Tectonic not found, trying pdflatex...")
            except subprocess.TimeoutExpired:
                print("[LaTeX] Tectonic timed out")
                errors.append({"message": "Tectonic compilation timed out", "line": 0})
            except Exception as e:
                print(f"[LaTeX] Tectonic error: {e}")
                errors.append({"message": str(e), "line": 0})

        
        # Try pdflatex
        try:
            # Run twice for TOC
            result = None
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
                return buffer, []
            else:
                log_output = result.stdout.decode() if result else "No output"
                print(f"[LaTeX] pdflatex failed: {log_output[:500]}")
                errors = parse_latex_log(log_output)
                return None, errors

        except FileNotFoundError:
            print("[LaTeX] pdflatex not found")
            errors.append({"message": "No LaTeX compiler found (tectonic or pdflatex)", "line": 0})
        except subprocess.TimeoutExpired:
            print("[LaTeX] pdflatex timed out")
            errors.append({"message": "pdflatex timed out", "line": 0})
        except Exception as e:
            print(f"[LaTeX] pdflatex error: {e}")
            errors.append({"message": str(e), "line": 0})
    
    return None, errors


def get_latex_only(report_data: Dict[str, Any], source_map: Dict[str, Dict]) -> str:
    """
    Generate LaTeX code without compiling.
    
    Useful when no LaTeX compiler is available.
    """
    return generate_latex_document(report_data, source_map)
