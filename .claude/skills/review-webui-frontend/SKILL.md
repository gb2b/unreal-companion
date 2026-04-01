---
name: review-webui-frontend
description: Audit a Web UI frontend component for React patterns, Zustand usage, Tailwind CSS, TypeScript types, and accessibility. Use this when reviewing UI code, checking component quality, after modifying frontend files, or when the user mentions 'review UI', 'check component', or 'frontend audit'.
---

# Review a Web UI Frontend Component

Complete audit of a React component in the Unreal Companion Studio.

## Usage

Provide the component name or path to audit (e.g. `TaskPanel` or `src/components/tasks/TaskPanel.tsx`).

## Audit Checklist

### 1. React patterns

- [ ] No unnecessary `useState` for data that belongs in a store
- [ ] `useEffect` has correct dependency array (no missing deps, no infinite loops)
- [ ] No direct DOM manipulation (`document.getElementById`, etc.)
- [ ] Event handlers defined outside JSX where possible (not `() => () => ...`)
- [ ] Keys in lists are stable and unique (not array index for mutable lists)
- [ ] No `useEffect` used for derived data (use `useMemo` or compute inline)
- [ ] Async operations in `useEffect` properly cleaned up or cancelled

### 2. Zustand usage

- [ ] State shared across components is in a store, not duplicated
- [ ] Selectors used for individual fields: `useStore(s => s.field)` not `useStore()`
- [ ] No store state copied into local `useState` unless intentional (form editing)
- [ ] Actions are in the store, not inline in components
- [ ] `persist` middleware only used when localStorage persistence is intentional
- [ ] No over-fetching: `fetchX()` called once at the right level, not in every consumer

### 3. Tailwind CSS

- [ ] No inline `style=` for values that can be expressed with Tailwind
- [ ] Responsive modifiers used where the layout changes on small screens (`sm:`, `md:`)
- [ ] Consistent spacing scale (avoid mixing `p-2` and `p-[9px]`)
- [ ] No duplicate/conflicting classes (e.g. `flex flex-col flex flex-row`)
- [ ] `className` prop accepted on wrapper for composability
- [ ] Dark mode handled if the rest of the app uses it

### 4. TypeScript

- [ ] No `any` types — use proper interfaces or `unknown` with type guards
- [ ] Props interface explicitly defined (not inlined as object literal)
- [ ] Event handler types correct (`React.ChangeEvent<HTMLInputElement>`, etc.)
- [ ] No `as` type casts without a comment explaining why
- [ ] Optional props properly typed (`: string | undefined` or `?: string`)
- [ ] Return type inferred (no need to annotate `JSX.Element` explicitly)

### 5. Accessibility

- [ ] Interactive elements are `<button>`, `<a>`, or have `role` + `tabIndex`
- [ ] Buttons have accessible label: text content, `aria-label`, or `aria-labelledby`
- [ ] Images have `alt` attribute (empty string `alt=""` for decorative images)
- [ ] Form inputs have associated `<label>` or `aria-label`
- [ ] Focus visible: no `outline-none` without a custom focus ring
- [ ] Color contrast sufficient (text readable on background)

### 6. Performance

- [ ] `React.memo()` used for components that re-render with unchanged props in hot paths
- [ ] `useMemo` / `useCallback` used only where there is a measurable benefit (not preemptively)
- [ ] Large lists use virtualization if > 100 items
- [ ] No heavy computation in render body without `useMemo`
- [ ] Images/assets lazy-loaded if below the fold

## Common issues in this codebase

- Fetching data inside a component that renders in a list (should fetch in parent)
- Full store subscription `useStore()` causing unnecessary re-renders
- Missing `fetchItems()` call or duplicate calls across sibling components
- `useEffect` with empty `[]` that should depend on a prop (e.g. `projectId`)

## Report format

Produce a report with:
- **Score**: X/6 categories OK
- **Issues**: list with severity (CRITICAL, WARNING, INFO)
- **Fixes**: prioritized list of changes

## Useful commands

```bash
# TypeScript check
cd web-ui && npx tsc --noEmit

# Build check
cd web-ui && npm run build

# Start dev to test interactively
cd web-ui && npm run dev:all
```
