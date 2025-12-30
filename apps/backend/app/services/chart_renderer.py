"""
Chart Renderer Service

Generates professional charts from structured data for PDF reports.
Uses matplotlib with academic styling.
"""
import io
from typing import List, Dict, Any, Optional

# Use Agg backend for server-side rendering
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches


# Academic color palette
COLORS = ['#2E86AB', '#A23B72', '#F18F01', '#C73E1D', '#3B1F2B', '#4C5C68', '#1985A1']

def _setup_academic_style():
    """Configure matplotlib for academic-quality charts."""
    plt.style.use('seaborn-v0_8-whitegrid')
    plt.rcParams.update({
        'font.family': 'serif',
        'font.size': 10,
        'axes.titlesize': 12,
        'axes.labelsize': 10,
        'xtick.labelsize': 9,
        'ytick.labelsize': 9,
        'legend.fontsize': 9,
        'figure.figsize': (6, 4),
        'figure.dpi': 150,
        'axes.spines.top': False,
        'axes.spines.right': False,
    })


def render_bar_chart(data: Dict[str, Any]) -> Optional[io.BytesIO]:
    """
    Render a bar chart from structured data.
    
    Expected data format:
    {
        "labels": ["Label 1", "Label 2", ...],
        "values": [10, 20, ...],
        "title": "Chart Title",
        "x_label": "X Axis",
        "y_label": "Y Axis"
    }
    """
    try:
        labels = data.get("labels", [])
        values = data.get("values", [])
        
        if not labels or not values or len(labels) != len(values):
            print("Invalid bar chart data")
            return None
            
        _setup_academic_style()
        fig, ax = plt.subplots()
        
        colors = COLORS[:len(labels)]
        bars = ax.bar(labels, values, color=colors, edgecolor='white', linewidth=0.7)
        
        ax.set_title(data.get("title", ""), fontweight='bold', pad=15)
        ax.set_xlabel(data.get("x_label", ""))
        ax.set_ylabel(data.get("y_label", ""))
        
        # Add value labels on bars
        for bar, val in zip(bars, values):
            height = bar.get_height()
            ax.annotate(f'{val}',
                        xy=(bar.get_x() + bar.get_width() / 2, height),
                        ha='center', va='bottom',
                        fontsize=8, color='#333')
        
        plt.tight_layout()
        
        buf = io.BytesIO()
        fig.savefig(buf, format='png', bbox_inches='tight', facecolor='white')
        buf.seek(0)
        plt.close(fig)
        
        return buf
        
    except Exception as e:
        print(f"Error rendering bar chart: {e}")
        return None


def render_line_chart(data: Dict[str, Any]) -> Optional[io.BytesIO]:
    """
    Render a line chart from structured data.
    
    Expected data format:
    {
        "labels": ["2020", "2021", ...],
        "series": [
            {"name": "Series 1", "values": [10, 20, ...]},
            {"name": "Series 2", "values": [15, 25, ...]}
        ],
        "title": "Chart Title",
        "x_label": "X Axis",
        "y_label": "Y Axis"
    }
    """
    try:
        labels = data.get("labels", [])
        series = data.get("series", [])
        
        if not labels or not series:
            print("Invalid line chart data")
            return None
            
        _setup_academic_style()
        fig, ax = plt.subplots()
        
        for i, s in enumerate(series):
            values = s.get("values", [])
            if len(values) != len(labels):
                continue
            ax.plot(labels, values, 
                    marker='o', 
                    color=COLORS[i % len(COLORS)], 
                    label=s.get("name", f"Series {i+1}"),
                    linewidth=2,
                    markersize=5)
        
        ax.set_title(data.get("title", ""), fontweight='bold', pad=15)
        ax.set_xlabel(data.get("x_label", ""))
        ax.set_ylabel(data.get("y_label", ""))
        ax.legend(loc='best')
        
        plt.tight_layout()
        
        buf = io.BytesIO()
        fig.savefig(buf, format='png', bbox_inches='tight', facecolor='white')
        buf.seek(0)
        plt.close(fig)
        
        return buf
        
    except Exception as e:
        print(f"Error rendering line chart: {e}")
        return None


def render_pie_chart(data: Dict[str, Any]) -> Optional[io.BytesIO]:
    """
    Render a pie chart from structured data.
    
    Expected data format:
    {
        "labels": ["Category A", "Category B", ...],
        "values": [30, 70, ...],
        "title": "Chart Title"
    }
    """
    try:
        labels = data.get("labels", [])
        values = data.get("values", [])
        
        if not labels or not values or len(labels) != len(values):
            print("Invalid pie chart data")
            return None
        
        _setup_academic_style()
        fig, ax = plt.subplots()
        
        colors = COLORS[:len(labels)]
        wedges, texts, autotexts = ax.pie(
            values, 
            labels=labels, 
            colors=colors,
            autopct='%1.1f%%',
            startangle=90,
            wedgeprops={'edgecolor': 'white', 'linewidth': 1.5}
        )
        
        ax.set_title(data.get("title", ""), fontweight='bold', pad=15)
        
        # Style percentage labels
        for autotext in autotexts:
            autotext.set_color('white')
            autotext.set_fontweight('bold')
        
        plt.tight_layout()
        
        buf = io.BytesIO()
        fig.savefig(buf, format='png', bbox_inches='tight', facecolor='white')
        buf.seek(0)
        plt.close(fig)
        
        return buf
        
    except Exception as e:
        print(f"Error rendering pie chart: {e}")
        return None


def render_table_as_image(data: Dict[str, Any]) -> Optional[io.BytesIO]:
    """
    Render a table as an image for PDF embedding.
    
    Expected data format:
    {
        "headers": ["Column 1", "Column 2", ...],
        "rows": [
            ["Value 1", "Value 2", ...],
            ...
        ],
        "title": "Table Title"
    }
    """
    try:
        headers = data.get("headers", [])
        rows = data.get("rows", [])
        
        if not headers or not rows:
            print("Invalid table data")
            return None
        
        _setup_academic_style()
        fig, ax = plt.subplots(figsize=(8, 0.5 + 0.4 * len(rows)))
        ax.axis('off')
        
        table_data = [headers] + rows
        
        table = ax.table(
            cellText=table_data,
            loc='center',
            cellLoc='center',
            colWidths=[1/len(headers)] * len(headers)
        )
        
        table.auto_set_font_size(False)
        table.set_fontsize(9)
        table.scale(1.2, 1.5)
        
        # Style header row
        for i in range(len(headers)):
            table[(0, i)].set_facecolor('#2E86AB')
            table[(0, i)].set_text_props(color='white', fontweight='bold')
        
        # Alternate row colors
        for i in range(1, len(table_data)):
            for j in range(len(headers)):
                if i % 2 == 0:
                    table[(i, j)].set_facecolor('#f0f0f0')
        
        if data.get("title"):
            ax.set_title(data["title"], fontweight='bold', pad=20, fontsize=12)
        
        plt.tight_layout()
        
        buf = io.BytesIO()
        fig.savefig(buf, format='png', bbox_inches='tight', facecolor='white', dpi=150)
        buf.seek(0)
        plt.close(fig)
        
        return buf
        
    except Exception as e:
        print(f"Error rendering table: {e}")
        return None


def render_chart(figure_data: Dict[str, Any]) -> Optional[io.BytesIO]:
    """
    Route to the appropriate chart renderer based on type.
    
    Returns BytesIO buffer with rendered PNG, or None if rendering fails.
    """
    chart_type = figure_data.get("chart_type", figure_data.get("type", ""))
    data = figure_data.get("data", figure_data)
    
    if chart_type in ("bar", "bar_chart"):
        return render_bar_chart(data)
    elif chart_type in ("line", "line_chart"):
        return render_line_chart(data)
    elif chart_type in ("pie", "pie_chart"):
        return render_pie_chart(data)
    elif chart_type in ("table", "data_table"):
        return render_table_as_image(data)
    else:
        print(f"Unknown chart type: {chart_type}")
        return None
