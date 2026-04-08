# Library Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Library view with proper visual hierarchy — Project Memory card, tabbed Documents/References with previews, filters, date grouping, continue buttons, and "last worked on" badge.

**Architecture:** Rewrite 4 React components (ProjectContextCard, DocumentCard, ReferenceCard [new], DocumentsLibrary) using the mockup at `.superpowers/brainstorm/14787-1775681424/content/library-final-v4.html` as the CSS/layout reference. No backend changes — same API endpoints.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, lucide-react

**Mockup reference:** `.superpowers/brainstorm/14787-1775681424/content/library-final-v4.html` — open this file and match the CSS closely.

---

### Task 1: ProjectContextCard redesign

**Files:**
- Modify: `web-ui/src/components/studio/Dashboard/ProjectContextCard.tsx`

- [ ] **Step 1: Rewrite ProjectContextCard**

Rewrite the component to match the mockup's memory card design. The component already has the right props and API calls — just the JSX/styling needs updating.

Key visual elements from mockup:
- `relative overflow-hidden rounded-[10px]` with `border border-primary/[0.12]`
- `background: linear-gradient(135deg, primary/[0.03], card, accent/[0.02])`
- Glow: absolute div top-right, `bg-primary/[0.06] blur-[40px] rounded-full`
- Arrow `›` absolute top-right, hover → translateX + primary color
- Header: 34px icon (rounded-lg, bg-primary/10) + title "Project Memory" + relative time
- Summary line (12px, muted)
- Doc pills: rounded-full, bg `hsl(220 20% 10%)`, border, 10px text, colored dots (6px circles)
- Hover: border-primary/25, shadow

READ the existing file first, keep the data fetching logic, replace only the JSX return.

- [ ] **Step 2: Verify it compiles**

Run: `cd web-ui && npx tsc --noEmit --pretty 2>&1 | head -10`

- [ ] **Step 3: Commit**

```bash
git add web-ui/src/components/studio/Dashboard/ProjectContextCard.tsx
git commit -m "feat(web-ui): redesign ProjectContextCard — gradient, glow, doc pills"
```

---

### Task 2: DocumentCard redesign with preview

**Files:**
- Modify: `web-ui/src/components/studio/Dashboard/DocumentCard.tsx`

- [ ] **Step 1: Rewrite DocumentCard**

Rewrite to match mockup. Key elements:

**Structure:**
```
<div class="doc-card"> <!-- border-left colored by status -->
  <span class="last-worked">● Last worked on</span> <!-- conditional -->
  <div class="doc-preview"> <!-- or empty-preview -->
    <div class="doc-preview-text">markdown preview</div>
  </div>
  <div class="doc-body">
    <div class="doc-top">status badge + continue btn + menu</div>
    <div class="doc-name">title</div>
    <div class="doc-desc">description</div>
    <div class="doc-footer">category pill + date</div>
  </div>
</div>
```

**Preview zone** (100px height):
- Has content: show first ~300 chars of `document.content` in monospace 9px, with `##` headers colored primary and `**bold**` colored lighter. Use simple regex to add spans. Gradient fade at bottom (`linear-gradient(to top, card, transparent)` via `::after` pseudo or a div).
- Empty: centered "No content yet" in dim text

**"Last worked on" badge**: show on the document with the most recent `meta.updated`. Pass `isLastWorked` as a prop from the parent.

**"Continue ›" button**: shown only on in_progress cards, next to the status badge. Navigates to `/studio/build/{workflowId}`.

**Left border**: `border-l-[3px] border-primary` for in_progress, `border-l-[3px] border-accent` for complete.

**Date formatting**: "4h ago" for today, "Tuesday" for this week, "Mar 5" for older.

READ the existing file — keep `DocumentActionMenu`, `getFileTypeIcon`, `formatBytes` etc. Rewrite the card JSX.

- [ ] **Step 2: Verify compilation**

Run: `cd web-ui && npx tsc --noEmit --pretty 2>&1 | head -10`

- [ ] **Step 3: Commit**

```bash
git add web-ui/src/components/studio/Dashboard/DocumentCard.tsx
git commit -m "feat(web-ui): redesign DocumentCard — preview zone, continue button, last-worked badge"
```

---

### Task 3: New ReferenceCard component

**Files:**
- Create: `web-ui/src/components/studio/Dashboard/ReferenceCard.tsx`

- [ ] **Step 1: Create ReferenceCard**

New component for reference files in the References tab. Match mockup.

**Props:**
```tsx
interface ReferenceCardProps {
  document: StudioDocument
  projectPath: string
  onClick: () => void
  onDeleted?: () => void
}
```

**Preview zone** (90px):
- Image (`tags.includes('image')`): `<img>` with `object-fit: cover`, src = `/api/v2/studio/references/{filename}?project_path=...`
- PDF: gradient bg `hsl(0 30% 12%) → hsl(15 30% 15%)`, large "PDF" watermark at 20px 15% opacity, text snippet overlay
- Markdown/Doc: gradient bg `hsl(210 30% 12%) → hsl(220 30% 15%)`, "MD" watermark, text snippet
- Text snippet: from `meta.index?.summary` or `meta.summary`, 8px monospace, 50% opacity

**Body:**
- Filename (12px, medium)
- Footer: file size + type pill (colored: IMG=purple, PDF=red, MD=blue)

**Type pill colors:**
- IMG: `bg-[hsl(280_40%_20%)] text-[hsl(280_60%_70%)]`
- PDF: `bg-[hsl(0_50%_20%)] text-[hsl(0_70%_65%)]`
- MD: `bg-[hsl(210_40%_20%)] text-[hsl(210_60%_70%)]`

- [ ] **Step 2: Verify compilation**

Run: `cd web-ui && npx tsc --noEmit --pretty 2>&1 | head -10`

- [ ] **Step 3: Commit**

```bash
git add web-ui/src/components/studio/Dashboard/ReferenceCard.tsx
git commit -m "feat(web-ui): add ReferenceCard with type-specific preview (image/PDF/doc)"
```

---

### Task 4: DocumentsLibrary rewrite — tabs, filters, date groups, banner

**Files:**
- Modify: `web-ui/src/components/studio/Dashboard/DocumentsLibrary.tsx`

- [ ] **Step 1: Rewrite DocumentsLibrary**

This is the main container. Major restructure from the current flat grid to tabs + filters + date groups.

**State:**
```tsx
const [activeTab, setActiveTab] = useState<'docs' | 'refs'>('docs')
const [docFilters, setDocFilters] = useState<{ tags: string[], status: string[] }>({ tags: [], status: [] })
const [refFilters, setRefFilters] = useState<{ types: string[] }>({ types: [] })
```

**Data splitting:**
```tsx
const workflowDocs = documents.filter(d => !(d.meta?.tags || []).includes('reference'))
const references = documents.filter(d => (d.meta?.tags || []).includes('reference'))
```

**"Last worked on" detection:**
```tsx
const lastWorkedId = workflowDocs
  .filter(d => d.meta?.status === 'in_progress')
  .sort((a, b) => (b.meta?.updated || '').localeCompare(a.meta?.updated || ''))
  [0]?.id || null
```

**Date grouping** for documents:
```tsx
function groupByDate(docs): Array<{ label: string, docs: StudioDocument[] }>
```
Groups: "Today" / "Yesterday" / "Earlier this week" / "Last week" / month name

**Layout (from top to bottom):**
1. Toolbar: search input + sort group (no + New button — it's in the banner)
2. ProjectContextCard
3. Tabs row: Documents | References (with counts)
4. [If docs tab]: Filter row (tag pills + status pills) → New Document banner → date groups with DocumentCard grids
5. [If refs tab]: Filter row (type pills) → ReferenceCard grid → Upload drop zone

**Filter row:** pills with toggle. "All" is active by default. When a specific filter is active, "All" deactivates. Filter logic:
- Tags: AND with status. Empty = show all.
- Status: filter by `meta.status`
- Ref types: filter by tag (image/document/asset-3d)

**New Document banner:** full-width div above the first date group. Dashed border, "+" icon with primary/10 bg, "New Document" text, hint text. Click → `onGoToWorkshop()`.

**Upload drop zone** (refs tab): dashed border div below refs grid. Click → open AttachModal or native file picker.

READ the existing DocumentsLibrary.tsx — keep `TagFilter`, `TagManager`, `AttachModal` integration. Replace the grid rendering.

- [ ] **Step 2: Verify compilation**

Run: `cd web-ui && npx tsc --noEmit --pretty 2>&1 | head -10`

- [ ] **Step 3: Commit**

```bash
git add web-ui/src/components/studio/Dashboard/DocumentsLibrary.tsx
git commit -m "feat(web-ui): redesign Library — tabs, filters, date groups, new-doc banner, ref grid"
```

---

### Task 5: Final verification + cleanup

- [ ] **Step 1: TypeScript check**

Run: `cd web-ui && npx tsc --noEmit --pretty`
Expected: no errors

- [ ] **Step 2: Remove unused imports/components**

Check if `TagFilter.tsx` is still used (filters are now inline). If not, keep it for now — don't delete working code unless it causes issues.

- [ ] **Step 3: Visual check**

Start dev server: `cd web-ui && npm run dev`
Open Library view and verify:
- Memory card renders with gradient + pills
- Documents tab: filters, banner, date groups, cards with previews
- References tab: filters, cards with type previews, upload zone
- Continue button works on in_progress cards
- "Last worked on" badge shows on most recent card
- Filters toggle and filter correctly

- [ ] **Step 4: Commit any fixes**

```bash
git add -A web-ui/src/
git commit -m "fix(web-ui): Library redesign polish and cleanup"
```
