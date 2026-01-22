import { useState, useEffect, useCallback } from 'react'
import { 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink,
  Eye,
  EyeOff,
  Sparkles,
  Plug,
  XCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/services/api'
import { cn } from '@/lib/utils'

interface ServiceStatus {
  configured: boolean
  connected: boolean
  message: string
}

interface ExternalService {
  id: string
  name: string
  description: string
  icon: string
  gradient: string
  accent: string
  getKeyUrl: string
  keyPrefix: string
  envVar: string
}

const SERVICES: ExternalService[] = [
  {
    id: 'meshy',
    name: 'Meshy AI',
    description: 'Génération de modèles 3D à partir de texte',
    icon: '🎨',
    gradient: 'from-fuchsia-500/20 to-pink-500/20',
    accent: 'text-fuchsia-400',
    getKeyUrl: 'https://app.meshy.ai/settings/api',
    keyPrefix: 'msy_',
    envVar: 'MESHY_API_KEY',
  },
]

export function ExternalServicesTab() {
  const [statuses, setStatuses] = useState<Record<string, ServiceStatus>>({})
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({})
  const [showKey, setShowKey] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({})

  const fetchStatus = useCallback(async (serviceId: string) => {
    try {
      // Use service-specific endpoint (e.g., /api/meshy/status)
      const data = await api.get<ServiceStatus>(`/api/${serviceId}/status`)
      setStatuses(prev => ({ ...prev, [serviceId]: data }))
    } catch {
      setStatuses(prev => ({ 
        ...prev, 
        [serviceId]: { configured: false, connected: false, message: 'Not configured' } 
      }))
    }
  }, [])

  useEffect(() => {
    SERVICES.forEach(service => fetchStatus(service.id))
  }, [fetchStatus])

  const handleSaveKey = async (serviceId: string) => {
    const key = keyInputs[serviceId]
    if (!key?.trim()) return

    setSaving(serviceId)
    try {
      // Use service-specific endpoint (e.g., /api/meshy/config)
      await api.post(`/api/${serviceId}/config`, { api_key: key })
      setKeyInputs(prev => ({ ...prev, [serviceId]: '' }))
      await fetchStatus(serviceId)
      setTestResults(prev => ({ ...prev, [serviceId]: { ok: true, message: 'Key saved' } }))
    } catch (error) {
      console.error('Failed to save key:', error)
      setTestResults(prev => ({ ...prev, [serviceId]: { ok: false, message: 'Failed to save' } }))
    } finally {
      setSaving(null)
    }
  }

  const handleTestConnection = async (serviceId: string) => {
    setTesting(serviceId)
    try {
      // Use service-specific endpoint (e.g., /api/meshy/test)
      const result = await api.post<{ ok: boolean; message?: string; error?: string }>(
        `/api/${serviceId}/test`
      )
      setTestResults(prev => ({ 
        ...prev, 
        [serviceId]: { 
          ok: result.ok, 
          message: result.ok ? 'Connection successful!' : (result.error || 'Connection failed') 
        } 
      }))
      if (result.ok) {
        await fetchStatus(serviceId)
      }
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        [serviceId]: { ok: false, message: 'Test failed' } 
      }))
    } finally {
      setTesting(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold bg-gradient-to-r from-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
          Services Externes
        </h2>
        <p className="text-sm text-muted-foreground">
          Configurez vos services tiers pour la génération 3D, audio, etc.
        </p>
      </div>

      {/* Services List */}
      <div className="space-y-4">
        {SERVICES.map(service => {
          const status = statuses[service.id]
          const isConfigured = status?.configured
          const isConnected = status?.connected

          return (
            <div
              key={service.id}
              className={cn(
                "rounded-xl border overflow-hidden",
                isConnected 
                  ? "border-emerald-500/50" 
                  : isConfigured 
                    ? "border-amber-500/50"
                    : "border-border"
              )}
            >
              {/* Header */}
              <div className={cn(
                "p-4 bg-gradient-to-r",
                service.gradient
              )}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{service.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{service.name}</h3>
                        {isConnected ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                            <CheckCircle2 className="h-3 w-3" />
                            Connecté
                          </span>
                        ) : isConfigured ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs">
                            <AlertCircle className="h-3 w-3" />
                            Configuré
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => fetchStatus(service.id)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <a 
                      href={service.getKeyUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={cn("text-sm flex items-center gap-1 hover:underline", service.accent)}
                    >
                      Get Key <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4 bg-card/50">
                {/* Status */}
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    isConnected ? "bg-emerald-500" : isConfigured ? "bg-amber-500" : "bg-muted-foreground"
                  )} />
                  <span className="text-sm">
                    {isConnected 
                      ? "Service opérationnel" 
                      : isConfigured 
                        ? status?.message || "Vérification en cours..."
                        : "Non configuré"}
                  </span>
                </div>

                {/* API Key Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    API Key
                    {isConfigured && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Configured
                      </span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showKey[service.id] ? 'text' : 'password'}
                        value={keyInputs[service.id] || ''}
                        onChange={(e) => setKeyInputs(prev => ({ ...prev, [service.id]: e.target.value }))}
                        placeholder={isConfigured ? '••••••••' : `${service.keyPrefix}...`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(prev => ({ ...prev, [service.id]: !prev[service.id] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showKey[service.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button 
                      onClick={() => handleSaveKey(service.id)} 
                      disabled={!keyInputs[service.id]?.trim() || saving === service.id}
                    >
                      {saving === service.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        'Save'
                      )}
                    </Button>
                  </div>
                </div>

                {/* Test Connection */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestConnection(service.id)}
                    disabled={!isConfigured || testing === service.id}
                  >
                    {testing === service.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plug className="h-4 w-4 mr-2" />
                    )}
                    Test Connection
                  </Button>
                  
                  {testResults[service.id] && (
                    <span className={cn(
                      "text-xs flex items-center gap-1",
                      testResults[service.id].ok ? "text-emerald-400" : "text-red-400"
                    )}>
                      {testResults[service.id].ok ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {testResults[service.id].message}
                    </span>
                  )}
                </div>

                {/* Features Preview */}
                {service.id === 'meshy' && (
                  <div className="p-3 rounded-lg bg-gradient-to-r from-fuchsia-500/10 to-pink-500/10 border border-fuchsia-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-fuchsia-400" />
                      <span className="text-sm font-medium">Fonctionnalités</span>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Génération Text-to-3D</li>
                      <li>• Rigging & Animation automatique</li>
                      <li>• Export GLB/FBX pour Unreal Engine</li>
                      <li>• Intégration avec le chat LLM (agent 3D Artist)</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Placeholder for future services */}
      <div className="p-4 rounded-xl border border-dashed border-border text-center">
        <p className="text-muted-foreground text-sm">
          Plus de services bientôt disponibles...
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Tripo 3D, ElevenLabs, Whisper, etc.
        </p>
      </div>
    </div>
  )
}
