# Phase 6 - CLI Updates

**Objectif:** Mettre à jour le CLI pour supporter la nouvelle structure.

---

## 6.1 installer.js - Multi-IDE

**Fichier:** `cli/src/utils/installer.js`

### Prompt sélection IDE

```javascript
const SUPPORTED_IDES = [
  { id: 'cursor', name: 'Cursor', configPath: '~/.cursor' },
  { id: 'claude-code', name: 'Claude Code', configPath: '~/.claude' },
  { id: 'windsurf', name: 'Windsurf', configPath: '~/.windsurf' },
  { id: 'vscode-copilot', name: 'VS Code Copilot', configPath: '~/.github' },
  { id: 'generic', name: 'Generic (AGENTS.md)', configPath: null },
];
```

### Tâches

- [ ] Ajouter prompt multi-select pour sélection IDE
- [ ] Sauvegarder la sélection dans manifest.yaml
- [ ] Implémenter installation par IDE :
  - [ ] `installForCursor()` - Copier vers ~/.cursor/rules/, ~/.cursor/skills/
  - [ ] `installForClaudeCode()` - Créer ~/.claude/CLAUDE.md, copier skills
  - [ ] `installForWindsurf()` - Copier vers ~/.windsurf/rules/
  - [ ] `installForVSCodeCopilot()` - Créer ~/.github/instructions/
  - [ ] `installGeneric()` - Créer AGENTS.md à la racine

---

## 6.2 installer.js - Copie Skills

### Fonction copySkills

```javascript
async function copySkills(sourceDir, targetDir) {
  // Copier frameworks/skills/* vers targetDir
  // Préserver la structure des dossiers
  // Ne pas écraser si existe déjà (ou demander)
}
```

### Tâches

- [ ] Implémenter `copySkills()`
- [ ] Appeler lors de l'installation Cursor et Claude Code
- [ ] Gérer les conflits (skill existant)

---

## 6.3 installer.js - Génération Rules

### Fonction generateRules

```javascript
async function generateRulesFromTemplates(ide, projectPath, options) {
  // 1. Charger le template depuis rules-templates/{ide}/
  // 2. Charger la liste des agents et workflows
  // 3. Substituer les variables
  // 4. Écrire les fichiers de rules
}
```

### Variables de substitution

| Variable | Source |
|----------|--------|
| `{{project_name}}` | config.yaml |
| `{{project_path}}` | Chemin absolu |
| `{{version}}` | package.json |
| `{{agents}}` | Liste des agents |
| `{{workflows}}` | Liste des workflows |
| `{{skills}}` | Liste des skills |
| `{{date}}` | Date courante |

### Tâches

- [ ] Implémenter `generateRulesFromTemplates()`
- [ ] Implémenter substitution de variables simples
- [ ] Implémenter boucles `{{#each}}` pour listes
- [ ] Tester avec chaque IDE

---

## 6.4 installer.js - Paths mis à jour

### getSourcePaths()

```javascript
export function getSourcePaths() {
  return {
    packageRoot: root,
    // Structure par phases
    workflows: join(root, 'frameworks', 'workflows'),
    agents: join(root, 'frameworks', 'agents'),
    skills: join(root, 'frameworks', 'skills'),
    teams: join(root, 'frameworks', 'teams'),
    rulesTemplates: join(root, 'frameworks', 'rules-templates'),
    // Templates projet
    projectInit: join(root, 'frameworks', 'project'),
  };
}
```

### Tâches

- [ ] Mettre à jour `getSourcePaths()` avec nouveaux chemins
- [ ] Mettre à jour toutes les fonctions qui utilisent ces chemins

---

## 6.5 workflow-loader.js - Nouvelle structure

**Fichier:** `cli/src/utils/workflow-loader.js`

### Chargement par phases

```javascript
// Ancien: frameworks/workflows/game-brief/
// Nouveau: frameworks/workflows/1-preproduction/game-brief/

async function loadWorkflows(basePath) {
  const phases = ['1-preproduction', '2-design', '3-technical', '4-production', 'quick-flow', 'tools'];
  
  for (const phase of phases) {
    const phasePath = join(basePath, phase);
    // Scanner les sous-dossiers
  }
}
```

### Tâches

- [ ] Mettre à jour `loadWorkflows()` pour scanner les phases
- [ ] Ajouter la phase/catégorie aux métadonnées du workflow
- [ ] Tester que tous les workflows sont trouvés

---

## 6.6 workflow-loader.js - Parser agent.md

### Parser frontmatter

```javascript
import matter from 'gray-matter';

async function loadAgent(agentPath) {
  const content = await fs.readFile(join(agentPath, 'agent.md'), 'utf-8');
  const { data: frontmatter, content: markdown } = matter(content);
  
  return {
    id: frontmatter.id,
    name: frontmatter.name,
    title: frontmatter.title,
    icon: frontmatter.icon,
    skills: frontmatter.skills || [],
    triggers: frontmatter.triggers || [],
    content: markdown,
  };
}
```

### Tâches

- [ ] Ajouter dépendance `gray-matter` si pas présente
- [ ] Implémenter `loadAgent()` pour parser agent.md
- [ ] Mettre à jour `loadAgents()` pour utiliser le nouveau format
- [ ] Implémenter `loadTeam()` pour parser team.md

---

## 6.7 Nouvelles commandes CLI

### agent.js

**Fichier:** `cli/src/commands/agent.js`

```bash
# Lister les agents
npx unreal-companion agent list

# Afficher un agent
npx unreal-companion agent show game-designer

# Customiser un agent
npx unreal-companion agent customize game-designer --name "Zelda" --style "professional"

# Reset customization
npx unreal-companion agent reset game-designer
```

### Tâches

- [ ] Créer `cli/src/commands/agent.js`
- [ ] Implémenter `list` - Lister tous les agents
- [ ] Implémenter `show` - Afficher détails d'un agent
- [ ] Implémenter `customize` - Créer/modifier fichier .customize.yaml
- [ ] Implémenter `reset` - Supprimer customization

---

## 6.8 Commandes memories (voir Phase 5)

Référence: `05-memories.md` section 5.2

---

## 6.9 main.js - Commande status

**Fichier:** `cli/src/commands/main.js`

### Mise à jour status

```javascript
// Ajouter dans --status:
// - Liste des workflows par phase
// - Liste des agents avec skills
// - Compteur de memories
// - IDE configurés
```

### Tâches

- [ ] Afficher workflows groupés par phase
- [ ] Afficher agents avec leurs skills
- [ ] Afficher compteur memories
- [ ] Afficher IDE configurés (depuis manifest.yaml)

---

## 6.10 Tests CLI

### Tâches

- [ ] Tester `npx unreal-companion install` avec chaque IDE
- [ ] Tester `npx unreal-companion init` dans un projet vide
- [ ] Tester `npx unreal-companion --status`
- [ ] Tester commandes memories
- [ ] Tester commandes agent

---

## Critères de validation

- [ ] Installation multi-IDE fonctionnelle
- [ ] Skills copiés correctement
- [ ] Rules générées depuis templates
- [ ] Workflows chargés depuis structure par phases
- [ ] Agents parsés depuis agent.md
- [ ] Nouvelles commandes fonctionnelles
- [ ] Aucune régression sur les commandes existantes

---

## Dépendances à ajouter

```json
{
  "dependencies": {
    "gray-matter": "^4.0.3",
    "inquirer": "^9.2.0"  // Pour prompts interactifs
  }
}
```
