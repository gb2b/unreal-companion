/**
 * useStreamingResponse - Hook for handling SSE streaming responses from LLM
 * 
 * Features:
 * - Connects to SSE endpoint
 * - Accumulates thinking events (for ThinkingIndicator)
 * - Accumulates token events (for StreamingText)
 * - Handles complete and error events
 * - Auto-cleanup on unmount
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface StreamState {
  // Content
  text: string;
  thoughts: string[];
  
  // State
  isStreaming: boolean;
  isComplete: boolean;
  error: string | null;
  
  // Final data (step JSON when streaming complete)
  finalData: Record<string, unknown> | null;
}

interface UseStreamingResponseReturn extends StreamState {
  startStream: (url: string) => void;
  reset: () => void;
}

const initialState: StreamState = {
  text: '',
  thoughts: [],
  isStreaming: false,
  isComplete: false,
  error: null,
  finalData: null,
};

export function useStreamingResponse(): UseStreamingResponseReturn {
  const [state, setState] = useState<StreamState>(initialState);
  const eventSourceRef = useRef<EventSource | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const startStream = useCallback((url: string) => {
    // Cleanup previous connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Reset state
    setState({
      ...initialState,
      isStreaming: true,
    });

    console.log('[Streaming] Starting SSE connection to:', url);

    // Create EventSource
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      if (!mountedRef.current) return;

      // Handle [DONE] signal
      if (event.data === '[DONE]') {
        console.log('[Streaming] Stream complete');
        eventSource.close();
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          isComplete: true,
        }));
        return;
      }

      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'thinking':
            console.log('[Streaming] Thought:', data.content);
            setState((prev) => ({
              ...prev,
              thoughts: [...prev.thoughts, data.content],
            }));
            break;

          case 'token':
            setState((prev) => ({
              ...prev,
              text: prev.text + data.content,
            }));
            break;

          case 'complete':
            console.log('[Streaming] Complete with data:', data.data);
            setState((prev) => ({
              ...prev,
              finalData: data.data,
              isComplete: true,
            }));
            break;

          case 'error':
            console.error('[Streaming] Error:', data.content);
            setState((prev) => ({
              ...prev,
              error: data.content,
              isStreaming: false,
            }));
            eventSource.close();
            break;

          default:
            console.warn('[Streaming] Unknown event type:', data.type);
        }
      } catch (e) {
        console.error('[Streaming] Failed to parse SSE event:', e, event.data);
      }
    };

    eventSource.onerror = (error) => {
      if (!mountedRef.current) return;

      console.error('[Streaming] SSE error:', error);
      eventSource.close();
      setState((prev) => ({
        ...prev,
        isStreaming: false,
        error: 'Connection lost',
      }));
    };
  }, []);

  const reset = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setState(initialState);
  }, []);

  return {
    ...state,
    startStream,
    reset,
  };
}

export default useStreamingResponse;
