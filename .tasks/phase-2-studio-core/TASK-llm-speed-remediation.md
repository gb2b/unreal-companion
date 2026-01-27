# TASK: LLM Speed Remediation (Workflow + Chat)

## Statut

- **Priorité** : Critical
- **Phase** : 2 - Studio Core
- **Dépendances** : P2.0, P2.6, P2.7, P2.10
- **Date création** : 2026-01-26
- **Dernière révision** : 2026-01-26

---

## Résumé Exécutif

Cette task adresse les **régressions critiques** identifiées lors de la review architecturale du web-ui. L'objectif principal est d'atteindre une **vitesse perçue comparable à Cursor** en réduisant drastiquement le temps avant le premier feedback visible (TTFT).

### Objectifs Quantifiables

| Métrique | Baseline Estimé | Objectif | Amélioration |
|----------|-----------------|----------|--------------|
| Time to First Token (TTFT) | ~3-5s | < 1s | -70% |
| Appels LLM au start | 2 | 1 | -50% |
| Taille contexte (tokens) | ~10000 | < 3000 | -70% |
| Coût par session | 100% | 60% | -40% |

---

## Problèmes Identifiés (Review)

### Vue d'Ensemble

| # | Problème | Impact | Sévérité | Root Cause |
|---|----------|--------|----------|------------|
| 1 | Double appel LLM au démarrage | Latence x2, coût x2 | 🔴 Critical | `/start` puis `/step` séparément |
| 2 | Pas de streaming frontend | UX "freeze", TTFT perçu trop long | 🔴 Critical | Frontend attend réponse complète |
| 3 | Contexte trop volumineux | Tokens gaspillés, réponses lentes | 🔴 Critical | Documents entiers dans prompts |
| 4 | Deux systèmes workflow | Code dupliqué, confusion | 🟠 High | WebSocket chat + REST steps |
| 5 | i18n incomplète | Strings FR/EN mélangées | 🟠 High | Pas de process d'audit |
| 6 | Knowledge context mal branché | Contexte vide ou cache cassé | 🟡 Medium | `project_path` au lieu de `project_id` |

### Détail des Problèmes

#### Problème 1 : Double Appel LLM

**Flux Actuel (Mauvais)**
```
User clique "Start"
    │
    ▼
POST /api/workflows/start ──────► Appel LLM #1 (création session)
    │
    │  returns session_id
    ▼
GET /api/workflows/{id}/step ───► Appel LLM #2 (render step)
    │
    │  returns step_data
    ▼
Frontend affiche step
```

**Problème** : 2 appels LLM pour afficher le premier step = latence doublée.

**Preuve** : Dans `WorkflowStepContainer.tsx`:
```typescript
useEffect(() => {
  if (activeSession && activeSession.id !== lastSessionIdRef.current) {
    fetchStep()  // ← Appel LLM #2 systématique
  }
}, [activeSession, fetchStep])
```

#### Problème 2 : Pas de Streaming Frontend

**Symptôme** : L'utilisateur voit un spinner pendant 3-5 secondes sans feedback.

**Cause** : Le backend supporte le streaming mais le frontend :
1. N'utilise pas SSE (Server-Sent Events)
2. Attend la réponse JSON complète
3. N'affiche rien pendant la génération

**Code Actuel** :
```typescript
// workflowStore.ts - attend la réponse complète
const response = await api.get(`/api/workflows/session/${sessionId}/step`)
set({ currentStepData: response.data })
```

#### Problème 3 : Contexte Trop Volumineux

**Mesure estimée** : ~10000 tokens de contexte moyen

**Contenu envoyé actuellement** :
- Brief complet (2000-5000 tokens)
- GDD complet (10000-20000 tokens si existant)
- Historique conversation
- Instructions système

**Impact** :
- TTFT plus long (plus de tokens à traiter)
- Coût élevé (facturé au token)
- Risque de dépassement de limite

#### Problème 4 : Systèmes Dual Workflow

**Architecture Actuelle (Confusion)**
```
┌─────────────────┐         ┌─────────────────┐
│  workflowStore  │         │  workflowStore  │
│  (mode chat)    │         │  (mode step)    │
│                 │         │                 │
│ - WebSocket     │         │ - REST API      │
│ - Messages[]    │         │ - StepData      │
│ - streaming     │         │ - submit        │
└────────┬────────┘         └────────┬────────┘
         │                           │
         └─────────┬─────────────────┘
                   │
                   ▼
            Code dupliqué,
            maintenance difficile
```

#### Problème 5 : i18n Incomplète

**Exemples de strings hardcodées** :
```typescript
// WorkflowStepContainer.tsx
<span>Démarrage...</span>
<span>Préparation du workflow...</span>

// SuggestionCards.tsx
<p>Choisissez une option</p>

// AgentChatPanel.tsx
"L'agent réfléchit..."
```

#### Problème 6 : Knowledge Context Mal Branché

**Bug identifié dans** `engine.py`:
```python
# INCORRECT :
context = await knowledge_service.build_context(project_id=project_path)

# CORRECT :
context = await knowledge_service.build_context(project_id=project_id)
```

**Impact** : Le cache facts ne fonctionne pas car la clé est incorrecte.

---

## Sous-Tasks

### Vue d'Ensemble

| # | Sous-task | Priorité | Complexité | Durée | Dépendances |
|---|-----------|----------|------------|-------|-------------|
| 0 | Instrumentation Baseline | 🔴 Critical | Basse | 0.5j | - |
| A | Nettoyage Dual Workflow | 🔴 Critical | Moyenne | 1.5j | 0 |
| B | Single Call au Start | 🔴 Critical | Moyenne | 1j | A |
| C | Streaming + Thinking UI | 🔴 Critical | Haute | 3j | B |
| D | Contexte Compact | 🟠 High | Moyenne | 2j | B |
| E | Compléter i18n | 🟡 Medium | Basse | 1j | C |

**Total estimé : 9 jours**

### Graphe de Dépendances

```
[0] Instrumentation Baseline
         │
         ▼
[A] Nettoyage Dual Workflow
         │
         ├──────────────────────┐
         ▼                      ▼
[B] Single Call            [E] i18n
         │                      │
         ├──────────┐           │
         ▼          ▼           │
[C] Streaming   [D] Contexte    │
         │          │           │
         └──────────┴───────────┘
                    │
                    ▼
              ✅ DONE
```

---

## Sous-Task 0 : Instrumentation Baseline

### Objectif

Mesurer l'état actuel **AVANT** toute modification pour :
1. Quantifier les améliorations
2. Identifier les goulots d'étranglement
3. Établir des objectifs réalistes

### Métriques à Capturer

| Métrique | Description | Où mesurer | Comment |
|----------|-------------|------------|---------|
| TTFT | Time to First Token | Backend + Frontend | Timestamp start → 1er chunk |
| TTC | Time to Complete | Frontend | Start → réponse complète |
| Input Tokens | Tokens envoyés au LLM | Backend | Count avant appel |
| Output Tokens | Tokens reçus du LLM | Backend | Count après appel |
| Context Size | Taille du contexte | Backend | Len(context_string) |
| Calls/Session | Appels LLM par session | Backend | Counter |
| Cache Hit Rate | Efficacité du cache | Backend | hits / (hits + misses) |

### Fichiers à Créer

| Fichier | Description |
|---------|-------------|
| `server/services/metrics.py` | Service de métriques singleton |
| `server/api/metrics.py` | Endpoints API pour rapports |
| `src/hooks/useMetrics.ts` | Hook frontend pour TTFT perçu |

### Spécifications Techniques

#### Backend : `metrics.py`

```python
# server/services/metrics.py

import time
import logging
import statistics
from dataclasses import dataclass, field
from typing import Optional, Literal
from datetime import datetime
import json

logger = logging.getLogger("metrics")

TaskType = Literal[
    "workflow_start",
    "step_render", 
    "facts_extraction",
    "chat_response",
    "document_generation"
]

@dataclass
class LLMCallMetrics:
    """Métriques d'un appel LLM individuel"""
    
    # Identifiants
    session_id: str
    call_id: str
    task_type: TaskType
    
    # Timing
    start_time: float = field(default_factory=time.time)
    time_to_first_token: Optional[float] = None
    time_to_complete: Optional[float] = None
    
    # Tokens
    input_tokens: int = 0
    output_tokens: int = 0
    context_size_chars: int = 0
    context_size_tokens: int = 0  # Estimé : chars / 4
    
    # Provider info
    provider: str = ""
    model: str = ""
    
    # Status
    success: bool = True
    error_message: Optional[str] = None
    
    def mark_first_token(self):
        """Marque la réception du premier token"""
        if self.time_to_first_token is None:
            self.time_to_first_token = time.time() - self.start_time
    
    def mark_complete(
        self, 
        input_tokens: int, 
        output_tokens: int,
        success: bool = True,
        error: str = None
    ):
        """Marque la fin de l'appel et log les métriques"""
        self.time_to_complete = time.time() - self.start_time
        self.input_tokens = input_tokens
        self.output_tokens = output_tokens
        self.success = success
        self.error_message = error
        self._log()
    
    def _log(self):
        """Log structuré pour analyse"""
        log_data = {
            "event": "LLM_CALL",
            "session_id": self.session_id,
            "call_id": self.call_id,
            "task_type": self.task_type,
            "ttft": round(self.time_to_first_token, 3) if self.time_to_first_token else None,
            "ttc": round(self.time_to_complete, 3) if self.time_to_complete else None,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "context_chars": self.context_size_chars,
            "context_tokens_est": self.context_size_tokens,
            "provider": self.provider,
            "model": self.model,
            "success": self.success,
            "error": self.error_message,
            "timestamp": datetime.now().isoformat()
        }
        
        if self.success:
            logger.info(json.dumps(log_data))
        else:
            logger.error(json.dumps(log_data))
    
    def to_dict(self) -> dict:
        """Sérialise pour API"""
        return {
            "session_id": self.session_id,
            "call_id": self.call_id,
            "task_type": self.task_type,
            "ttft": self.time_to_first_token,
            "ttc": self.time_to_complete,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "context_size_chars": self.context_size_chars,
            "provider": self.provider,
            "model": self.model,
            "success": self.success
        }


class MetricsCollector:
    """
    Collecteur de métriques singleton.
    
    Stocke les métriques en mémoire pour la session serveur.
    Pour persistance, utiliser le logging structuré.
    """
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._calls: list[LLMCallMetrics] = []
            cls._instance._cache_stats = {"hits": 0, "misses": 0}
            cls._instance._session_start = time.time()
        return cls._instance
    
    def new_call(
        self, 
        session_id: str,
        task_type: TaskType,
        provider: str = "",
        model: str = "",
        context_size: int = 0
    ) -> LLMCallMetrics:
        """Crée une nouvelle métrique d'appel"""
        call = LLMCallMetrics(
            session_id=session_id,
            call_id=f"{session_id}_{len(self._calls)}",
            task_type=task_type,
            provider=provider,
            model=model,
            context_size_chars=context_size,
            context_size_tokens=context_size // 4
        )
        self._calls.append(call)
        return call
    
    def record_cache_hit(self):
        """Enregistre un cache hit"""
        self._cache_stats["hits"] += 1
    
    def record_cache_miss(self):
        """Enregistre un cache miss"""
        self._cache_stats["misses"] += 1
    
    def get_baseline_report(self) -> dict:
        """
        Génère un rapport baseline des métriques.
        
        Returns:
            dict avec statistiques agrégées
        """
        if not self._calls:
            return {
                "error": "No calls recorded",
                "uptime_seconds": time.time() - self._session_start
            }
        
        # Filtrer les appels réussis
        successful = [c for c in self._calls if c.success]
        
        # TTFT stats
        ttfts = [c.time_to_first_token for c in successful if c.time_to_first_token]
        
        # TTC stats
        ttcs = [c.time_to_complete for c in successful if c.time_to_complete]
        
        # Token stats
        input_tokens = [c.input_tokens for c in successful]
        output_tokens = [c.output_tokens for c in successful]
        context_sizes = [c.context_size_chars for c in successful]
        
        # Calls per session
        sessions = set(c.session_id for c in self._calls)
        
        # Par task type
        by_task = {}
        for task_type in ["workflow_start", "step_render", "facts_extraction", "chat_response"]:
            task_calls = [c for c in successful if c.task_type == task_type]
            if task_calls:
                task_ttfts = [c.time_to_first_token for c in task_calls if c.time_to_first_token]
                by_task[task_type] = {
                    "count": len(task_calls),
                    "avg_ttft": statistics.mean(task_ttfts) if task_ttfts else None,
                    "avg_input_tokens": statistics.mean([c.input_tokens for c in task_calls])
                }
        
        # Cache stats
        total_cache = self._cache_stats["hits"] + self._cache_stats["misses"]
        cache_hit_rate = self._cache_stats["hits"] / total_cache if total_cache > 0 else 0
        
        return {
            # Totals
            "total_calls": len(self._calls),
            "successful_calls": len(successful),
            "failed_calls": len(self._calls) - len(successful),
            "unique_sessions": len(sessions),
            
            # TTFT
            "ttft": {
                "avg": round(statistics.mean(ttfts), 3) if ttfts else None,
                "p50": round(statistics.median(ttfts), 3) if ttfts else None,
                "p95": round(sorted(ttfts)[int(len(ttfts) * 0.95)] if len(ttfts) >= 20 else max(ttfts), 3) if ttfts else None,
                "min": round(min(ttfts), 3) if ttfts else None,
                "max": round(max(ttfts), 3) if ttfts else None
            },
            
            # TTC
            "ttc": {
                "avg": round(statistics.mean(ttcs), 3) if ttcs else None,
                "p50": round(statistics.median(ttcs), 3) if ttcs else None,
                "p95": round(sorted(ttcs)[int(len(ttcs) * 0.95)] if len(ttcs) >= 20 else max(ttcs), 3) if ttcs else None
            },
            
            # Tokens
            "tokens": {
                "avg_input": round(statistics.mean(input_tokens)) if input_tokens else 0,
                "avg_output": round(statistics.mean(output_tokens)) if output_tokens else 0,
                "avg_context_chars": round(statistics.mean(context_sizes)) if context_sizes else 0,
                "total_input": sum(input_tokens),
                "total_output": sum(output_tokens)
            },
            
            # Sessions
            "calls_per_session": round(len(self._calls) / len(sessions), 2) if sessions else 0,
            
            # By task type
            "by_task_type": by_task,
            
            # Cache
            "cache": {
                "hits": self._cache_stats["hits"],
                "misses": self._cache_stats["misses"],
                "hit_rate": round(cache_hit_rate, 3)
            },
            
            # Meta
            "uptime_seconds": round(time.time() - self._session_start),
            "generated_at": datetime.now().isoformat()
        }
    
    def get_recent_calls(self, limit: int = 50) -> list[dict]:
        """Retourne les N derniers appels"""
        return [c.to_dict() for c in self._calls[-limit:]]
    
    def reset(self):
        """Reset les métriques (pour tests)"""
        self._calls = []
        self._cache_stats = {"hits": 0, "misses": 0}


# Instance singleton
metrics = MetricsCollector()
```

#### Backend : API Endpoints

```python
# server/api/metrics.py

from fastapi import APIRouter, Query
from services.metrics import metrics

router = APIRouter(prefix="/api/metrics", tags=["metrics"])

@router.get("/baseline")
async def get_baseline_report():
    """
    Génère un rapport baseline des métriques LLM.
    
    Utiliser avant/après optimisations pour mesurer l'impact.
    """
    return metrics.get_baseline_report()

@router.get("/recent")
async def get_recent_calls(limit: int = Query(50, le=200)):
    """Retourne les N derniers appels LLM"""
    return {
        "calls": metrics.get_recent_calls(limit),
        "total_recorded": len(metrics._calls)
    }

@router.post("/reset")
async def reset_metrics():
    """Reset les métriques (dev/test uniquement)"""
    metrics.reset()
    return {"status": "reset", "message": "Metrics cleared"}
```

#### Frontend : Hook `useMetrics`

```typescript
// src/hooks/useMetrics.ts

import { useRef, useCallback } from 'react'

interface MetricEntry {
  id: string
  startTime: number
  firstTokenTime?: number
  completeTime?: number
  taskType: string
}

interface UseMetricsReturn {
  startMeasure: (id: string, taskType: string) => void
  markFirstToken: (id: string) => void
  markComplete: (id: string) => MetricEntry | null
  getMetrics: () => MetricEntry[]
}

export function useMetrics(): UseMetricsReturn {
  const metricsRef = useRef<Map<string, MetricEntry>>(new Map())
  
  const startMeasure = useCallback((id: string, taskType: string) => {
    metricsRef.current.set(id, {
      id,
      startTime: performance.now(),
      taskType
    })
    
    // Log pour debug
    console.debug(`[Metrics] Started: ${id} (${taskType})`)
  }, [])
  
  const markFirstToken = useCallback((id: string) => {
    const entry = metricsRef.current.get(id)
    if (entry && !entry.firstTokenTime) {
      entry.firstTokenTime = performance.now()
      const ttft = entry.firstTokenTime - entry.startTime
      console.debug(`[Metrics] First token: ${id} - TTFT: ${ttft.toFixed(0)}ms`)
    }
  }, [])
  
  const markComplete = useCallback((id: string): MetricEntry | null => {
    const entry = metricsRef.current.get(id)
    if (entry) {
      entry.completeTime = performance.now()
      const ttc = entry.completeTime - entry.startTime
      const ttft = entry.firstTokenTime 
        ? entry.firstTokenTime - entry.startTime 
        : null
      
      console.debug(
        `[Metrics] Complete: ${id} - ` +
        `TTFT: ${ttft?.toFixed(0) ?? 'N/A'}ms, ` +
        `TTC: ${ttc.toFixed(0)}ms`
      )
      
      // Envoyer au backend pour agrégation (optionnel)
      // sendToBackend(entry)
      
      return entry
    }
    return null
  }, [])
  
  const getMetrics = useCallback((): MetricEntry[] => {
    return Array.from(metricsRef.current.values())
  }, [])
  
  return { startMeasure, markFirstToken, markComplete, getMetrics }
}
```

### Critères d'Acceptation

- [ ] Métriques loggées pour chaque appel LLM (format JSON structuré)
- [ ] Endpoint `/api/metrics/baseline` fonctionnel
- [ ] TTFT, TTC, tokens mesurés côté backend
- [ ] Hook frontend `useMetrics` disponible
- [ ] Overhead < 1ms par appel
- [ ] Logs consultables via `tail -f ~/.unreal_mcp/unreal_mcp.log | grep LLM_CALL`

### Durée Estimée : 0.5 jour

---

## Sous-Task A : Nettoyage Dual Workflow

### Objectif

Séparer proprement les deux modes de communication :
- **workflowStore** : Step-based, REST uniquement
- **chatStore** : Conversation libre, SSE streaming

### Problème Actuel

```typescript
// workflowStore.ts - ACTUEL (mélangé)
interface WorkflowState {
  // Session step-based
  activeSession: Session | null
  currentStepData: StepData | null
  
  // Chat WebSocket (à supprimer)
  ws: WebSocket | null
  messages: Message[]
  streamingContent: string
  
  // Actions mélangées
  startWorkflow: () => Promise<void>
  connectWebSocket: () => void  // ← À SUPPRIMER
  sendMessage: () => void       // ← À SUPPRIMER
  submitStep: () => Promise<void>
}
```

### Architecture Cible

```
┌─────────────────────────────────────────────────────────────────┐
│                         StudioPage                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
              ┌────────────┴────────────────┐
              │                             │
              ▼                             ▼
┌──────────────────────┐         ┌──────────────────────┐
│    workflowStore     │         │      chatStore       │
│    (step-based)      │         │    (free-form)       │
│                      │         │                      │
│ • REST API only      │         │ • SSE streaming      │
│ • Session + Steps    │         │ • Messages history   │
│ • Submit responses   │         │ • Agent context      │
│ • No WebSocket       │         │ • Thinking indicator │
└──────────┬───────────┘         └──────────┬───────────┘
           │                                │
           ▼                                ▼
┌──────────────────────┐         ┌──────────────────────┐
│ WorkflowStepContainer│         │     ChatPanel        │
│ WorkflowStepView     │         │     ChatMessage      │
└──────────────────────┘         └──────────────────────┘
```

### Fichiers à Modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `stores/workflowStore.ts` | Modifier | Supprimer WebSocket, garder REST |
| `stores/chatStore.ts` | Créer | Nouveau store pour chat libre |
| `api/chat.py` | Créer | Endpoint SSE pour chat |
| `components/chat/*` | Modifier | Utiliser chatStore |
| `components/workflow/*` | Vérifier | Confirmer workflowStore |

### Spécifications Techniques

#### workflowStore.ts (Nettoyé)

```typescript
// src/stores/workflowStore.ts

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// Types
interface WorkflowSession {
  id: string
  workflow_id: string
  project_id: string
  current_step: number
  total_steps: number
  status: 'active' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

interface StepRenderData {
  step_id: string
  step_number: number
  total_steps: number
  title: string
  agent: {
    id: string
    name: string
    avatar: string
    color?: string
  }
  intro_text: string
  questions: QuestionBlock[]
  suggestions: Suggestion[]
  prefilled: Record<string, string>
  can_skip: boolean
  skip_reason: string
  is_complete: boolean
}

interface QuestionBlock {
  id: string
  type: 'text' | 'textarea' | 'choice' | 'multi_choice' | 'choice_cards' | 'gauge' | 'emoji_scale'
  label: string
  required: boolean
  placeholder?: string
  options?: { id: string; label: string; icon?: string }[]
  suggestions?: string[]
  validation?: {
    min_length?: number
    max_length?: number
    pattern?: string
  }
}

interface Suggestion {
  id: string
  type: 'choice' | 'action'
  label: string
  value?: string
}

// État
interface WorkflowState {
  // Session
  activeSession: WorkflowSession | null
  currentStepData: StepRenderData | null
  
  // UI state
  isLoading: boolean
  isSubmitting: boolean
  error: string | null
  
  // Actions
  startWorkflow: (
    workflowId: string, 
    projectId: string, 
    projectPath: string,
    language?: string
  ) => Promise<void>
  
  fetchCurrentStep: () => Promise<void>
  
  submitStepResponse: (
    responses: Record<string, unknown>,
    skipped?: boolean
  ) => Promise<void>
  
  goBack: () => Promise<void>
  
  cancelWorkflow: () => void
  
  // Setters (pour SSE streaming)
  setCurrentStepData: (data: StepRenderData | null) => void
  
  // Reset
  reset: () => void
}

// Store
export const useWorkflowStore = create<WorkflowState>()(
  devtools(
    (set, get) => ({
      // Initial state
      activeSession: null,
      currentStepData: null,
      isLoading: false,
      isSubmitting: false,
      error: null,
      
      startWorkflow: async (workflowId, projectId, projectPath, language = 'fr') => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch('/api/workflows/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workflow_id: workflowId,
              project_id: projectId,
              project_path: projectPath,
              language
            })
          })
          
          if (!response.ok) {
            throw new Error(`Failed to start workflow: ${response.statusText}`)
          }
          
          const data = await response.json()
          
          // IMPORTANT: Utiliser directement les données du step
          // PAS de second appel à fetchCurrentStep()
          set({
            activeSession: data.session,
            currentStepData: data.step,  // ← Single call !
            isLoading: false
          })
          
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false 
          })
        }
      },
      
      fetchCurrentStep: async () => {
        const { activeSession } = get()
        if (!activeSession) return
        
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch(
            `/api/workflows/session/${activeSession.id}/step`
          )
          
          if (!response.ok) {
            throw new Error('Failed to fetch step')
          }
          
          const stepData = await response.json()
          set({ currentStepData: stepData, isLoading: false })
          
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false 
          })
        }
      },
      
      submitStepResponse: async (responses, skipped = false) => {
        const { activeSession } = get()
        if (!activeSession) return
        
        set({ isSubmitting: true, error: null })
        
        try {
          const response = await fetch(
            `/api/workflows/session/${activeSession.id}/step/submit`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ responses, skipped })
            }
          )
          
          if (!response.ok) {
            throw new Error('Failed to submit response')
          }
          
          const result = await response.json()
          
          if (result.complete) {
            // Workflow terminé
            set({
              activeSession: { ...activeSession, status: 'completed' },
              currentStepData: null,
              isSubmitting: false
            })
          } else {
            // Prochain step
            set({
              activeSession: {
                ...activeSession,
                current_step: result.next_step.step_number
              },
              currentStepData: result.next_step,
              isSubmitting: false
            })
          }
          
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isSubmitting: false
          })
        }
      },
      
      goBack: async () => {
        const { activeSession } = get()
        if (!activeSession || activeSession.current_step <= 1) return
        
        set({ isLoading: true })
        
        try {
          const response = await fetch(
            `/api/workflows/session/${activeSession.id}/back`,
            { method: 'POST' }
          )
          
          if (!response.ok) {
            throw new Error('Failed to go back')
          }
          
          const result = await response.json()
          set({
            activeSession: {
              ...activeSession,
              current_step: result.step.step_number
            },
            currentStepData: result.step,
            isLoading: false
          })
          
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false
          })
        }
      },
      
      cancelWorkflow: () => {
        set({
          activeSession: null,
          currentStepData: null,
          isLoading: false,
          isSubmitting: false,
          error: null
        })
      },
      
      setCurrentStepData: (data) => {
        set({ currentStepData: data })
      },
      
      reset: () => {
        set({
          activeSession: null,
          currentStepData: null,
          isLoading: false,
          isSubmitting: false,
          error: null
        })
      }
    }),
    { name: 'workflow-store' }
  )
)
```

#### chatStore.ts (Nouveau)

```typescript
// src/stores/chatStore.ts

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  isStreaming?: boolean
  thoughts?: string[]  // Pour thinking indicator
}

interface ChatState {
  // Messages
  messages: ChatMessage[]
  
  // Streaming
  isStreaming: boolean
  currentThoughts: string[]
  streamingContent: string
  
  // Agent context
  currentAgentId: string | null
  projectId: string | null
  
  // Actions
  sendMessage: (content: string) => Promise<void>
  setAgent: (agentId: string) => void
  setProject: (projectId: string) => void
  clearChat: () => void
  
  // Workflow trigger
  triggerWorkflow: (workflowId: string) => void
}

export const useChatStore = create<ChatState>()(
  devtools(
    (set, get) => ({
      messages: [],
      isStreaming: false,
      currentThoughts: [],
      streamingContent: '',
      currentAgentId: null,
      projectId: null,
      
      sendMessage: async (content: string) => {
        const { currentAgentId, projectId, messages } = get()
        
        // Ajouter message utilisateur
        const userMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          content,
          timestamp: new Date()
        }
        
        set({ 
          messages: [...messages, userMessage],
          isStreaming: true,
          currentThoughts: [],
          streamingContent: ''
        })
        
        try {
          // SSE stream
          const response = await fetch('/api/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: content,
              agent_id: currentAgentId,
              project_id: projectId,
              history: messages.slice(-10)  // Last 10 for context
            })
          })
          
          if (!response.ok) {
            throw new Error('Failed to send message')
          }
          
          const reader = response.body?.getReader()
          const decoder = new TextDecoder()
          
          if (!reader) {
            throw new Error('No response body')
          }
          
          let fullContent = ''
          const thoughts: string[] = []
          
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            
            const chunk = decoder.decode(value)
            const lines = chunk.split('\n').filter(line => line.startsWith('data: '))
            
            for (const line of lines) {
              const data = line.slice(6)  // Remove "data: "
              
              if (data === '[DONE]') {
                break
              }
              
              try {
                const parsed = JSON.parse(data)
                
                if (parsed.type === 'thinking') {
                  thoughts.push(parsed.content)
                  set({ currentThoughts: [...thoughts] })
                } else if (parsed.type === 'token') {
                  fullContent += parsed.content
                  set({ streamingContent: fullContent })
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
          
          // Finaliser le message
          const assistantMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: fullContent,
            timestamp: new Date(),
            thoughts
          }
          
          set(state => ({
            messages: [...state.messages, assistantMessage],
            isStreaming: false,
            currentThoughts: [],
            streamingContent: ''
          }))
          
        } catch (error) {
          set({ isStreaming: false })
          console.error('Chat error:', error)
        }
      },
      
      setAgent: (agentId: string) => {
        set({ currentAgentId: agentId })
      },
      
      setProject: (projectId: string) => {
        set({ projectId })
      },
      
      clearChat: () => {
        set({
          messages: [],
          isStreaming: false,
          currentThoughts: [],
          streamingContent: ''
        })
      },
      
      triggerWorkflow: (workflowId: string) => {
        // Import dynamique pour éviter circular dependency
        import('./workflowStore').then(({ useWorkflowStore }) => {
          const { startWorkflow } = useWorkflowStore.getState()
          const { projectId, currentAgentId } = get()
          
          if (projectId) {
            startWorkflow(workflowId, projectId, '', 'fr')
          }
        })
      }
    }),
    { name: 'chat-store' }
  )
)
```

#### Backend : Chat SSE Endpoint

```python
# server/api/chat.py

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import json

from services.llm import LLMService
from services.metrics import metrics

router = APIRouter(prefix="/api/chat", tags=["chat"])

class ChatRequest(BaseModel):
    message: str
    agent_id: Optional[str] = None
    project_id: Optional[str] = None
    history: list[dict] = []

@router.post("/stream")
async def stream_chat(request: ChatRequest):
    """
    SSE endpoint pour chat conversationnel.
    
    Events:
    - thinking: { type: "thinking", content: "..." }
    - token: { type: "token", content: "..." }
    - complete: { type: "complete" }
    - error: { type: "error", content: "..." }
    """
    
    llm = LLMService()
    
    async def event_generator():
        session_id = f"chat_{request.project_id or 'anonymous'}"
        call = metrics.new_call(
            session_id=session_id,
            task_type="chat_response",
            provider=llm.provider,
            model=llm.model
        )
        
        try:
            async for chunk in llm.stream_with_thinking(
                prompt=request.message,
                system=_build_chat_system(request.agent_id),
                history=request.history
            ):
                # Mark first token
                if chunk["type"] == "token":
                    call.mark_first_token()
                
                yield f"data: {json.dumps(chunk)}\n\n"
            
            yield "data: [DONE]\n\n"
            call.mark_complete(
                input_tokens=llm.last_input_tokens,
                output_tokens=llm.last_output_tokens
            )
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
            call.mark_complete(0, 0, success=False, error=str(e))
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

def _build_chat_system(agent_id: str | None) -> str:
    """Construit le system prompt pour le chat"""
    base = "Tu es un assistant créatif pour le développement de jeux vidéo."
    
    if agent_id:
        # Charger persona de l'agent
        # TODO: Utiliser agent_service
        pass
    
    return base
```

### Critères d'Acceptation

- [ ] `workflowStore` n'a plus de WebSocket ni `messages[]`
- [ ] `chatStore` créé avec SSE streaming
- [ ] Transition workflow → chat fonctionne
- [ ] Transition chat → workflow fonctionne
- [ ] Aucune régression sur workflows existants
- [ ] Tests unitaires passent

### Durée Estimée : 1.5 jours

---

## Sous-Task B : Single Call au Start

### Objectif

Réduire de 2 à 1 le nombre d'appels LLM au démarrage d'un workflow.

### Flux Cible

```
User clique "Start"
    │
    ▼
POST /api/workflows/start ───────► 1 Appel LLM (session + step)
    │
    │  returns { session, step }
    ▼
Frontend affiche step immédiatement
```

### Fichiers à Modifier

| Fichier | Action |
|---------|--------|
| `server/api/workflows.py` | `/start` retourne aussi `step` |
| `server/services/workflow/engine.py` | `start()` rend le premier step |
| `stores/workflowStore.ts` | Utilise `response.step` directement |
| `components/WorkflowStepContainer.tsx` | Ne fetch pas si data présente |

### Spécifications Techniques

#### Backend : `/start` Enrichi

```python
# server/api/workflows.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from services.workflow.engine import WorkflowEngine
from services.metrics import metrics

router = APIRouter(prefix="/api/workflows", tags=["workflows"])

class StartWorkflowRequest(BaseModel):
    workflow_id: str
    project_id: str
    project_path: str
    language: str = "fr"
    agent_id: Optional[str] = None

class SessionInfo(BaseModel):
    id: str
    workflow_id: str
    project_id: str
    current_step: int
    total_steps: int
    status: str
    created_at: datetime
    updated_at: datetime

class StartWorkflowResponse(BaseModel):
    session: SessionInfo
    step: dict  # StepRenderData

@router.post("/start", response_model=StartWorkflowResponse)
async def start_workflow(request: StartWorkflowRequest):
    """
    Démarre un workflow et retourne la session + le premier step.
    
    IMPORTANT: Un seul appel LLM est fait ici.
    Le frontend ne doit PAS appeler /step ensuite.
    """
    engine = WorkflowEngine()
    
    # Créer métriques
    call = metrics.new_call(
        session_id=f"new_{request.project_id}",
        task_type="workflow_start",
        provider=engine.llm.provider,
        model=engine.llm.model
    )
    
    try:
        # Start retourne session + premier step rendu
        session, step_data = await engine.start(
            workflow_id=request.workflow_id,
            project_id=request.project_id,
            project_path=request.project_path,
            language=request.language,
            agent_id=request.agent_id
        )
        
        call.mark_complete(
            input_tokens=engine.llm.last_input_tokens,
            output_tokens=engine.llm.last_output_tokens
        )
        
        return {
            "session": SessionInfo(
                id=session.id,
                workflow_id=session.workflow_id,
                project_id=session.project_id,
                current_step=session.current_step,
                total_steps=session.total_steps,
                status=session.status,
                created_at=session.created_at,
                updated_at=session.updated_at
            ),
            "step": step_data
        }
        
    except Exception as e:
        call.mark_complete(0, 0, success=False, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
```

#### Engine : `start()` Rend le Step

```python
# server/services/workflow/engine.py

class WorkflowEngine:
    
    async def start(
        self,
        workflow_id: str,
        project_id: str,
        project_path: str,
        language: str = "fr",
        agent_id: str = None
    ) -> tuple[WorkflowSession, dict]:
        """
        Démarre un workflow et rend le premier step.
        
        Returns:
            tuple: (session, step_render_data)
        """
        # 1. Charger le workflow YAML
        workflow = await self._load_workflow(workflow_id)
        
        # 2. Créer la session
        session = await self._create_session(
            workflow=workflow,
            project_id=project_id,
            project_path=project_path,
            language=language
        )
        
        # 3. Charger le contexte
        context = await self._load_context(
            project_id=project_id,  # ← CORRECT (pas project_path)
            workflow=workflow
        )
        
        # 4. Rendre le premier step
        first_step = workflow.steps[0]
        step_data = await self.step_renderer.render(
            session=session,
            step=first_step,
            context=context,
            language=language,
            agent_id=agent_id
        )
        
        return session, step_data
    
    async def _load_context(
        self, 
        project_id: str,
        workflow
    ) -> str:
        """Charge le contexte compact pour le LLM"""
        # IMPORTANT: Utiliser project_id, pas project_path !
        return await self.knowledge_service.build_context(
            project_id=project_id,
            focus=workflow.context_focus if hasattr(workflow, 'context_focus') else None
        )
```

#### Frontend : No Refetch

```typescript
// src/components/workflow/WorkflowStepContainer.tsx

import { useEffect, useRef } from 'react'
import { useWorkflowStore } from '@/stores/workflowStore'
import { WorkflowStepView } from './WorkflowStepView'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export function WorkflowStepContainer() {
  const {
    activeSession,
    currentStepData,
    isLoading,
    error,
    fetchCurrentStep
  } = useWorkflowStore()
  
  // Ref pour éviter les appels multiples
  const didFetchRef = useRef(false)
  
  useEffect(() => {
    // Ne fetch QUE si :
    // 1. On a une session active
    // 2. On n'a PAS de step data
    // 3. On n'a pas déjà fetch
    if (activeSession && !currentStepData && !didFetchRef.current) {
      didFetchRef.current = true
      fetchCurrentStep()
    }
    
    // Reset le flag si la session change
    return () => {
      didFetchRef.current = false
    }
  }, [activeSession?.id])
  
  // Rendu
  if (error) {
    return <ErrorDisplay message={error} />
  }
  
  if (isLoading) {
    return <LoadingSpinner />
  }
  
  if (!currentStepData) {
    return null
  }
  
  // Render le step directement
  return <WorkflowStepView stepData={currentStepData} />
}
```

### Vérification

Pour vérifier que seul 1 appel est fait :

```bash
# Terminal 1: Logs backend
tail -f ~/.unreal_mcp/unreal_mcp.log | grep "LLM_CALL"

# Terminal 2: Network Chrome
# Ouvrir DevTools > Network > filtrer "workflows"
# Vérifier qu'il n'y a que POST /start, pas de GET /step
```

### Critères d'Acceptation

- [ ] Un seul `LLM_CALL` logué au démarrage
- [ ] Pas de requête GET `/step` après `/start`
- [ ] Le step s'affiche en < 2s (hors latence LLM)
- [ ] Les workflows existants continuent de fonctionner
- [ ] Tests unitaires passent

### Durée Estimée : 1 jour

---

## Sous-Task C : Streaming + Thinking UI

### Objectif

Afficher un feedback visuel **immédiat** pendant la génération LLM :
1. Indicateur "thinking" avec points d'analyse
2. Texte qui s'affiche progressivement

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        LLM Provider                              │
│              (Anthropic, OpenAI, Ollama, etc.)                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                    stream token by token
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (FastAPI)                           │
│                                                                  │
│  1. Inject thinking prompt                                       │
│  2. Parse <thinking>...</thinking>                              │
│  3. Emit SSE events                                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                SSE: thinking | token | complete | error
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (React)                            │
│                                                                  │
│  useStreamingResponse()                                          │
│  ├── ThinkingIndicator (thoughts[])                             │
│  └── StreamingText (text + cursor)                              │
└─────────────────────────────────────────────────────────────────┘
```

### Design UI

```
┌─────────────────────────────────────────────────────────────────┐
│  🧠 L'agent réfléchit...                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ • Analyse du brief existant...                              ││
│  │ • Consultation de la section gameplay du GDD... ←───────────┤│
│  │ • Formulation des questions clés...              (animé)    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ─────────────────────── Réponse ───────────────────────        │
│                                                                  │
│  Basé sur ton brief, je te propose de définir la vision         │
│  du jeu. Voici quelques questions pour commencer :              │
│  [texte qui s'affiche token par token]▊ ←─────── cursor         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Fichiers à Créer

| Fichier | Description |
|---------|-------------|
| `server/api/workflows.py` | Endpoint SSE `/stream/{session_id}` |
| `server/services/llm.py` | Méthode `stream_with_thinking()` |
| `src/hooks/useStreamingResponse.ts` | Hook SSE |
| `src/components/common/ThinkingIndicator.tsx` | Composant thinking |
| `src/components/common/StreamingText.tsx` | Composant texte streaming |

### Spécifications Techniques

#### Format SSE

```
data: {"type":"thinking","content":"Analyse du brief existant..."}

data: {"type":"thinking","content":"Consultation de la section gameplay..."}

data: {"type":"thinking","content":"Formulation des questions clés..."}

data: {"type":"token","content":"Basé "}

data: {"type":"token","content":"sur "}

data: {"type":"token","content":"ton brief"}

...

data: {"type":"complete","data":{"step_id":"vision","title":"Vision",...}}

data: [DONE]
```

#### Backend : SSE Endpoint

```python
# server/api/workflows.py

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from enum import Enum
import json

class StreamEventType(str, Enum):
    THINKING = "thinking"
    TOKEN = "token"
    COMPLETE = "complete"
    ERROR = "error"

@router.get("/stream/{session_id}")
async def stream_step_response(
    session_id: str,
    project_path: str = Query(...)
):
    """
    SSE endpoint pour streaming des réponses LLM.
    
    Events:
    - thinking: Points de réflexion de l'agent
    - token: Token de la réponse
    - complete: Réponse complète (step JSON)
    - error: Erreur
    
    Utiliser quand currentStepData est null après start.
    """
    engine = WorkflowEngine()
    
    async def event_generator():
        try:
            # Récupérer la session
            session = await engine.get_session(session_id)
            if not session:
                yield f"data: {json.dumps({'type': 'error', 'content': 'Session not found'})}\n\n"
                return
            
            # Stream le step
            accumulated_json = ""
            async for chunk in engine.stream_step(session_id, project_path):
                if chunk["type"] == StreamEventType.THINKING:
                    yield f"data: {json.dumps(chunk)}\n\n"
                    
                elif chunk["type"] == StreamEventType.TOKEN:
                    accumulated_json += chunk["content"]
                    yield f"data: {json.dumps(chunk)}\n\n"
                    
                elif chunk["type"] == StreamEventType.COMPLETE:
                    # Parser le JSON accumulé
                    try:
                        step_data = json.loads(accumulated_json)
                        yield f"data: {json.dumps({'type': 'complete', 'data': step_data})}\n\n"
                    except json.JSONDecodeError:
                        yield f"data: {json.dumps({'type': 'error', 'content': 'Invalid JSON response'})}\n\n"
            
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*"
        }
    )
```

#### Backend : LLM Stream avec Thinking

```python
# server/services/llm.py

from dataclasses import dataclass
from typing import AsyncGenerator, Literal, Optional

@dataclass
class StreamChunk:
    type: Literal["thinking", "token", "complete", "error"]
    content: Optional[str] = None
    data: Optional[dict] = None

class LLMService:
    
    # Prompt pour forcer le thinking
    THINKING_INSTRUCTION = """
Avant de répondre, indique brièvement ce que tu analyses (2-3 points).
Format OBLIGATOIRE:
<thinking>
• Point 1
• Point 2
</thinking>

Puis donne ta réponse en JSON strict.
"""
    
    async def stream_with_thinking(
        self,
        prompt: str,
        system: str = None,
        **kwargs
    ) -> AsyncGenerator[StreamChunk, None]:
        """
        Stream la réponse LLM avec extraction du bloc thinking.
        
        Le LLM doit répondre avec:
        <thinking>
        • Point 1
        • Point 2
        </thinking>
        {JSON response}
        
        Yields:
            StreamChunk avec type thinking, token, ou complete
        """
        # Ajouter instruction thinking
        full_prompt = self.THINKING_INSTRUCTION + "\n\n" + prompt
        
        # État du parser
        in_thinking = False
        thinking_buffer = ""
        json_buffer = ""
        thinking_done = False
        
        async for token in self._raw_stream(full_prompt, system, **kwargs):
            # Détecter ouverture thinking
            if "<thinking>" in token and not thinking_done:
                in_thinking = True
                # Extraire ce qui est avant <thinking>
                before = token.split("<thinking>")[0]
                if before.strip():
                    json_buffer += before
                continue
            
            # Détecter fermeture thinking
            if "</thinking>" in token and in_thinking:
                in_thinking = False
                thinking_done = True
                
                # Extraire ce qui est après </thinking>
                parts = token.split("</thinking>")
                thinking_buffer += parts[0]
                
                # Émettre les thoughts
                for line in thinking_buffer.strip().split('\n'):
                    line = line.strip().lstrip('•-').strip()
                    if line:
                        yield StreamChunk(type="thinking", content=line)
                
                thinking_buffer = ""
                
                # Ce qui reste va dans le JSON
                if len(parts) > 1:
                    json_buffer += parts[1]
                continue
            
            # Accumuler
            if in_thinking:
                thinking_buffer += token
            else:
                json_buffer += token
                yield StreamChunk(type="token", content=token)
        
        # Marquer comme complet
        yield StreamChunk(type="complete", data=None)
    
    async def _raw_stream(
        self,
        prompt: str,
        system: str = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Stream brut depuis le provider"""
        
        if self.provider == "anthropic":
            async for chunk in self._stream_anthropic(prompt, system, **kwargs):
                yield chunk
        elif self.provider == "openai":
            async for chunk in self._stream_openai(prompt, system, **kwargs):
                yield chunk
        elif self.provider == "ollama":
            async for chunk in self._stream_ollama(prompt, system, **kwargs):
                yield chunk
        else:
            # Fallback: pas de streaming
            result = await self.complete(prompt, system, **kwargs)
            yield result
    
    async def _stream_anthropic(self, prompt, system, **kwargs):
        """Stream depuis Anthropic"""
        import anthropic
        
        client = anthropic.AsyncAnthropic(api_key=self.api_key)
        
        async with client.messages.stream(
            model=self.model,
            max_tokens=kwargs.get("max_tokens", 4096),
            system=system or "",
            messages=[{"role": "user", "content": prompt}]
        ) as stream:
            async for text in stream.text_stream:
                yield text
    
    async def _stream_openai(self, prompt, system, **kwargs):
        """Stream depuis OpenAI"""
        import openai
        
        client = openai.AsyncOpenAI(api_key=self.api_key)
        
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        
        stream = await client.chat.completions.create(
            model=self.model,
            messages=messages,
            max_tokens=kwargs.get("max_tokens", 4096),
            stream=True
        )
        
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    
    async def _stream_ollama(self, prompt, system, **kwargs):
        """Stream depuis Ollama"""
        import httpx
        
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.ollama_base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "system": system or "",
                    "stream": True
                },
                timeout=60.0
            ) as response:
                async for line in response.aiter_lines():
                    if line:
                        data = json.loads(line)
                        if "response" in data:
                            yield data["response"]
```

#### Frontend : Hook useStreamingResponse

```typescript
// src/hooks/useStreamingResponse.ts

import { useState, useCallback, useRef, useEffect } from 'react'

interface StreamState {
  // Contenu
  text: string
  thoughts: string[]
  
  // État
  isStreaming: boolean
  isComplete: boolean
  error: string | null
  
  // Données finales (step JSON)
  finalData: Record<string, unknown> | null
}

interface UseStreamingResponseReturn extends StreamState {
  startStream: (url: string) => void
  reset: () => void
}

const initialState: StreamState = {
  text: '',
  thoughts: [],
  isStreaming: false,
  isComplete: false,
  error: null,
  finalData: null
}

export function useStreamingResponse(): UseStreamingResponseReturn {
  const [state, setState] = useState<StreamState>(initialState)
  const eventSourceRef = useRef<EventSource | null>(null)
  const mountedRef = useRef(true)
  
  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      eventSourceRef.current?.close()
    }
  }, [])
  
  const startStream = useCallback((url: string) => {
    // Cleanup previous
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    
    // Reset state
    setState({
      ...initialState,
      isStreaming: true
    })
    
    // Create EventSource
    const eventSource = new EventSource(url)
    eventSourceRef.current = eventSource
    
    eventSource.onmessage = (event) => {
      if (!mountedRef.current) return
      
      // Handle [DONE]
      if (event.data === '[DONE]') {
        eventSource.close()
        setState(prev => ({
          ...prev,
          isStreaming: false,
          isComplete: true
        }))
        return
      }
      
      try {
        const data = JSON.parse(event.data)
        
        switch (data.type) {
          case 'thinking':
            setState(prev => ({
              ...prev,
              thoughts: [...prev.thoughts, data.content]
            }))
            break
            
          case 'token':
            setState(prev => ({
              ...prev,
              text: prev.text + data.content
            }))
            break
            
          case 'complete':
            setState(prev => ({
              ...prev,
              finalData: data.data,
              isComplete: true
            }))
            break
            
          case 'error':
            setState(prev => ({
              ...prev,
              error: data.content,
              isStreaming: false
            }))
            eventSource.close()
            break
        }
      } catch (e) {
        console.error('Failed to parse SSE event:', e)
      }
    }
    
    eventSource.onerror = (error) => {
      if (!mountedRef.current) return
      
      console.error('SSE error:', error)
      eventSource.close()
      setState(prev => ({
        ...prev,
        isStreaming: false,
        error: 'Connection lost'
      }))
    }
  }, [])
  
  const reset = useCallback(() => {
    eventSourceRef.current?.close()
    setState(initialState)
  }, [])
  
  return {
    ...state,
    startStream,
    reset
  }
}
```

#### Frontend : ThinkingIndicator

```typescript
// src/components/common/ThinkingIndicator.tsx

import { Brain, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/i18n/useI18n'
import { motion, AnimatePresence } from 'framer-motion'

interface ThinkingIndicatorProps {
  thoughts: string[]
  isActive: boolean
  className?: string
}

export function ThinkingIndicator({
  thoughts,
  isActive,
  className
}: ThinkingIndicatorProps) {
  const { t } = useTranslation()
  
  // Ne rien afficher si pas de thoughts et pas actif
  if (thoughts.length === 0 && !isActive) return null
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "rounded-lg bg-muted/50 border border-muted-foreground/20 p-4 mb-4",
        "transition-all duration-300",
        isActive ? "opacity-100" : "opacity-60",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 text-sm font-medium">
        {isActive ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <Brain className="h-4 w-4 text-muted-foreground" />
        )}
        <span className={cn(
          isActive ? "text-primary" : "text-muted-foreground"
        )}>
          {isActive ? t('streaming.thinking') : t('streaming.thinkingDone')}
        </span>
      </div>
      
      {/* Thoughts list */}
      <ul className="space-y-2 text-sm">
        <AnimatePresence>
          {thoughts.map((thought, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-2"
            >
              <span className="text-muted-foreground mt-0.5 select-none">•</span>
              <span className={cn(
                "transition-opacity duration-200",
                // Le dernier thought pulse si encore actif
                i === thoughts.length - 1 && isActive && "animate-pulse"
              )}>
                {thought}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
        
        {/* Placeholder si actif mais pas encore de thoughts */}
        {isActive && thoughts.length === 0 && (
          <motion.li
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <span className="animate-pulse">•</span>
            <span className="animate-pulse">{t('streaming.analyzing')}</span>
          </motion.li>
        )}
      </ul>
    </motion.div>
  )
}
```

#### Frontend : StreamingText

```typescript
// src/components/common/StreamingText.tsx

import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface StreamingTextProps {
  text: string
  isStreaming: boolean
  className?: string
}

export function StreamingText({ 
  text, 
  isStreaming, 
  className 
}: StreamingTextProps) {
  
  if (!text && !isStreaming) return null
  
  return (
    <div className={cn(
      "prose prose-sm dark:prose-invert max-w-none",
      className
    )}>
      <ReactMarkdown
        components={{
          // Personnaliser le rendu si besoin
          p: ({ children }) => (
            <p className="mb-2 last:mb-0">{children}</p>
          )
        }}
      >
        {text}
      </ReactMarkdown>
      
      {/* Cursor clignotant pendant le streaming */}
      {isStreaming && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ 
            duration: 0.8, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="inline-block w-2 h-5 bg-primary ml-0.5 align-text-bottom"
        />
      )}
    </div>
  )
}
```

#### Frontend : Wiring dans WorkflowStepContainer

```typescript
// src/components/workflow/WorkflowStepContainer.tsx (mise à jour)

import { useEffect } from 'react'
import { useWorkflowStore } from '@/stores/workflowStore'
import { useStreamingResponse } from '@/hooks/useStreamingResponse'
import { WorkflowStepView } from './WorkflowStepView'
import { ThinkingIndicator } from '@/components/common/ThinkingIndicator'
import { StreamingText } from '@/components/common/StreamingText'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export function WorkflowStepContainer() {
  const {
    activeSession,
    currentStepData,
    isLoading,
    error,
    setCurrentStepData
  } = useWorkflowStore()
  
  const {
    thoughts,
    text,
    isStreaming,
    isComplete,
    finalData,
    error: streamError,
    startStream,
    reset
  } = useStreamingResponse()
  
  // Démarrer le stream si pas de step data
  useEffect(() => {
    if (activeSession && !currentStepData && !isStreaming && !isComplete) {
      const url = `/api/workflows/stream/${activeSession.id}?project_path=${encodeURIComponent(activeSession.project_path || '')}`
      startStream(url)
    }
  }, [activeSession?.id, currentStepData, isStreaming, isComplete])
  
  // Quand le stream est complet, utiliser les données
  useEffect(() => {
    if (isComplete && finalData) {
      setCurrentStepData(finalData as any)
      reset()
    }
  }, [isComplete, finalData])
  
  // Error handling
  if (error || streamError) {
    return <ErrorDisplay message={error || streamError || 'Unknown error'} />
  }
  
  // Loading initial
  if (isLoading && !isStreaming) {
    return <LoadingSpinner />
  }
  
  // Streaming mode
  if (isStreaming || (thoughts.length > 0 && !currentStepData)) {
    return (
      <div className="p-6 space-y-4">
        <ThinkingIndicator 
          thoughts={thoughts} 
          isActive={isStreaming} 
        />
        
        {text && (
          <StreamingText 
            text={text} 
            isStreaming={isStreaming} 
          />
        )}
      </div>
    )
  }
  
  // Render step complet
  if (currentStepData) {
    return <WorkflowStepView stepData={currentStepData} />
  }
  
  return null
}
```

### Fallback Sans Streaming

Pour les providers qui ne supportent pas le streaming, on utilise des phrases de thinking locales :

```typescript
// src/config/localThoughts.ts

export const LOCAL_THINKING_PHRASES = {
  fr: [
    "Analyse du contexte projet...",
    "Consultation des documents existants...",
    "Préparation des questions pertinentes...",
    "Structuration de la réponse..."
  ],
  en: [
    "Analyzing project context...",
    "Reviewing existing documents...",
    "Preparing relevant questions...",
    "Structuring the response..."
  ],
  es: [
    "Analizando el contexto del proyecto...",
    "Revisando documentos existentes...",
    "Preparando preguntas relevantes...",
    "Estructurando la respuesta..."
  ]
}

export function getLocalThoughts(language: string = 'fr'): string[] {
  return LOCAL_THINKING_PHRASES[language] || LOCAL_THINKING_PHRASES.fr
}
```

```typescript
// Usage dans WorkflowStepContainer
useEffect(() => {
  if (activeSession && !currentStepData && !supportsStreaming) {
    // Afficher thoughts locales pendant le chargement
    const thoughts = getLocalThoughts(activeSession.language)
    let index = 0
    
    const interval = setInterval(() => {
      if (index < thoughts.length) {
        setLocalThoughts(prev => [...prev, thoughts[index]])
        index++
      } else {
        clearInterval(interval)
      }
    }, 800)
    
    return () => clearInterval(interval)
  }
}, [activeSession, currentStepData])
```

### Critères d'Acceptation

- [ ] Premier token visible en < 1s après l'appel LLM
- [ ] Thinking indicator avec 2-3 points
- [ ] Texte s'affiche progressivement
- [ ] Animation fluide (pas de saccades)
- [ ] Fonctionne avec Anthropic, OpenAI, Ollama
- [ ] Fallback gracieux si streaming non supporté
- [ ] Pas de memory leak (EventSource fermé)
- [ ] Tests: unit + integration

### Durée Estimée : 3 jours

---

## Sous-Task D : Contexte Compact

### Objectif

Réduire la taille du contexte envoyé au LLM de ~10000 tokens à < 3000 tokens.

### Stratégie

1. **Fix project_id** : Corriger le bug de branchement
2. **Facts only** : Utiliser les faits extraits, pas les documents bruts
3. **Max tokens** : Limiter par workflow
4. **Cache** : Éviter les recalculs

### Fichiers à Modifier

| Fichier | Action |
|---------|--------|
| `services/workflow/engine.py` | Corriger `project_id` |
| `services/knowledge/service.py` | Vérifier interface |
| `services/knowledge/context_builder.py` | Ajouter `max_tokens` |
| `config/workflows/*.yaml` | Ajouter `max_context_tokens` |

### Spécifications Techniques

#### Fix project_id

```python
# server/services/workflow/engine.py

async def _load_context(
    self, 
    project_id: str,  # ← Paramètre correct
    workflow: Workflow
) -> str:
    """Charge le contexte compact pour le LLM"""
    
    # CORRECT: utiliser project_id
    return await self.knowledge_service.build_context(
        project_id=project_id,  # ← PAS project_path !
        focus=workflow.context_focus if hasattr(workflow, 'context_focus') else None,
        max_tokens=workflow.max_context_tokens if hasattr(workflow, 'max_context_tokens') else 3000
    )
```

#### Context Builder avec limite

```python
# server/services/knowledge/context_builder.py

class ContextBuilder:
    """Construit un contexte minimal pour le LLM"""
    
    DEFAULT_MAX_TOKENS = 3000
    CHARS_PER_TOKEN = 4  # Approximation
    
    async def build_context(
        self,
        project_id: str,
        focus: str = None,
        max_tokens: int = None
    ) -> str:
        """
        Retourne un contexte compact pour le prompt.
        
        Args:
            project_id: ID du projet
            focus: Focus optionnel ("gameplay", "narrative", "technical")
            max_tokens: Limite de tokens (défaut: 3000)
        
        Returns:
            Contexte formaté en markdown
        """
        max_tokens = max_tokens or self.DEFAULT_MAX_TOKENS
        max_chars = max_tokens * self.CHARS_PER_TOKEN
        
        # Récupérer les facts cachés
        brief_facts = await self.cache.get(project_id, "brief")
        gdd_facts = await self.cache.get(project_id, "gdd")
        
        if not brief_facts:
            # Pas de facts = pas de cache = recalculer
            self.metrics.record_cache_miss()
            # Fallback minimal
            return self._minimal_context(project_id)
        
        self.metrics.record_cache_hit()
        
        context_parts = []
        current_size = 0
        
        # 1. Toujours inclure le summary du brief (priorité haute)
        brief_section = self._format_brief_context(brief_facts)
        if current_size + len(brief_section) < max_chars:
            context_parts.append(brief_section)
            current_size += len(brief_section)
        
        # 2. GDD : filtrer par focus si spécifié
        if gdd_facts:
            gdd_section = self._format_gdd_context(gdd_facts, focus)
            if current_size + len(gdd_section) < max_chars:
                context_parts.append(gdd_section)
                current_size += len(gdd_section)
            elif focus:
                # Si trop gros, au moins le summary
                summary = f"## GDD Summary\n{gdd_facts.summary}"
                if current_size + len(summary) < max_chars:
                    context_parts.append(summary)
        
        # Assembler
        context = "\n\n".join(context_parts)
        
        # Vérification finale et troncature si nécessaire
        if len(context) > max_chars:
            context = self._truncate_intelligently(context, max_chars)
        
        return context
    
    def _format_brief_context(self, facts) -> str:
        """Formate le brief de manière compacte"""
        f = facts.facts
        return f"""## Game Brief
**{f.get('game_name', 'Untitled')}** - {f.get('genre', 'Unknown')}
Target: {f.get('target_audience', 'N/A')}
Core Loop: {f.get('core_loop', 'N/A')}
USPs: {', '.join(f.get('unique_selling_points', []))}
Summary: {f.get('summary', '')}"""
    
    def _format_gdd_context(self, facts, focus: str = None) -> str:
        """Formate le GDD selon le focus"""
        if focus:
            relevant = self._filter_by_focus(facts.facts, focus)
            return f"## GDD ({focus})\n{json.dumps(relevant, indent=2)}"
        else:
            return f"## GDD Summary\n{facts.summary}"
    
    def _filter_by_focus(self, facts: dict, focus: str) -> dict:
        """Filtre les sections par focus"""
        focus_mapping = {
            "gameplay": ["mechanics", "systems", "progression", "combat", "controls"],
            "narrative": ["story", "characters", "world", "lore", "dialogue"],
            "technical": ["architecture", "performance", "platforms", "tools", "tech"]
        }
        
        relevant_keys = focus_mapping.get(focus, [])
        return {
            k: v for k, v in facts.items()
            if any(rk in k.lower() for rk in relevant_keys)
        }
    
    def _truncate_intelligently(self, context: str, max_chars: int) -> str:
        """Tronque intelligemment le contexte"""
        if len(context) <= max_chars:
            return context
        
        # Couper à la dernière phrase complète
        truncated = context[:max_chars]
        last_period = truncated.rfind('.')
        last_newline = truncated.rfind('\n')
        
        cut_point = max(last_period, last_newline)
        if cut_point > max_chars * 0.8:  # Au moins 80% conservé
            return truncated[:cut_point + 1] + "\n[...]"
        
        return truncated + "\n[...]"
    
    def _minimal_context(self, project_id: str) -> str:
        """Contexte minimal si pas de facts"""
        return f"""## Project Context
Project ID: {project_id}
No cached documents found. Please provide context in your questions."""
```

#### Configuration par Workflow

```yaml
# server/config/workflows/game-brief.yaml

id: game-brief
name: Game Brief Workshop
version: 2

# Context settings
max_context_tokens: 2500
context_focus: null  # Tout le brief

steps:
  - id: vision
    name: Vision du jeu
    context_focus: null  # Hérite du workflow
    
  - id: gameplay
    name: Gameplay Core
    context_focus: gameplay  # Focus spécifique
    max_context_tokens: 3000  # Override
```

### Métriques de Réduction

| Document | Avant | Après | Réduction |
|----------|-------|-------|-----------|
| Brief complet | ~3000 tokens | ~500 tokens | -83% |
| GDD complet | ~15000 tokens | ~1000 tokens | -93% |
| Historique | ~2000 tokens | ~500 tokens | -75% |
| **Total** | **~20000** | **~2000** | **-90%** |

### Critères d'Acceptation

- [ ] `project_id` correctement passé au knowledge service
- [ ] Contexte moyen < 3000 tokens
- [ ] Cache hit rate > 80% après warm-up
- [ ] Pas de régression sur la qualité des réponses
- [ ] Config max_tokens par workflow fonctionnelle

### Durée Estimée : 2 jours

---

## Sous-Task E : Compléter i18n

### Objectif

Remplacer toutes les strings hardcodées par des clés de traduction.

### Audit des Composants

| Fichier | Strings trouvées | Action |
|---------|------------------|--------|
| `WorkflowStepContainer.tsx` | "Démarrage...", "Préparation..." | Remplacer |
| `ThinkingIndicator.tsx` | "L'agent réfléchit..." | Déjà i18n ✓ |
| `StreamingText.tsx` | Aucune | OK ✓ |
| `SuggestionCards.tsx` | "Suggestions" | Remplacer |
| `WorkflowStepView.tsx` | "Continuer", "Passer" | Vérifier |

### Clés à Ajouter

```typescript
// src/i18n/translations.ts

export const translations = {
  en: {
    // Streaming
    'streaming.thinking': 'The agent is thinking...',
    'streaming.thinkingDone': 'Analysis complete',
    'streaming.analyzing': 'Analyzing...',
    'streaming.error': 'An error occurred',
    'streaming.connectionLost': 'Connection lost',
    'streaming.reconnecting': 'Reconnecting...',
    
    // Workflow
    'workflow.starting': 'Starting...',
    'workflow.preparing': 'Preparing workflow...',
    'workflow.loading': 'Loading step...',
    'workflow.submitting': 'Submitting...',
    'workflow.goBack': 'Go back',
    'workflow.continue': 'Continue',
    'workflow.skip': 'Skip this step',
    'workflow.complete': 'Complete',
    'workflow.error': 'An error occurred',
    'workflow.cancel': 'Cancel workflow',
    
    // Suggestions
    'suggestions.title': 'Suggestions',
    'suggestions.empty': 'No suggestions available',
    
    // Errors
    'error.generic': 'Something went wrong',
    'error.network': 'Network error',
    'error.timeout': 'Request timed out',
    'error.retry': 'Try again',
  },
  
  fr: {
    // Streaming
    'streaming.thinking': "L'agent réfléchit...",
    'streaming.thinkingDone': 'Analyse terminée',
    'streaming.analyzing': 'Analyse en cours...',
    'streaming.error': 'Une erreur est survenue',
    'streaming.connectionLost': 'Connexion perdue',
    'streaming.reconnecting': 'Reconnexion...',
    
    // Workflow
    'workflow.starting': 'Démarrage...',
    'workflow.preparing': 'Préparation du workflow...',
    'workflow.loading': 'Chargement...',
    'workflow.submitting': 'Envoi en cours...',
    'workflow.goBack': 'Retour',
    'workflow.continue': 'Continuer',
    'workflow.skip': 'Passer cette étape',
    'workflow.complete': 'Terminer',
    'workflow.error': 'Une erreur est survenue',
    'workflow.cancel': 'Annuler',
    
    // Suggestions
    'suggestions.title': 'Suggestions',
    'suggestions.empty': 'Aucune suggestion disponible',
    
    // Errors
    'error.generic': 'Une erreur est survenue',
    'error.network': 'Erreur réseau',
    'error.timeout': 'Délai dépassé',
    'error.retry': 'Réessayer',
  },
  
  es: {
    // Streaming
    'streaming.thinking': 'El agente está pensando...',
    'streaming.thinkingDone': 'Análisis completo',
    'streaming.analyzing': 'Analizando...',
    'streaming.error': 'Se produjo un error',
    'streaming.connectionLost': 'Conexión perdida',
    'streaming.reconnecting': 'Reconectando...',
    
    // Workflow
    'workflow.starting': 'Iniciando...',
    'workflow.preparing': 'Preparando workflow...',
    'workflow.loading': 'Cargando...',
    'workflow.submitting': 'Enviando...',
    'workflow.goBack': 'Volver',
    'workflow.continue': 'Continuar',
    'workflow.skip': 'Saltar este paso',
    'workflow.complete': 'Completar',
    'workflow.error': 'Se produjo un error',
    'workflow.cancel': 'Cancelar',
    
    // Suggestions
    'suggestions.title': 'Sugerencias',
    'suggestions.empty': 'No hay sugerencias disponibles',
    
    // Errors
    'error.generic': 'Algo salió mal',
    'error.network': 'Error de red',
    'error.timeout': 'Tiempo de espera agotado',
    'error.retry': 'Intentar de nuevo',
  }
}
```

### Critères d'Acceptation

- [ ] Aucune string UI hardcodée dans les composants modifiés
- [ ] Toutes les nouvelles clés existent en EN, FR, ES
- [ ] Langue par défaut respectée au chargement
- [ ] Pas de régression sur les traductions existantes
- [ ] Test visuel dans les 3 langues

### Durée Estimée : 1 jour

---

## Plan de Migration

### Ordre d'Implémentation

```
Semaine 1 (3.5j):
├── [0] Instrumentation (0.5j)
│   └── Métriques baseline capturées
├── [A] Nettoyage dual (1.5j)
│   └── Stores séparés, WS supprimé
└── [B] Single call (1j)
    └── 1 appel au start
    └── Buffer tests (0.5j)

Semaine 2 (4.5j):
├── [C] Streaming + Thinking (3j)
│   └── SSE fonctionnel
│   └── UI thinking + cursor
├── [D] Contexte compact (1j)
│   └── Facts only, max_tokens
└── [E] i18n (0.5j)
    └── Strings remplacées
```

### Feature Flags

```yaml
# config/features.yaml

features:
  # Streaming SSE pour workflows
  enable_step_streaming:
    default: false
    description: "Enable SSE streaming for workflow steps"
    rollout:
      - dev: true
      - staging: true
      - production: false  # Activer après validation
  
  # Contexte compact
  enable_compact_context:
    default: true
    description: "Use facts-based compact context instead of full documents"
  
  # Fallback thinking local
  enable_local_thinking:
    default: true
    description: "Show local thinking phrases when streaming unavailable"
  
  # Métriques détaillées
  enable_detailed_metrics:
    default: true
    description: "Log detailed LLM metrics"
```

```python
# Usage dans le code
from config.features import is_enabled

if is_enabled("enable_step_streaming"):
    # Utiliser SSE
    async for chunk in engine.stream_step(session_id):
        yield chunk
else:
    # Fallback: réponse complète
    result = await engine.render_step(session_id)
    yield {"type": "complete", "data": result}
```

### Rollback Strategy

| Sous-task | Rollback |
|-----------|----------|
| Instrumentation | Désactiver logging (impact: 0) |
| Dual cleanup | Réactiver WS dans store (nécessite code backup) |
| Single call | Réactiver fetchStep() dans useEffect |
| Streaming | Feature flag off → fallback non-stream |
| Contexte | Feature flag off → full documents |
| i18n | Aucun rollback nécessaire |

---

## Métriques de Succès

### Objectifs Phase 2

| Métrique | Baseline | Objectif | Validation |
|----------|----------|----------|------------|
| TTFT | ~3-5s | < 1s | `metrics.get_baseline_report()["ttft"]["avg"]` |
| Calls au start | 2 | 1 | Logs LLM_CALL count |
| Contexte tokens | ~10000 | < 3000 | Logs context_tokens_est |
| Coût/session | 100% | 60% | (input + output) * prix |
| Strings hardcodées | 50+ | 0 | Audit grep |

### Dashboard Métriques

Endpoint `/api/metrics/baseline` retourne :

```json
{
  "ttft": {
    "avg": 0.89,
    "p50": 0.82,
    "p95": 1.4,
    "target": 1.0,
    "status": "✅ PASS"
  },
  "calls_per_session": {
    "current": 1.2,
    "target": 1.0,
    "status": "⚠️ CLOSE"
  },
  "tokens": {
    "avg_context": 2450,
    "target": 3000,
    "status": "✅ PASS"
  },
  "cost_reduction": {
    "current_vs_baseline": 0.58,
    "target": 0.60,
    "status": "✅ PASS"
  }
}
```

---

## Tests

### Unit Tests

```python
# tests/test_metrics.py
def test_metrics_collector_singleton():
    m1 = MetricsCollector()
    m2 = MetricsCollector()
    assert m1 is m2

def test_ttft_measurement():
    call = metrics.new_call("test", "step_render")
    time.sleep(0.1)
    call.mark_first_token()
    assert 0.09 < call.time_to_first_token < 0.15

def test_baseline_report_empty():
    metrics.reset()
    report = metrics.get_baseline_report()
    assert "error" in report
```

```typescript
// tests/useStreamingResponse.test.ts
describe('useStreamingResponse', () => {
  it('should accumulate thinking events', async () => {
    const { result } = renderHook(() => useStreamingResponse())
    
    // Simulate SSE events
    act(() => result.current.startStream('/mock'))
    
    // Mock event
    mockEventSource.emit({ type: 'thinking', content: 'Test thought' })
    
    expect(result.current.thoughts).toContain('Test thought')
  })
})
```

### Integration Tests

```python
# tests/test_workflow_start.py
async def test_single_call_start():
    """Vérifie qu'un seul appel LLM est fait au démarrage"""
    metrics.reset()
    
    response = await client.post("/api/workflows/start", json={
        "workflow_id": "game-brief",
        "project_id": "test-project",
        "project_path": "/tmp/test"
    })
    
    assert response.status_code == 200
    assert "session" in response.json()
    assert "step" in response.json()
    
    # Vérifier qu'un seul appel a été fait
    report = metrics.get_baseline_report()
    assert report["total_calls"] == 1
```

### E2E Tests

```typescript
// cypress/e2e/workflow-streaming.cy.ts
describe('Workflow Streaming', () => {
  it('should show thinking indicator within 1s', () => {
    cy.visit('/studio')
    cy.get('[data-testid="start-workflow"]').click()
    
    // Thinking devrait apparaître en < 1s
    cy.get('[data-testid="thinking-indicator"]', { timeout: 1000 })
      .should('be.visible')
  })
  
  it('should display streaming text', () => {
    cy.visit('/studio')
    cy.get('[data-testid="start-workflow"]').click()
    
    // Attendre le streaming text
    cy.get('[data-testid="streaming-text"]', { timeout: 5000 })
      .should('contain.text', '')  // Non vide
  })
})
```

---

## Risques et Mitigations

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Streaming coupe le JSON | Frontend crash | Moyenne | Parser tolérant + event complete |
| Provider sans streaming | UX dégradée | Basse | Fallback thinking local |
| Cache facts obsolète | Réponses incohérentes | Moyenne | Hash invalidation + TTL |
| Contexte trop court | Réponses pauvres | Basse | Fallback summary + docs critiques |
| Régression workflows | Fonctionnalité cassée | Haute | Tests E2E + feature flags |
| Memory leak SSE | Performance | Moyenne | Cleanup EventSource dans useEffect |

---

## Checklist Finale

### Backend

- [ ] `services/metrics.py` créé avec singleton
- [ ] `api/metrics.py` endpoints fonctionnels
- [ ] `api/workflows.py` SSE endpoint ajouté
- [ ] `services/llm.py` stream_with_thinking implémenté
- [ ] `services/workflow/engine.py` project_id corrigé
- [ ] `services/knowledge/context_builder.py` max_tokens ajouté
- [ ] Feature flags configurés

### Frontend

- [ ] `stores/workflowStore.ts` WebSocket supprimé
- [ ] `stores/chatStore.ts` créé
- [ ] `hooks/useStreamingResponse.ts` créé
- [ ] `hooks/useMetrics.ts` créé
- [ ] `components/common/ThinkingIndicator.tsx` créé
- [ ] `components/common/StreamingText.tsx` créé
- [ ] `components/workflow/WorkflowStepContainer.tsx` mis à jour
- [ ] `i18n/translations.ts` clés ajoutées

### Tests

- [ ] Unit tests: metrics, streaming hook, stores
- [ ] Integration tests: single call, SSE
- [ ] E2E tests: workflow streaming

### Documentation

- [ ] CHANGELOG mis à jour
- [ ] README mis à jour si nécessaire
- [ ] Métriques baseline documentées

---

## Notes

1. **Priorité au TTFT** : La vitesse perçue (premier feedback visible) est plus importante que la vitesse totale.

2. **Instrumenter d'abord** : Impossible d'améliorer sans mesurer. Toujours baseline → change → measure.

3. **Feature flags** : Permettent un rollout progressif et un rollback rapide si problème.

4. **Streaming = UX** : L'impact psychologique du feedback immédiat est majeur pour l'expérience utilisateur.

5. **Contexte compact** : Moins de tokens = moins cher + plus rapide + réponses souvent meilleures (moins de distraction).

---

## Références

- [P2.10 - LLM Performance Architecture](./P2.10-llm-performance-architecture.md)
- [TASK - Workflow Step Architecture](./TASK-workflow-step-architecture.md)
- [Server-Sent Events (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Anthropic Streaming](https://docs.anthropic.com/en/api/streaming)
