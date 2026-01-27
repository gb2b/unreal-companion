# Phase 7 - Web UI Updates

**Objectif:** Mettre à jour le backend et frontend Web UI pour supporter la nouvelle structure.

---

## 7.1 unified_loader.py - Nouvelle structure

**Fichier:** `web-ui/server/services/unified_loader.py`

### Mise à jour chemins

```python
# Ancien
DEV_WORKFLOWS = PROJECT_ROOT / "frameworks" / "workflows"

# Nouveau - Scanner les phases
WORKFLOW_PHASES = ['1-preproduction', '2-design', '3-technical', '4-production', 'quick-flow', 'tools']

def get_workflows_paths():
    paths = []
    for phase in WORKFLOW_PHASES:
        phase_path = DEV_WORKFLOWS / phase
        if phase_path.exists():
            paths.extend(phase_path.iterdir())
    return paths
```

### Tâches

- [ ] Mettre à jour constantes de chemins
- [ ] Implémenter scan par phases
- [ ] Ajouter phase/catégorie aux métadonnées workflow
- [ ] Tester que tous les workflows sont trouvés

---

## 7.2 unified_loader.py - Parser agent.md

### Parser frontmatter Python

```python
import frontmatter

def load_agent(agent_path: Path) -> dict:
    agent_file = agent_path / "agent.md"
    post = frontmatter.load(agent_file)
    
    return {
        "id": post.metadata.get("id"),
        "name": post.metadata.get("name"),
        "title": post.metadata.get("title"),
        "icon": post.metadata.get("icon"),
        "skills": post.metadata.get("skills", []),
        "triggers": post.metadata.get("triggers", []),
        "content": post.content,
    }
```

### Tâches

- [ ] Ajouter dépendance `python-frontmatter` dans requirements.txt
- [ ] Implémenter `load_agent()` pour parser agent.md
- [ ] Implémenter `load_team()` pour parser team.md
- [ ] Mettre à jour `load_agents()` et `load_teams()`

---

## 7.3 unified_loader.py - Charger skills

### Charger skills

```python
def load_skills(skills_path: Path) -> list:
    skills = []
    for skill_dir in skills_path.iterdir():
        if skill_dir.is_dir():
            skill_file = skill_dir / "SKILL.md"
            if skill_file.exists():
                post = frontmatter.load(skill_file)
                skills.append({
                    "id": skill_dir.name,
                    "name": post.metadata.get("name", skill_dir.name),
                    "description": post.metadata.get("description", ""),
                    "path": str(skill_dir),
                })
    return skills
```

### Tâches

- [ ] Implémenter `load_skills()`
- [ ] Associer skills aux agents (via frontmatter skills)
- [ ] Exposer liste des skills dans l'API

---

## 7.4 workflow/engine.py - Multi-templates

**Fichier:** `web-ui/server/services/workflow/engine.py`

### Support multi-templates

```python
# Dans workflow.yaml:
# templates:
#   - id: full
#     file: templates/full.md
#   - id: lite
#     file: templates/lite.md

def get_templates(self) -> list:
    """Retourne la liste des templates disponibles"""
    pass

def select_template(self, template_id: str) -> Path:
    """Sélectionne un template par ID"""
    pass
```

### Tâches

- [ ] Parser la section `templates` de workflow.yaml
- [ ] Implémenter `get_templates()` et `select_template()`
- [ ] Permettre à l'utilisateur de choisir le template

---

## 7.5 workflow/engine.py - Validation steps

### Validation progressive

```python
def validate_step(self, step_id: str) -> dict:
    """Valide un step et retourne le résultat"""
    # 1. Charger checklist si existe
    # 2. Vérifier critères
    # 3. Retourner résultat
    pass

def save_step_progress(self, step_id: str, data: dict) -> None:
    """Sauvegarde la progression d'un step"""
    pass
```

### Tâches

- [ ] Implémenter validation à chaque step
- [ ] Charger checklists depuis `checklists/*.md`
- [ ] Sauvegarder progression dans workflow-status.yaml

---

## 7.6 API - Endpoints workflows

**Fichier:** `web-ui/server/api/workflows.py`

### Mise à jour endpoints

```python
# GET /api/workflows
# Ajouter filtre par phase
@router.get("/workflows")
async def list_workflows(phase: str = None):
    pass

# GET /api/workflows/{id}/templates
# Lister les templates d'un workflow
@router.get("/workflows/{workflow_id}/templates")
async def get_workflow_templates(workflow_id: str):
    pass
```

### Tâches

- [ ] Ajouter paramètre `phase` au listing
- [ ] Retourner la phase dans les métadonnées workflow
- [ ] Ajouter endpoint pour lister les templates
- [ ] Documenter les changements d'API

---

## 7.7 API - Endpoints agents

**Fichier:** `web-ui/server/api/agents.py`

### Nouveaux endpoints

```python
# GET /api/agents
# Lister avec skills
@router.get("/agents")
async def list_agents():
    # Retourner agents avec leurs skills associés
    pass

# GET /api/agents/{id}/customize
# Obtenir la customization
@router.get("/agents/{agent_id}/customize")
async def get_agent_customization(agent_id: str):
    pass

# POST /api/agents/{id}/customize
# Sauvegarder customization
@router.post("/agents/{agent_id}/customize")
async def save_agent_customization(agent_id: str, data: dict):
    pass

# DELETE /api/agents/{id}/customize
# Reset customization
@router.delete("/agents/{agent_id}/customize")
async def reset_agent_customization(agent_id: str):
    pass
```

### Tâches

- [ ] Retourner skills dans la liste des agents
- [ ] Implémenter endpoints customization
- [ ] Créer `CustomizationService` si nécessaire

---

## 7.8 API - Endpoints skills

**Fichier:** `web-ui/server/api/skills.py` (nouveau)

### Endpoints

```python
# GET /api/skills
# Lister tous les skills
@router.get("/skills")
async def list_skills():
    pass

# GET /api/skills/{id}
# Détails d'un skill
@router.get("/skills/{skill_id}")
async def get_skill(skill_id: str):
    # Retourner SKILL.md parsé
    pass
```

### Tâches

- [ ] Créer `web-ui/server/api/skills.py`
- [ ] Implémenter endpoints
- [ ] Ajouter router dans main.py

---

## 7.9 API - Endpoints memories (voir Phase 5)

Référence: `05-memories.md` section 5.5

---

## 7.10 Frontend - Mise à jour composants

### WorkflowList

- [ ] Grouper workflows par phase
- [ ] Afficher phase comme section/accordion
- [ ] Ajouter filtre par phase

### AgentList

- [ ] Afficher skills de chaque agent
- [ ] Ajouter bouton "Customize"
- [ ] Afficher indicateur si customisé

### AgentCustomization (nouveau)

- [ ] Créer page/modal de customization
- [ ] Champs: nom, avatar, style
- [ ] Preview du rendu
- [ ] Boutons: Save Global, Save Project, Reset

### MemoriesPage (nouveau)

Référence: `05-memories.md` section 5.6

### SkillsList (nouveau)

- [ ] Liste des skills disponibles
- [ ] Affichage description
- [ ] Lien vers agents qui utilisent ce skill

---

## 7.11 Frontend - Navigation

### Mise à jour sidebar/navigation

- [ ] Ajouter section "Memories"
- [ ] Ajouter section "Skills"
- [ ] Organiser workflows par phase dans le menu

---

## Critères de validation

- [ ] Backend charge workflows par phases
- [ ] Backend parse agent.md et team.md
- [ ] Backend charge skills
- [ ] API expose phase dans workflows
- [ ] API endpoints customization fonctionnels
- [ ] API endpoints memories fonctionnels
- [ ] Frontend affiche workflows groupés
- [ ] Frontend permet customization agents
- [ ] Frontend page memories fonctionnelle

---

## Dépendances Python à ajouter

```
python-frontmatter>=1.0.0
```
