# Library Redesign

**Date:** 2026-04-08
**Mockup:** `.superpowers/brainstorm/14787-1775681424/content/library-final-v4.html`
**Use the mockup HTML/CSS as the implementation reference — match it closely.**

---

## Layout

Three zones stacked vertically:

1. **Toolbar** — Search + Sort (Recent/Name/Status)
2. **Project Memory** — special card, always visible above tabs
3. **Tabs: Documents / References** — each with filter row + content grid

## Project Memory Card

- Gradient background (primary → card → accent, subtle)
- Glow effect (blur sphere top-right)
- Brain icon + "Project Memory" title + relative time
- One-line summary of project context
- Document pills: dots (green=complete, cyan=progress, grey=empty) + doc name + progress
- Click → opens project-context in editor
- Arrow indicator on hover

## Documents Tab

### "New Document" Banner
Full-width banner above the grid, below filters:
- Dashed border, "+" icon (primary tinted bg), "New Document" label, hint text right-aligned
- Hover: border becomes primary, label colors up
- Click → navigate to Workshop

### Filter Row
Below tab bar:
- Tag pills: All | concept | design | technical | production
- Separator
- Status pills: In Progress | Complete | Empty
- AND logic, toggleable, primary colored when active

### Date Groups
Documents grouped by date: "Today" / "Earlier this week" / "Last week" / date

### Document Cards
Responsive grid (`repeat(auto-fill, minmax(270px, 1fr))`).

Each card:
- **Preview zone** (100px): first lines of markdown with syntax coloring (headers=primary, bold=lighter). Monospace 9px. Gradient fade. Empty = "No content yet" centered.
- **Body**: status badge (3/7, Done, Empty) + menu ⋯ + doc name + description + footer (category pill + date)
- **Left border**: 3px — cyan=in_progress, green=complete, none=empty
- **"Last worked on" badge**: on most recently edited card, top-right, glassmorphism
- **"Continue ›" button**: visible on in_progress cards, next to status badge
- Hover: translateY(-1px), shadow

## References Tab

### Filter Row
Type pills: All | Images | PDFs | Documents | Other (with emojis)

### Reference Cards
Responsive grid (`repeat(auto-fill, minmax(200px, 1fr))`).

Each card:
- **Preview zone** (90px):
  - Images: actual thumbnail (object-fit cover)
  - PDFs: red gradient + "PDF" watermark + text snippet
  - Markdown: blue gradient + "MD" watermark + text snippet
- **Body**: filename + file size + type pill (colored per type)
- Hover: same lift effect

### Upload Drop Zone
Below grid. Dashed border, "Drop files here or browse". Hover: primary tint.

## Colors by File Type

| Type | Preview gradient | Pill | Watermark |
|------|-----------------|------|-----------|
| Image | purple 280°→320° | purple | — (actual image) |
| PDF | red 0°→15° | red | "PDF" |
| Markdown | blue 210°→220° | blue | "MD" |
| Other | grey | grey | extension |

## Components

| Component | Purpose |
|-----------|---------|
| `DocumentsLibrary.tsx` | Main: toolbar, memory, tabs, filters, grids |
| `ProjectContextCard.tsx` | Memory card (gradient, pills, summary) |
| `DocumentCard.tsx` | Doc card with preview + body + continue |
| `ReferenceCard.tsx` | Ref card with type-specific preview |

## Data Sources

- Project Memory: `GET /api/v2/studio/project-context`
- Documents: `GET /api/v2/studio/documents` filtered by `!tags.includes('reference')`
- References: same endpoint filtered by `tags.includes('reference')`
- Doc preview text: `document.content` (first ~300 chars)
- Ref thumbnails: `GET /api/v2/studio/references/{filename}`
- Ref text snippets: `meta.index.summary` or extracted text

## Interactions

- Click doc card → `/studio/doc/{docId}`
- Click "Continue" → `/studio/build/{workflowId}`
- Click "New Document" banner → Workshop
- Click ref card → viewer or download
- Click Project Memory → `/studio/doc/__project-context__`
- Click upload zone → file picker
- Tabs: Documents ↔ References
- Filter pills: toggle on/off
