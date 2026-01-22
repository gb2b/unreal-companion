# Unreal Companion

Interface web moderne pour interagir avec Unreal Engine via IA.

## Vision

- **Chat multi-agents** : Game Designer, Architect, Developer, 3D Artist, Level Designer
- **Logs temps réel** : Visualisation des actions MCP
- **Multi-projets** : Gérer plusieurs projets UE avec contextes distincts
- **Context documentaire** : GDD, architecture, images de référence
- **Voice input** : Parler au lieu de taper
- **Vision** : Envoyer des images à Claude pour analyse
- **Génération 3D** : Créer des modèles 3D via Meshy et les importer dans UE

## Quick Start

```bash
# Lancer (build frontend + start backend)
./start.sh

# Ou manuellement
npm run build                                              # Build frontend
cd server && source .venv/bin/activate && python main.py   # Start server
```

**URL:** http://localhost:3179 (ou http://unreal-companion.local:3179)

**Optional vhost:** Ajouter `127.0.0.1 unreal-companion.local` dans `/etc/hosts`

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Stack, diagrammes, structure dossiers |
| [TASKS.md](./TASKS.md) | Backlog ordonné (62 tasks en 7 phases) |
| `tasks/*.md` | Détail de chaque task |

## Stack

| Composant | Techno |
|-----------|--------|
| Frontend | React + Vite + TypeScript + Tailwind |
| UI | shadcn/ui |
| State | Zustand |
| Backend | FastAPI (Python) |
| Database | SQLite |
| LLM | Claude API |
| 3D Gen | Meshy API |
| Voice | OpenAI Whisper |

## Phases

1. **Foundation** (8 tasks) - Setup frontend + backend + DB
2. **Core Features** (12 tasks) - Chat, Logs, WebSocket, MCP
3. **Projects** (10 tasks) - Multi-projet, persistence
4. **Context** (8 tasks) - Upload fichiers, inclusion prompts
5. **Agents** (6 tasks) - Multi-agents spécialisés
6. **Advanced** (10 tasks) - Voice, Vision, 3D Generation
7. **Polish** (8 tasks) - Thèmes, shortcuts, responsive
