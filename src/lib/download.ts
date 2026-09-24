/**
 * Triggers a browser file save for in-memory text content - the first Blob-based download in
 * this codebase (Module 5's CSV/backup export). The backend returns file content as a JSON string
 * field rather than a raw file response (see import-export.service.ts), so the actual downloadable
 * file is built here, client-side, via an object URL and a synthetic anchor click.
 */
export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}
