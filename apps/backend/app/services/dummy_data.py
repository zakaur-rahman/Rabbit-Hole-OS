from typing import Dict, Any
from app.services.document_ast import DocumentAST, Section, ParagraphBlock, ParagraphData

def get_dummy_research_data(query: str = "Dummy Topic") -> Dict[str, Any]:
    """
    Returns a complete, valid dictionary matching the research report structure.
    Used for development/testing to avoid LLM costs.
    """
    return {
        "title": f"Comprehensive Analysis of {query} (Dummy Data)",
        "abstract": "This is a generated dummy abstract for development purposes. It simulates the length and structure of a real abstract but contains no actual semantic value derived from the source materials. It serves to test layout, font rendering, and PDF generation pipelines without invoking costly AI models.",
        "introduction": "The introduction sets the stage for the dummy report. It introduces the core concepts of Lorem Ipsum and its role in placeholder text history. We will explore various dummy sections, meaningless charts, and hypothetical references to ensure the system handles structured data correctly.",
        "sections": [
            {
                "heading": "Historical Context of Dummy Data",
                "body": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
                "figures": []
            },
            {
                "heading": "Technical Specifications",
                "body": "This section tests the rendering of technical details. It includes a sub-list of important items:\n\n1. First item of importance\n2. Second item of relevance\n3. Third item of consequence\n\nFurthermore, the text flow should handle line breaks and paragraph spacing essentially identical to standard LaTeX formatting rules.",
                "figures": [
                    {
                        "type": "table",
                        "caption": "Comparative Analysis of Dummy Metrics",
                        "source_ref": "[1]",
                        "data": {
                            "headers": ["Metric", "Value A", "Value B", "Delta"],
                            "rows": [
                                ["Latency", "12ms", "15ms", "+25%"],
                                ["Throughput", "1000 rps", "850 rps", "-15%"],
                                ["Error Rate", "0.01%", "0.05%", "+400%"]
                            ]
                        }
                    }
                ]
            },
            {
                "heading": "Visual Representation",
                "body": "We also need to verify that charts and figures are handled correctly. Below is a placeholder for a chart that would normally be generated from data points.",
                "figures": [
                    {
                        "type": "bar_chart",
                        "caption": "Projected Growth of Placeholder Text Usage",
                        "source_ref": "[2]",
                        "data": {
                            "labels": ["Q1", "Q2", "Q3", "Q4"],
                            "datasets": [
                                {
                                    "label": "Usage 2024",
                                    "data": [65, 59, 80, 81]
                                }
                            ]
                        }
                    }
                ]
            },
            {
                "heading": "Conclusion",
                "body": "In conclusion, this dummy data successfully demonstrates the capacity of the system to process and render structured content. While the semantic content is successfully null usage, the structural integrity remains valid for development and testing iterations.",
                "figures": []
            }
        ],
        "conclusion": "The final thoughts summarize the dummy experiment. It confirms that the pipeline allows for rapid UI iteration without backend dependency on external AI providers.",
        "references": [
            "Cicero, M. T. (45 BC). 'De Finibus Bonorum et Malorum'.",
            "Rackham, H. (1914). 'English Translation of De Finibus'. Loeb Classical Library.",
            "Doe, J. (2025). 'The Art of Placeholder Text'. Dev Journal."
        ]
    }

def get_dummy_document_ast(query: str = "Dummy Topic") -> DocumentAST:
    """
    Returns a validated DocumentAST object with dummy data.
    """
    data = get_dummy_research_data(query)

    # Convert raw dict sections to AST Section/ContentBlock structure
    ast_sections = []

    for i, sec in enumerate(data["sections"]):
        # Create paragraphs from body text (split by double newline)
        paragraphs = sec["body"].split("\n\n")
        blocks = []

        for para in paragraphs:
            if para.strip():
                blocks.append(ParagraphBlock(
                    type="paragraph",
                    data=ParagraphData(text=para.strip(), citations=[])
                ))

        # Add figures as blocks if needed.
        # For now, let's just ensure basic text blocks are there.

        ast_sections.append(Section(
            id=f"sec-{i+1}",
            title=sec["heading"],
            level=1,
            content=blocks
        ))

    return DocumentAST(
        title=data["title"],
        abstract=data["abstract"],
        authors=["Dev System"],
        date="2025-01-01",
        sections=ast_sections,
        references=[
            {"id": f"ref-{i+1}", "title": ref, "url": "", "authors": [], "year": "2024"}
            for i, ref in enumerate(data["references"])
        ]
    )
