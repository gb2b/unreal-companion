// web-ui/src/lib/docId.ts
/**
 * Generate a dated doc_id for a new document.
 *
 * Format: `{workflowId}-{YYYY-MM-DD}`, with an incrementing suffix (`-2`, `-3`, ...)
 * if a document with the same id already exists on the same day.
 *
 * Falls back to the base id without a suffix if the document list can't be fetched.
 */
export async function generateDatedDocId(
  workflowId: string,
  projectPath: string
): Promise<string> {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const base = `${workflowId}-${today}`

  try {
    const res = await fetch(
      `/api/v2/studio/documents?project_path=${encodeURIComponent(projectPath)}`
    )
    if (!res.ok) return base
    const data = await res.json()
    const ids = new Set<string>(
      (data.documents || []).map((d: { id: string }) => d.id)
    )

    if (!ids.has(base)) return base

    let n = 2
    while (ids.has(`${base}-${n}`)) n++
    return `${base}-${n}`
  } catch {
    return base
  }
}
