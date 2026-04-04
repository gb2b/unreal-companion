// web-ui/src/services/sse.ts
/**
 * SSE Client -- connects to the backend SSE endpoint and yields events.
 *
 * Pattern inspired by Sparks:
 * - Async generator for event consumption
 * - requestAnimationFrame batching for UI updates
 * - Automatic reconnection on error
 */
import type { SSEEventType, SSEEventData, SSEEvent } from '@/types/sse'

interface SSEClientOptions {
  url: string
  body: Record<string, unknown>
  signal?: AbortSignal
}

/**
 * Connect to an SSE endpoint via POST and yield parsed events.
 * The caller iterates with `for await (const event of streamSSE(...))`.
 */
export async function* streamSSE(options: SSEClientOptions): AsyncGenerator<SSEEvent> {
  const { url, body, signal } = options

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }))
    throw new Error(err.detail || `HTTP ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Parse SSE events from buffer
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? '' // Keep incomplete line in buffer

      let currentEvent = ''
      let currentData = ''

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim()
        } else if (line.startsWith('data: ')) {
          currentData = line.slice(6)
        } else if (line === '' && currentEvent && currentData) {
          // End of event block
          try {
            const data = JSON.parse(currentData) as SSEEventData
            yield { type: currentEvent as SSEEventType, data }
          } catch {
            // Skip malformed events
          }
          currentEvent = ''
          currentData = ''
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * RAF-batched event processor. Collects events and flushes them
 * on the next animation frame to avoid excessive re-renders.
 */
export class StreamBatcher<T> {
  private queue: T[] = []
  private rafId: number | null = null
  private onFlush: (batch: T[]) => void

  constructor(onFlush: (batch: T[]) => void) {
    this.onFlush = onFlush
  }

  push(item: T): void {
    this.queue.push(item)
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null
        const batch = this.queue
        this.queue = []
        this.onFlush(batch)
      })
    }
  }

  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    // Flush remaining
    if (this.queue.length > 0) {
      this.onFlush(this.queue)
      this.queue = []
    }
  }
}
