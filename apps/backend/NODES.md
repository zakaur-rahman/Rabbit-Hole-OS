# Node Types — Management & Research Synthesis Influence

Documentation for node types in the Rabbit-Hole OS canvas, and how each type contributes to AI research paper generation.

---

## Architecture Overview

```
Canvas (Frontend)
    └── Node (type, data, metadata, content)
            │
            ▼
    Backend API (POST /nodes)
            │  detect_content_type() or explicit type from frontend
            │
            ▼
    Node DB Model (Node.type, Node.content, Node.metadata_)
            │
            ▼
    Synthesis Request
    ChunkedContextItem {node_id, title, content, url, node_type, metadata, ...}
            │
            ▼
    chunk_service.segment_nodes()
    _extract_chunk_for_type()  ← TYPE-AWARE DISPATCH
            │
            ▼
    Chunks with TYPE MARKERS:
    [IMAGE], [CODE:lang], [RESEARCHER_NOTE], [ACADEMIC_PAPER], [PRODUCT] ...
            │
            ▼
    agents.WriterAgent.write()
    ← NODE TYPE MARKERS → MANDATORY BLOCK MAPPING
            │
            ▼
    Document AST (sections, blocks, references)
```

---

## Node Types Reference

### `article` — Web Article

| Field | Description |
|-------|-------------|
| `content` | Full scraped text |
| `url` | Source URL |
| `outline` | Auto-extracted heading structure |
| `metadata_.author` | Author (if available) |
| `metadata_.date` | Publication date |

**Synthesis Influence:**
- Standard synthesis into `paragraph` blocks
- Outline-based topic selection supported
- Cited via `[1]`, `[2]` inline footnotes

---

### `web` — Live Web Page

| Field | Description |
|-------|-------------|
| `url` | Web page URL |
| `content` | Scraped text (if accessible) |
| `metadata_.favicon` | Site favicon |
| `metadata_.color` | Accent color |

**Synthesis Influence:**
- Treated identically to `article` in synthesis
- Uses `extract_content()` for scraping
- Supports outline-based topic selection

---

### `pdf` — PDF Document

| Field | Description |
|-------|-------------|
| `url` | PDF URL or `data:application/pdf;base64,...` |
| `content` | Extracted text (via scraper) |
| `metadata_.page_count` | Number of pages |

**Synthesis Influence:**
- Outline-based topic selection if `content` is populated
- Falls back to `"PDF available at: {url}"` note if no text extracted
- Cited formally in references section

**Auto-detected URLs:** `*.pdf`, `/pdf/`, `type=pdf`

---

### `image` — Image

| Field | Description |
|-------|-------------|
| `url` | Image URL or `data:image/*;base64,...` |
| `metadata_.description` | Alt text or caption |
| `metadata_.alt` | Alternative text |

**Synthesis Influence:**
- Emits `[IMAGE]` marker in context → `figure` block in AST
- WriterAgent inserts: `{"type": "figure", "data": {"path": "<url>", "caption": "<title>"}}`
- Automatically suggests a figure entry in the research document

**Auto-detected URLs:** `*.jpg`, `*.png`, `*.gif`, `*.webp`, `*.svg`, Imgur, Unsplash, Flickr

---

### `code` — Code Snippet

| Field | Description |
|-------|-------------|
| `content` | Code text |
| `metadata_.language` | Language (python, js, typescript, rust, go, sql, html, css) |
| `metadata_.source` | Optional source reference |
| `metadata_.solved` | LeetCode-style solved flag |

**Synthesis Influence:**
- Emits `[CODE:<language>]` + fenced code block in context
- WriterAgent inserts: `{"type": "code_block", "data": {"language": "...", "code": "..."}}`
- New AST block type `code_block` added in `document_ast.py`

---

### `note` — Research Note

| Field | Description |
|-------|-------------|
| `content` | Rich HTML (from Tiptap editor) |
| `metadata_.tags` | Array of tag strings |

**Synthesis Influence:**
- HTML is stripped to plain text before sending to LLM
- Emits `[RESEARCHER_NOTE]` marker
- WriterAgent inserts as `quote` block: `{"type": "quote", "data": {"text": "..."}}`
- Tags appended as context hints

---

### `text` — Plain Text

| Field | Description |
|-------|-------------|
| `content` | Raw plain text |

**Synthesis Influence:**
- Treated same as `note` (plain text passthrough)
- No special markers — direct inclusion as paragraph content

---

### `video` — Video

| Field | Description |
|-------|-------------|
| `url` | YouTube / Vimeo URL |
| `content` | Transcript (if available) |
| `metadata_.duration` | Video duration |

**Synthesis Influence:**
- Treated as `article` (outline-based if transcript available)
- Cited with "Video: {title}" attribution
- If no transcript: `"Video available at: {url}"` note

**Auto-detected URLs:** `youtube.`, `vimeo.`, `twitch.`

---

### `academic` — Academic Paper

| Field | Description |
|-------|-------------|
| `url` | DOI or paper URL |
| `content` | Full text or abstract |
| `metadata_.authors` | List of author strings |
| `metadata_.year` | Publication year |
| `metadata_.abstract` | Abstract text |

**Synthesis Influence:**
- Emits `[ACADEMIC_PAPER]` marker → highest citation priority
- WriterAgent treats abstract as a formal citation
- Included in references with authors and year
- Auto-detected: `arxiv.`, `doi.org`, `pubmed`, `.edu`, `scholar.`

---

### `product` — Product

| Field | Description |
|-------|-------------|
| `url` | Product page URL |
| `content` | Product description |
| `metadata_.price` | Price string |
| `metadata_.rating` | Rating value |
| `metadata_.brand` | Brand name |

**Synthesis Influence:**
- Emits `[PRODUCT]` marker
- WriterAgent may insert a `table` block: columns = Name, Brand, Price, Rating
- Auto-detected: `amazon.`, `ebay.`, `shop`, `product`

---

### `annotation` / `comment` — Annotation

| Field | Description |
|-------|-------------|
| `content` | HTML or plain text |
| `metadata_.target_node_id` | Node being annotated |

**Synthesis Influence:**
- Emits `[ANNOTATION]` marker → `quote` block
- Inline context placed nearest to the referenced section

---

### `canvas` — Sub-Canvas (Nested Whiteboard)

| Field | Description |
|-------|-------------|
| `metadata_.referencedCanvasId` | ID of the nested whiteboard |
| `metadata_.nodeCount` | Number of child nodes |
| `metadata_.child_titles` | Titles of child nodes |

**Synthesis Influence:**
- Emits `[SUB_CANVAS]` marker
- WriterAgent uses canvas title as a **section heading**
- Child node titles treated as topic keywords for that section
- Canvas content is NOT recursively scraped (only described)

---

### `group` — Group / Container

| Field | Description |
|-------|-------------|
| `metadata_.color` | Accent color |

**Synthesis Influence:**
- Emits `[GROUP]` marker → used as a thematic section heading
- Structural only — no direct content contribution

---

## Frontend → Backend Type Mapping

| Frontend Node | Backend `type` field | `detect_content_type()` |
|---------------|---------------------|-------------------------|
| ArticleNode | `article` | Default / wiki |
| WebNode | `web` | Explicit |
| PdfNode | `pdf` | `*.pdf`, `/pdf/` URLs |
| ImageNode | `image` | `*.jpg`, `*.png`, Imgur etc. |
| CodeNode | `code` | GitHub, StackOverflow, npm URLs |
| NoteNode | `note` | Explicit |
| VideoNode | `video` | YouTube, Vimeo |
| AcademicNode | `academic` | arxiv, doi.org, pubmed |
| ProductNode | `product` | Amazon, eBay, shop |
| AnnotationNode | `annotation` | Explicit |
| CanvasNode | `canvas` | Explicit |
| GroupNode | `group` | Explicit |
| TextNode | `text` | Explicit |
| SynthesisNode | `synthesis` | Explicit |

---

## Synthesis Pipeline: Step-by-Step

### 1. Frontend — Synthesis trigger
The desktop/frontend sends a `POST /api/v1/synthesis/research-ast` with `context_items`:

```json
{
  "query": "Machine Learning in Healthcare",
  "context_items": [
    {
      "node_id": "n1",
      "node_type": "academic",
      "title": "Deep Learning for Medical Imaging",
      "url": "https://arxiv.org/abs/...",
      "content": "Abstract text...",
      "metadata": { "authors": ["Smith, J."], "year": "2023" }
    },
    {
      "node_id": "n2",
      "node_type": "image",
      "title": "MRI Scan Example",
      "url": "https://example.com/mri.png",
      "metadata": { "description": "3T MRI axial slice" }
    },
    {
      "node_id": "n3",
      "node_type": "code",
      "title": "Training Loop",
      "content": "for epoch in range(100):\n    train(model, data)",
      "metadata": { "language": "python" }
    },
    {
      "node_id": "n4",
      "node_type": "note",
      "title": "Key Insight",
      "content": "<p>Transfer learning reduces data requirements.</p>",
      "metadata": { "tags": ["transfer-learning", "insight"] }
    }
  ]
}
```

### 2. Backend — `chunk_service.segment_nodes()`

Each node type gets extracted differently:

| Node | Emitted Chunk Content |
|------|-----------------------|
| `academic` n1 | `[ACADEMIC_PAPER]\nAuthors: Smith, J.\nYear: 2023\nAbstract: ...` |
| `image` n2 | `[IMAGE]\nTitle: MRI Scan Example\nURL: https://...\nDescription: 3T MRI...` |
| `code` n3 | `[CODE:python]\n\`\`\`python\nfor epoch in range(100):...` |
| `note` n4 | `[RESEARCHER_NOTE]\nTransfer learning reduces data requirements.\nTags: transfer-learning, insight` |

### 3. WriterAgent

The LLM processes all 4 markers and produces:

```json
{
  "title": "Machine Learning in Healthcare",
  "abstract": "This paper synthesizes...",
  "sections": [
    {
      "id": "sec-1",
      "title": "Deep Learning Approaches",
      "content": [
        { "type": "paragraph", "data": { "text": "Smith et al. [1]...", "citations": ["1"] }},
        { "type": "figure", "data": { "path": "https://example.com/mri.png", "caption": "MRI Scan Example", "source_refs": [] }},
        { "type": "code_block", "data": { "language": "python", "code": "for epoch in range(100):\n    train(model, data)", "caption": "Training Loop", "source_refs": [] }},
        { "type": "quote", "data": { "text": "Transfer learning reduces data requirements.", "source_refs": [] }}
      ]
    }
  ],
  "references": [
    { "id": "1", "title": "Deep Learning for Medical Imaging", "url": "https://arxiv.org/abs/...", "authors": ["Smith, J."], "year": "2023" }
  ]
}
```

---

## Key Files

| File | Purpose |
|------|---------|
| [`chunk_service.py`](file:///c:\Users\zakau\Rabbit-Hole-OS\apps\backend\app\services\chunk_service.py) | Type-aware chunk extraction `_extract_chunk_for_type()` |
| [`document_ast.py`](file:///c:\Users\zakau\Rabbit-Hole-OS\apps\backend\app\services\document_ast.py) | AST schema including `CodeBlockBlock` |
| [`agents.py`](file:///c:\Users\zakau\Rabbit-Hole-OS\apps\backend\app\services\agents.py) | WriterAgent prompt with NODE TYPE MARKERS |
| [`synthesis.py`](file:///c:\Users\zakau\Rabbit-Hole-OS\apps\backend\app\api\v1\synthesis.py) | API endpoints, `ChunkedContextItem` schema |
| [`scraper.py`](file:///c:\Users\zakau\Rabbit-Hole-OS\apps\backend\app\services\scraper.py) | `detect_content_type()` auto-detection |
| [`nodes.py`](file:///c:\Users\zakau\Rabbit-Hole-OS\apps\backend\app\api\v1\nodes.py) | Node CRUD API |
