import { useEffect, useRef } from 'react'
import { useLogsStore } from '@/stores/logsStore'
import { useConnectionStore } from '@/stores/connectionStore'

export function useWebSocket(projectId: string | null) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { addLog } = useLogsStore()
  const { setWsConnected, setStatus } = useConnectionStore()

  useEffect(() => {
    if (!projectId) return

    const connect = () => {
      const ws = new WebSocket(`ws://localhost:3179/ws/${projectId}`)
      wsRef.current = ws

      ws.onopen = () => {
        setWsConnected(true)
        addLog({ type: 'success', message: 'Connected to server' })
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          switch (data.type) {
            case 'log':
              addLog(data.payload)
              break
            case 'status':
              setStatus(data.payload)
              break
            case 'action_start':
              addLog({ 
                type: 'tool', 
                message: `Starting: ${data.payload.tool}`,
                tool: data.payload.tool,
                params: data.payload.params
              })
              break
            case 'action_end':
              addLog({ 
                type: data.payload.success ? 'success' : 'error',
                message: `${data.payload.tool}: ${data.payload.success ? 'Done' : 'Failed'}`,
                tool: data.payload.tool
              })
              break
          }
        } catch {
          console.error('Failed to parse WebSocket message')
        }
      }

      ws.onclose = () => {
        setWsConnected(false)
        
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, 3000)
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      wsRef.current?.close()
    }
  }, [projectId, addLog, setWsConnected, setStatus])
}
