# Phase 5 - Memories System

**Objectif:** Implémenter le système de memories pour la persistance du contexte.

---

## 5.1 Format memories.yaml

**Emplacement projet:** `{project}/.unreal-companion/memories.yaml`

### Structure

```yaml
version: "1.0"
last_updated: "2026-01-27T10:30:00Z"

# Memories globales (tous les agents)
project:
  - id: "m1"
    content: "Le jeu est un roguelike deck-builder"
    source: "game-brief workflow"
    created: "2026-01-27T10:00:00Z"
    tags: ["genre", "concept"]
  
  - id: "m2"
    content: "Target: PC + Mobile, 60fps minimum"
    source: "conversation"
    created: "2026-01-27T10:15:00Z"
    tags: ["platform", "performance"]

# Memories par agent
agents:
  game-designer:
    - id: "gd1"
      content: "User préfère mécaniques inspirées de Slay the Spire"
      source: "brainstorming"
      created: "2026-01-27T10:20:00Z"
  
  game-architect:
    - id: "ga1"
      content: "Architecture modulaire préférée"
      source: "conversation"
      created: "2026-01-27T10:25:00Z"
```

### Tâches

- [ ] Créer template `frameworks/project/memories.yaml.template`
- [ ] Documenter le format dans `frameworks/README.md`

---

## 5.2 CLI - Commandes memories

**Fichiers:** `cli/src/commands/memories.js`

### Commandes à implémenter

```bash
# Lister toutes les memories
npx unreal-companion memories list
npx unreal-companion memories list --agent game-designer
npx unreal-companion memories list --tag genre

# Ajouter une memory
npx unreal-companion memories add "Le jeu cible mobile"
npx unreal-companion memories add "Préfère UI minimaliste" --agent game-designer
npx unreal-companion memories add "60fps target" --tags "performance,mobile"

# Supprimer une memory
npx unreal-companion memories remove m1
npx unreal-companion memories remove gd1 --agent game-designer

# Tout effacer (avec confirmation)
npx unreal-companion memories clear
npx unreal-companion memories clear --agent game-designer
```

### Tâches

- [ ] Créer `cli/src/commands/memories.js`
- [ ] Implémenter `list` - Lire et afficher memories.yaml
- [ ] Implémenter `add` - Ajouter une memory avec ID auto-généré
- [ ] Implémenter `remove` - Supprimer par ID
- [ ] Implémenter `clear` - Effacer avec confirmation
- [ ] Ajouter commande dans `cli/src/index.js`

---

## 5.3 CLI - Helpers memories

**Fichiers:** `cli/src/utils/memories.js`

### Fonctions à implémenter

```javascript
// Charger memories.yaml
export function loadMemories(projectPath) {}

// Sauvegarder memories.yaml
export function saveMemories(projectPath, memories) {}

// Générer un ID unique
export function generateMemoryId(prefix = 'm') {}

// Ajouter une memory
export function addMemory(projectPath, content, options = {}) {}

// Supprimer une memory
export function removeMemory(projectPath, memoryId, agentId = null) {}

// Rechercher memories par tag
export function findMemoriesByTag(memories, tag) {}

// Rechercher memories par agent
export function getAgentMemories(memories, agentId) {}
```

### Tâches

- [ ] Créer `cli/src/utils/memories.js`
- [ ] Implémenter toutes les fonctions
- [ ] Ajouter validation YAML
- [ ] Gérer les erreurs (fichier manquant, format invalide)

---

## 5.4 Web UI Backend - MemoriesService

**Fichiers:** `web-ui/server/services/memories.py`

### Classe à implémenter

```python
class MemoriesService:
    def __init__(self, project_path: str):
        self.project_path = project_path
        self.memories_file = Path(project_path) / ".unreal-companion" / "memories.yaml"
    
    def load(self) -> dict:
        """Charger memories.yaml"""
        pass
    
    def save(self, memories: dict) -> None:
        """Sauvegarder memories.yaml"""
        pass
    
    def list_all(self) -> list:
        """Lister toutes les memories (project + agents)"""
        pass
    
    def list_project(self) -> list:
        """Lister memories projet"""
        pass
    
    def list_agent(self, agent_id: str) -> list:
        """Lister memories d'un agent"""
        pass
    
    def add(self, content: str, agent_id: str = None, tags: list = None, source: str = "web-ui") -> str:
        """Ajouter une memory, retourne l'ID"""
        pass
    
    def remove(self, memory_id: str, agent_id: str = None) -> bool:
        """Supprimer une memory"""
        pass
    
    def clear(self, agent_id: str = None) -> int:
        """Effacer memories, retourne le nombre supprimé"""
        pass
    
    def search(self, query: str) -> list:
        """Rechercher dans le contenu des memories"""
        pass
```

### Tâches

- [ ] Créer `web-ui/server/services/memories.py`
- [ ] Implémenter `MemoriesService`
- [ ] Ajouter tests unitaires

---

## 5.5 Web UI Backend - API Endpoints

**Fichiers:** `web-ui/server/api/memories.py`

### Endpoints à implémenter

```python
# GET /api/memories
# Lister toutes les memories
@router.get("/memories")
async def list_memories(agent_id: str = None, tag: str = None):
    pass

# POST /api/memories
# Ajouter une memory
@router.post("/memories")
async def add_memory(content: str, agent_id: str = None, tags: list = None):
    pass

# DELETE /api/memories/{memory_id}
# Supprimer une memory
@router.delete("/memories/{memory_id}")
async def remove_memory(memory_id: str, agent_id: str = None):
    pass

# DELETE /api/memories
# Effacer toutes les memories
@router.delete("/memories")
async def clear_memories(agent_id: str = None):
    pass

# GET /api/memories/search
# Rechercher
@router.get("/memories/search")
async def search_memories(query: str):
    pass
```

### Tâches

- [ ] Créer `web-ui/server/api/memories.py`
- [ ] Implémenter tous les endpoints
- [ ] Ajouter router dans `web-ui/server/main.py`
- [ ] Documenter API

---

## 5.6 Web UI Frontend - Page Memories

**Fichiers:** `web-ui/src/pages/MemoriesPage.tsx` (ou similaire)

### Composants à créer

- [ ] `MemoriesPage` - Page principale
- [ ] `MemoryList` - Liste des memories avec filtres
- [ ] `MemoryItem` - Affichage d'une memory
- [ ] `MemoryForm` - Formulaire ajout/édition
- [ ] `MemoryFilters` - Filtres (agent, tag, recherche)

### Fonctionnalités

- [ ] Voir toutes les memories (projet + agents)
- [ ] Filtrer par agent
- [ ] Filtrer par tag
- [ ] Rechercher dans le contenu
- [ ] Ajouter une memory
- [ ] Modifier une memory
- [ ] Supprimer une memory (avec confirmation)
- [ ] Effacer tout (avec confirmation)

---

## 5.7 Rules - Instructions memories

### Instructions pour le LLM

Les rules doivent inclure des instructions pour que le LLM :

1. **Charge les memories** au début de chaque session
2. **Propose de sauvegarder** quand il détecte une info importante
3. **Supporte les commandes** `/memories`, `/memory add`, etc.

### Types d'infos à retenir automatiquement

- Genre et concept du jeu
- Plateformes cibles
- Contraintes de performance
- Préférences de communication
- Décisions techniques importantes
- Patterns récurrents

### Tâches

- [ ] Mettre à jour `memories.mdc.template` avec instructions complètes
- [ ] Documenter le comportement attendu du LLM

---

## 5.8 Intégration workflow

### Chargement au début

```yaml
# Dans workflow.yaml
preload:
  - memories: "{project}/.unreal-companion/memories.yaml"
```

### Sauvegarde automatique

Après un workflow, proposer de sauvegarder les infos clés découvertes.

### Tâches

- [ ] Mettre à jour le workflow-engine pour charger les memories
- [ ] Ajouter hook de fin de workflow pour proposition de sauvegarde

---

## Critères de validation

- [ ] memories.yaml créé à l'init projet
- [ ] CLI commandes fonctionnelles
- [ ] API endpoints fonctionnels
- [ ] UI Web permet CRUD complet
- [ ] LLM peut lire/écrire memories via chat
- [ ] Memories chargées au début des workflows

---

## Notes

- Les memories sont stockées localement (pas de sync cloud)
- Le format YAML est choisi pour la lisibilité humaine
- Les IDs sont préfixés (`m` pour projet, initiales agent pour agents)
- Les tags sont optionnels mais utiles pour le filtrage
