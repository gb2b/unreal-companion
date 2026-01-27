# Phase 8 - Tests & Validation

**Objectif:** Valider que tout fonctionne correctement après la restructuration.

---

## 8.1 Tests Structure

### Vérification structure fichiers

- [ ] Tous les dossiers de phases existent
- [ ] Tous les workflows déplacés sont accessibles
- [ ] Pas de fichiers orphelins
- [ ] README.md à jour

### Commandes de vérification

```bash
# Vérifier structure
ls -la frameworks/workflows/
ls -la frameworks/workflows/1-preproduction/
ls -la frameworks/agents/
ls -la frameworks/skills/
ls -la frameworks/rules-templates/

# Vérifier qu'aucun workflow n'est à la racine
ls frameworks/workflows/*.yaml 2>/dev/null && echo "ERREUR: workflows à la racine"
```

---

## 8.2 Tests Agents

### Parser agent.md

```javascript
// Test JS
import matter from 'gray-matter';
const content = fs.readFileSync('frameworks/agents/game-designer/agent.md');
const { data } = matter(content);
assert(data.id === 'game-designer');
assert(Array.isArray(data.skills));
```

```python
# Test Python
import frontmatter
post = frontmatter.load('frameworks/agents/game-designer/agent.md')
assert post.metadata['id'] == 'game-designer'
assert isinstance(post.metadata.get('skills', []), list)
```

### Tâches

- [ ] Tester parsing de chaque agent.md
- [ ] Vérifier que tous les skills référencés existent
- [ ] Vérifier que les triggers sont uniques

---

## 8.3 Tests Skills

### Validation SKILL.md

```python
def test_skill_format(skill_path):
    skill_file = skill_path / "SKILL.md"
    assert skill_file.exists(), f"SKILL.md manquant: {skill_path}"
    
    post = frontmatter.load(skill_file)
    assert 'name' in post.metadata
    assert 'description' in post.metadata
    assert len(post.content) > 100  # Contenu substantiel
```

### Tâches

- [ ] Tester que chaque skill a un SKILL.md valide
- [ ] Vérifier frontmatter complet
- [ ] Vérifier contenu non vide

---

## 8.4 Tests Workflows

### Validation workflow.yaml

```python
def test_workflow_format(workflow_path):
    yaml_file = workflow_path / "workflow.yaml"
    assert yaml_file.exists()
    
    with open(yaml_file) as f:
        data = yaml.safe_load(f)
    
    assert 'id' in data
    assert 'name' in data
    assert 'description' in data
```

### Tâches

- [ ] Tester que chaque workflow a workflow.yaml valide
- [ ] Vérifier que les fichiers référencés existent (instructions.md, steps/, etc.)
- [ ] Tester parsing XML si instructions.xml existe

---

## 8.5 Tests CLI

### Installation globale

```bash
# Test installation
cd /tmp
npx unreal-companion install --yes

# Vérifier fichiers créés
ls -la ~/.unreal-companion/
ls -la ~/.cursor/rules/companion/ 2>/dev/null
ls -la ~/.cursor/skills/ 2>/dev/null
ls -la ~/.claude/ 2>/dev/null
```

### Installation projet

```bash
# Test init projet
mkdir /tmp/test-project && cd /tmp/test-project
npx unreal-companion init --name "Test Project"

# Vérifier fichiers créés
ls -la .unreal-companion/
cat .unreal-companion/config.yaml
```

### Commandes

```bash
# Test status
npx unreal-companion --status

# Test memories
npx unreal-companion memories list
npx unreal-companion memories add "Test memory"
npx unreal-companion memories list
npx unreal-companion memories remove m1

# Test agent
npx unreal-companion agent list
npx unreal-companion agent show game-designer
```

### Tâches

- [ ] Tester installation globale avec chaque IDE
- [ ] Tester init projet
- [ ] Tester toutes les commandes
- [ ] Vérifier aucune régression

---

## 8.6 Tests Web UI Backend

### Tests unitaires Python

```python
# test_unified_loader.py
def test_load_workflows_by_phase():
    workflows = load_workflows()
    phases = set(w['category'] for w in workflows)
    assert '1-preproduction' in phases
    assert '2-design' in phases

def test_load_agents():
    agents = load_agents()
    assert any(a['id'] == 'game-designer' for a in agents)
    game_designer = next(a for a in agents if a['id'] == 'game-designer')
    assert 'skills' in game_designer

def test_load_skills():
    skills = load_skills()
    assert len(skills) > 0
    assert all('id' in s and 'name' in s for s in skills)
```

### Tests API

```bash
# Test endpoints
curl http://localhost:8000/api/workflows
curl http://localhost:8000/api/workflows?phase=1-preproduction
curl http://localhost:8000/api/agents
curl http://localhost:8000/api/skills
curl http://localhost:8000/api/memories
```

### Tâches

- [ ] Écrire tests unitaires pour unified_loader
- [ ] Écrire tests pour MemoriesService
- [ ] Tester tous les endpoints API
- [ ] Vérifier réponses JSON correctes

---

## 8.7 Tests Web UI Frontend

### Tests manuels

- [ ] Page Workflows - Affiche workflows groupés par phase
- [ ] Page Agents - Affiche agents avec skills
- [ ] Agent Customization - Peut modifier et sauvegarder
- [ ] Page Memories - CRUD complet fonctionne
- [ ] Page Skills - Liste correcte

### Tests E2E (si applicable)

- [ ] Lancer un workflow complet
- [ ] Vérifier sauvegarde output
- [ ] Vérifier mise à jour workflow-status.yaml

---

## 8.8 Tests Intégration IDE

### Cursor

- [ ] Installer avec `npx unreal-companion install`
- [ ] Ouvrir Cursor dans un projet initialisé
- [ ] Vérifier que les rules sont chargées
- [ ] Tester activation d'un agent via chat
- [ ] Tester commande `/workflow game-brief`
- [ ] Tester commande `/memories`

### Claude Code

- [ ] Installer avec `npx unreal-companion install`
- [ ] Ouvrir Claude Code
- [ ] Vérifier que CLAUDE.md est lu
- [ ] Tester activation agent
- [ ] Tester workflow

### Autres IDE

- [ ] Windsurf (si disponible)
- [ ] VS Code Copilot (si disponible)

---

## 8.9 Tests Memories

### Scénario complet

1. [ ] Init projet
2. [ ] Ajouter memory via CLI
3. [ ] Vérifier dans Web UI
4. [ ] Modifier via Web UI
5. [ ] Vérifier via CLI
6. [ ] Supprimer via LLM chat
7. [ ] Vérifier fichier memories.yaml

### Test persistance

- [ ] Memories survivent au redémarrage serveur
- [ ] Memories survivent au redémarrage session LLM

---

## 8.10 Tests Performance

### Temps de chargement

```bash
# Mesurer temps de chargement workflows
time npx unreal-companion --status

# Mesurer temps API
time curl http://localhost:8000/api/workflows
time curl http://localhost:8000/api/agents
```

### Tâches

- [ ] Vérifier que le chargement reste < 2s
- [ ] Identifier goulots d'étranglement si lent

---

## 8.11 Documentation

### Vérifier documentation à jour

- [ ] `frameworks/README.md` reflète nouvelle structure
- [ ] `RECAP.md` complet et précis
- [ ] `CLAUDE.md` et `AGENTS.md` à jour
- [ ] Commentaires dans le code

---

## Checklist finale

### Structure
- [ ] `/frameworks/workflows/{phase}/` correctement organisé
- [ ] `/frameworks/agents/{agent}/agent.md` pour chaque agent
- [ ] `/frameworks/skills/{skill}/SKILL.md` pour chaque skill
- [ ] `/frameworks/rules-templates/{ide}/` pour chaque IDE
- [ ] `/frameworks/teams/team-gamedev/team.md` existe

### CLI
- [ ] `install` fonctionne avec multi-IDE
- [ ] `init` crée structure projet correcte
- [ ] `--status` affiche infos complètes
- [ ] `memories` commandes fonctionnelles
- [ ] `agent` commandes fonctionnelles

### Web UI
- [ ] Backend charge tout correctement
- [ ] API endpoints fonctionnels
- [ ] Frontend affiche données correctes
- [ ] Memories CRUD complet

### IDE
- [ ] Cursor: rules et skills installés
- [ ] Claude Code: CLAUDE.md et skills installés
- [ ] Agents activables via chat
- [ ] Workflows exécutables via chat
- [ ] Memories accessibles via chat

---

## Notes

- Documenter tout bug trouvé
- Créer issues GitHub si nécessaire
- Faire une release après validation complète
