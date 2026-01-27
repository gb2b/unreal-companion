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
  // New fields for UI organization
  category: 'document' | 'conversation' | 'agile' | 'dev' | 'board' | 'onboarding' | 'technical' | 'other';
  behavior: 'one-shot' | 'repeatable' | 'infinite' | 'system';
  ui_visible: boolean;
  icon: string;
  color: string;
  quick_action: boolean;
  document_order: number;
  suggested_after: string[];
}

export interface WorkflowSession {
  id: string;
  workflow_id: string;
  project_id: string;
  project_path?: string;  // Added for single-call optimization
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

// Step render data from backend (structured JSON for UI)
export interface StepRenderData {
  step_id: string;
  step_number: number;
  total_steps: number;
  title: string;
  agent: {
    id: string;
    name: string;
    avatar: string;
    color?: string;
  };
  intro_text: string;
  questions: Array<{
    id: string;
    type: string;
    label: string;
    required: boolean;
    placeholder?: string;
    options?: Array<{
      id: string;
      label: string;
      value: string;
      description?: string;
      icon?: string;
    }>;
    suggestions?: string[];
    help_text?: string;
  }>;
  suggestions: Suggestion[];
  prefilled: Record<string, string>;
  can_skip: boolean;
  skip_reason: string;
  is_complete: boolean;
  error?: string;
}

interface WorkflowState {
  // Available workflows
  workflows: WorkflowInfo[];
  
  // All sessions for current project (for Today view)
  projectSessions: WorkflowSession[];
  
  // Active session
  activeSession: WorkflowSession | null;
  activeWorkflow: WorkflowInfo | null;
  pendingWorkflow: WorkflowInfo | null;  // For immediate view switch
  
  // Chat
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  
  // Current step
  currentStep: StepInfo | null;
  currentStepData: StepRenderData | null;  // Complete step data from /start
  suggestions: Suggestion[];
  
  // Document being generated
  documentContent: string;
  documentPreview: boolean;
  
  // WebSocket
  ws: WebSocket | null;
  wsConnected: boolean;
  
  // Loading states
  isLoading: boolean;
  isStartStreaming: boolean;  // SSE streaming for /start
  streamingThoughts: string[];  // Thoughts from SSE during start
  error: string | null;
}

interface WorkflowActions {
  // Workflow management
  fetchWorkflows: () => Promise<void>;
  fetchProjectSessions: (projectId: string, projectPath: string) => Promise<void>;
  startWorkflow: (workflowId: string, projectId: string, projectPath: string) => Promise<void>;
  resumeSession: (sessionId: string, projectPath: string) => Promise<void>;
  
  // Chat
  sendMessage: (content: string, choices?: string[]) => void;
  executeAction: (action: 'continue' | 'edit' | 'elicit' | 'yolo' | 'party') => void;
  clearMessages: () => void;
  
  // WebSocket
  connectWebSocket: (sessionId: string, projectPath: string) => void;
  disconnectWebSocket: () => void;
  
  // Step data
  setCurrentStepData: (data: StepRenderData | null) => void;
  
  // UI
  toggleDocumentPreview: () => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: WorkflowState = {
  workflows: [],
  projectSessions: [],
  activeSession: null,
  activeWorkflow: null,
  pendingWorkflow: null,
  messages: [],
  isStreaming: false,
  streamingContent: '',
  currentStep: null,
  currentStepData: null,
  suggestions: [],
  documentContent: '',
  documentPreview: false,
  ws: null,
  wsConnected: false,
  isLoading: false,
  isStartStreaming: false,
  streamingThoughts: [],
  error: null,
};

// === API helpers ===

const API_BASE = '/api/workflows';

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  // Ensure proper path joining (API_BASE ends without slash, path starts with slash or is empty)
  const fullPath = path === '/' ? `${API_BASE}/` : `${API_BASE}${path}`;
  const response = await fetch(fullPath, {
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
  
  fetchProjectSessions: async (projectId: string, projectPath: string) => {
    try {
      const sessions = await fetchApi<WorkflowSession[]>(
        `/sessions/${encodeURIComponent(projectId)}?project_path=${encodeURIComponent(projectPath)}`
      );
      set({ projectSessions: sessions });
    } catch (error) {
      console.error('Failed to fetch project sessions:', error);
      set({ projectSessions: [] });
    }
  },
  
  startWorkflow: async (workflowId, projectId, projectPath) => {
    // Find the workflow to show pending state immediately
    const workflow = get().workflows.find(w => w.id === workflowId) || null;
    
    // Set pending state immediately for instant view switch + start streaming
    set({ 
      pendingWorkflow: workflow,
      isLoading: true,
      isStartStreaming: true,
      streamingThoughts: [],
      error: null,
      currentStepData: null,
    });
    
    // Store project path early for later use
    localStorage.setItem('currentProjectPath', projectPath);
    
    try {
      // Use SSE endpoint for streaming with thinking indicators
      const response = await fetch(`${API_BASE}/start/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow_id: workflowId,
          project_id: projectId,
          project_path: projectPath,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || 'Failed to start workflow');
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No response body');
      }
      
      let buffer = '';
      let sessionData: WorkflowSession | null = null;
      let stepData: StepRenderData | null = null;
      let stepResponse: (StepInfo & { agent_message: string; suggestions: Suggestion[] }) | null = null;
      
      // Process SSE stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            console.log('[Workflow] SSE stream complete');
            break;
          }
          
          try {
            const parsed = JSON.parse(data);
            
            switch (parsed.type) {
              case 'thinking':
                console.log('[Workflow] Thought:', parsed.content);
                set(state => ({
                  streamingThoughts: [...state.streamingThoughts, parsed.content],
                }));
                break;
                
              case 'session':
                console.log('[Workflow] Session received:', parsed.data.id);
                sessionData = {
                  ...parsed.data,
                  project_path: projectPath,
                };
                break;
                
              case 'step_data':
                console.log('[Workflow] Step data received');
                stepData = parsed.data;
                break;
                
              case 'step':
                console.log('[Workflow] Step response received');
                stepResponse = parsed.data;
                break;
                
              case 'error':
                console.error('[Workflow] SSE error:', parsed.content);
                throw new Error(parsed.content);
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
              // JSON parse error, ignore incomplete data
            } else {
              throw e;
            }
          }
        }
      }
      
      // Finalize state
      if (sessionData && stepResponse) {
        const initialMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'agent',
          content: stepResponse.agent_message,
          timestamp: new Date().toISOString(),
          suggestions: stepResponse.suggestions,
        };
        
        set({
          activeSession: sessionData,
          activeWorkflow: workflow,
          pendingWorkflow: null,
          currentStep: stepResponse,
          currentStepData: stepData,
          suggestions: stepResponse.suggestions || [],
          messages: [initialMessage],
          isLoading: false,
          isStartStreaming: false,
          streamingThoughts: [],
        });
        
        // Connect WebSocket for chat streaming
        get().connectWebSocket(sessionData.id, projectPath);
      } else {
        throw new Error('Incomplete response from server');
      }
      
    } catch (error) {
      set({ 
        pendingWorkflow: null,
        isLoading: false,
        isStartStreaming: false,
        streamingThoughts: [],
        error: error instanceof Error ? error.message : 'Failed to start workflow' 
      });
    }
  },
  
  resumeSession: async (sessionId, projectPath) => {
    // Set loading immediately for UI feedback
    set({ 
      isLoading: true, 
      isStartStreaming: true,
      streamingThoughts: ['Preparing workflow...'],
      error: null 
    });
    
    try {
      const response = await fetchApi<{
        session: WorkflowSession;
        step: StepInfo & { agent_message: string; suggestions: Suggestion[] };
        step_data?: StepRenderData;
      }>(`/session/${sessionId}/resume?project_path=${encodeURIComponent(projectPath)}`, {
        method: 'POST',
      });
      
      // Find the workflow for this session
      const { workflows } = get();
      const activeWorkflow = workflows.find(w => w.id === response.session.workflow_id) || null;
      
      // Create resume message
      const resumeMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'agent',
        content: response.step.agent_message || 'Session resumed.',
        timestamp: new Date().toISOString(),
        suggestions: response.step.suggestions,
      };
      
      set({
        activeSession: response.session,
        activeWorkflow,  // Set the workflow!
        pendingWorkflow: null,
        currentStep: response.step,
        currentStepData: response.step_data || null,
        suggestions: response.step.suggestions || [],
        messages: [resumeMessage],
        isLoading: false,
        isStartStreaming: false,
        streamingThoughts: [],
      });
      
      // Connect WebSocket
      get().connectWebSocket(sessionId, projectPath);
      
    } catch (error) {
      set({ 
        isLoading: false,
        isStartStreaming: false,
        streamingThoughts: [],
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
  
  // === Step Data ===
  
  setCurrentStepData: (data) => {
    set({ currentStepData: data });
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
