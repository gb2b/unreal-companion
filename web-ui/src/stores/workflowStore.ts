/**
 * Workflow Store - Zustand store for workflow state management
 * 
 * Manages:
 * - Active workflow sessions
 * - Chat history during workflows
 * - WebSocket connection for streaming
 * - Document generation state
 */

import { create } from 'zustand';

// === Types ===

export interface WorkflowInfo {
  id: string;
  name: string;
  description: string;
  agent: string;
  estimated_time: string;
}

export interface WorkflowSession {
  id: string;
  workflow_id: string;
  project_id: string;
  current_step: number;
  total_steps: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
  agent_id?: string;
  suggestions?: Suggestion[];
  celebration?: string;
}

export interface Suggestion {
  id: string;
  type: 'choice' | 'reference' | 'example' | 'follow_up';
  label: string;
  description?: string;
  key?: string;
}

export interface StepInfo {
  step_id: string;
  step_title: string;
  is_complete: boolean;
  next_step?: number;
  requires_input: boolean;
}

interface WorkflowState {
  // Available workflows
  workflows: WorkflowInfo[];
  
  // Active session
  activeSession: WorkflowSession | null;
  
  // Chat
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  
  // Current step
  currentStep: StepInfo | null;
  suggestions: Suggestion[];
  
  // Document being generated
  documentContent: string;
  documentPreview: boolean;
  
  // WebSocket
  ws: WebSocket | null;
  wsConnected: boolean;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
}

interface WorkflowActions {
  // Workflow management
  fetchWorkflows: () => Promise<void>;
  startWorkflow: (workflowId: string, projectId: string, projectPath: string) => Promise<void>;
  resumeSession: (sessionId: string, projectPath: string) => Promise<void>;
  
  // Chat
  sendMessage: (content: string, choices?: string[]) => void;
  executeAction: (action: 'continue' | 'edit' | 'elicit' | 'yolo' | 'party') => void;
  clearMessages: () => void;
  
  // WebSocket
  connectWebSocket: (sessionId: string, projectPath: string) => void;
  disconnectWebSocket: () => void;
  
  // UI
  toggleDocumentPreview: () => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: WorkflowState = {
  workflows: [],
  activeSession: null,
  messages: [],
  isStreaming: false,
  streamingContent: '',
  currentStep: null,
  suggestions: [],
  documentContent: '',
  documentPreview: false,
  ws: null,
  wsConnected: false,
  isLoading: false,
  error: null,
};

// === API helpers ===

const API_BASE = '/api/workflows';

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'API error');
  }
  
  return response.json();
}

// === Store ===

export const useWorkflowStore = create<WorkflowState & WorkflowActions>((set, get) => ({
  ...initialState,
  
  // === Workflow Management ===
  
  fetchWorkflows: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const workflows = await fetchApi<WorkflowInfo[]>('/');
      set({ workflows, isLoading: false });
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch workflows' 
      });
    }
  },
  
  startWorkflow: async (workflowId, projectId, projectPath) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetchApi<{
        session: WorkflowSession;
        step: StepInfo & { agent_message: string; suggestions: Suggestion[] };
      }>('/start', {
        method: 'POST',
        body: JSON.stringify({
          workflow_id: workflowId,
          project_id: projectId,
          project_path: projectPath,
        }),
      });
      
      // Create initial agent message
      const initialMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'agent',
        content: response.step.agent_message,
        timestamp: new Date().toISOString(),
        suggestions: response.step.suggestions,
      };
      
      set({
        activeSession: response.session,
        currentStep: response.step,
        suggestions: response.step.suggestions || [],
        messages: [initialMessage],
        isLoading: false,
      });
      
      // Connect WebSocket for streaming
      get().connectWebSocket(response.session.id, projectPath);
      
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to start workflow' 
      });
    }
  },
  
  resumeSession: async (sessionId, projectPath) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetchApi<{
        session: WorkflowSession;
        step: StepInfo & { agent_message: string; suggestions: Suggestion[] };
      }>(`/session/${sessionId}/resume?project_path=${encodeURIComponent(projectPath)}`, {
        method: 'POST',
      });
      
      // Create resume message
      const resumeMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'agent',
        content: response.step.agent_message,
        timestamp: new Date().toISOString(),
        suggestions: response.step.suggestions,
      };
      
      set({
        activeSession: response.session,
        currentStep: response.step,
        suggestions: response.step.suggestions || [],
        messages: [resumeMessage],
        isLoading: false,
      });
      
      // Connect WebSocket
      get().connectWebSocket(sessionId, projectPath);
      
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to resume session' 
      });
    }
  },
  
  // === Chat ===
  
  sendMessage: (content, choices) => {
    const { ws, wsConnected, activeSession, messages } = get();
    
    if (!ws || !wsConnected || !activeSession) {
      set({ error: 'Not connected to workflow session' });
      return;
    }
    
    // Add user message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    
    set({
      messages: [...messages, userMessage],
      isStreaming: true,
      streamingContent: '',
      suggestions: [],
    });
    
    // Send via WebSocket
    ws.send(JSON.stringify({
      type: 'message',
      content,
      choices,
      project_path: localStorage.getItem('currentProjectPath') || '',
    }));
  },
  
  executeAction: (action) => {
    const { ws, wsConnected, activeSession } = get();
    
    if (!ws || !wsConnected || !activeSession) {
      set({ error: 'Not connected to workflow session' });
      return;
    }
    
    set({ isLoading: true });
    
    ws.send(JSON.stringify({
      type: 'action',
      action,
      project_path: localStorage.getItem('currentProjectPath') || '',
    }));
  },
  
  clearMessages: () => {
    set({ messages: [], suggestions: [] });
  },
  
  // === WebSocket ===
  
  connectWebSocket: (sessionId, projectPath) => {
    const { ws } = get();
    
    // Close existing connection
    if (ws) {
      ws.close();
    }
    
    // Determine WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/workflows/ws/${sessionId}`;
    
    const newWs = new WebSocket(wsUrl);
    
    newWs.onopen = () => {
      set({ wsConnected: true });
      
      // Store project path for messages
      localStorage.setItem('currentProjectPath', projectPath);
    };
    
    newWs.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const { messages, streamingContent } = get();
      
      switch (data.type) {
        case 'chunk':
          // Append to streaming content
          set({ streamingContent: streamingContent + data.content });
          break;
          
        case 'complete':
          // Finalize message
          const agentMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: 'agent',
            content: get().streamingContent || data.full_response,
            timestamp: new Date().toISOString(),
          };
          
          set({
            messages: [...messages, agentMessage],
            isStreaming: false,
            streamingContent: '',
            activeSession: data.session ? {
              ...get().activeSession!,
              ...data.session,
            } : get().activeSession,
          });
          break;
          
        case 'action_result':
          // Handle action result
          const actionMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: 'agent',
            content: data.step.agent_message,
            timestamp: new Date().toISOString(),
            suggestions: data.step.suggestions,
            celebration: data.step.celebration,
          };
          
          set({
            messages: [...messages, actionMessage],
            currentStep: data.step,
            suggestions: data.step.suggestions || [],
            isLoading: false,
          });
          break;
          
        case 'error':
          set({ 
            error: data.message, 
            isStreaming: false,
            isLoading: false,
          });
          break;
          
        case 'pong':
          // Keepalive response
          break;
      }
    };
    
    newWs.onerror = () => {
      set({ wsConnected: false, error: 'WebSocket connection error' });
    };
    
    newWs.onclose = () => {
      set({ wsConnected: false });
    };
    
    set({ ws: newWs });
  },
  
  disconnectWebSocket: () => {
    const { ws } = get();
    if (ws) {
      ws.close();
      set({ ws: null, wsConnected: false });
    }
  },
  
  // === UI ===
  
  toggleDocumentPreview: () => {
    set({ documentPreview: !get().documentPreview });
  },
  
  setError: (error) => {
    set({ error });
  },
  
  reset: () => {
    get().disconnectWebSocket();
    set(initialState);
  },
}));
