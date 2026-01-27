# Phase 1 - Structure de base

**Objectif:** Réorganiser le dossier `/frameworks/` avec la nouvelle structure par phases.

---

## 1.1 Créer structure workflows par phases

**Fichiers:** `frameworks/workflows/`

### Tâches

- [ ] Créer `frameworks/workflows/1-preproduction/`
- [ ] Créer `frameworks/workflows/2-design/`
- [ ] Créer `frameworks/workflows/3-technical/`
- [ ] Créer `frameworks/workflows/4-production/`
- [ ] Créer `frameworks/workflows/quick-flow/`
- [ ] Créer `frameworks/workflows/tools/`

### Déplacements

**1-preproduction:**
- [ ] Déplacer `brainstorming/` → `1-preproduction/brainstorming/`
- [ ] Déplacer `game-brief/` → `1-preproduction/game-brief/`
- [ ] Créer `1-preproduction/quick-brainstorming/` (nouveau)

**2-design:**
- [ ] Déplacer `gdd/` → `2-design/gdd/`
- [ ] Déplacer `narrative/` → `2-design/narrative/`
- [ ] Déplacer `mvp-narrative/` → `2-design/mvp-narrative/`
- [ ] Créer `2-design/art-direction/` (nouveau)
- [ ] Créer `2-design/audio-design/` (nouveau)
- [ ] Créer `2-design/level-design/` (nouveau)

**3-technical:**
- [ ] Déplacer `game-architecture/` → `3-technical/game-architecture/`
- [ ] Déplacer `project-context/` → `3-technical/project-context/`
- [ ] Créer `3-technical/diagram/` (nouveau)

**4-production:**
- [ ] Déplacer `sprint-planning/` → `4-production/sprint-planning/`
- [ ] Déplacer `sprint-status/` → `4-production/sprint-status/`
- [ ] Déplacer `create-story/` → `4-production/create-story/`
- [ ] Déplacer `dev-story/` → `4-production/dev-story/`
- [ ] Déplacer `code-review/` → `4-production/code-review/`
- [ ] Déplacer `retrospective/` → `4-production/retrospective/`

**quick-flow:**
- [ ] Déplacer `quick-prototype/` → `quick-flow/quick-prototype/`
- [ ] Déplacer `quick-dev/` → `quick-flow/quick-dev/`
- [ ] Créer `quick-flow/get-started/` (nouveau)

**tools:**
- [ ] Créer `tools/mind-map/` (nouveau)
- [ ] Créer `tools/mood-board/` (nouveau)
- [ ] Créer `tools/gametest/` (nouveau)
- [ ] Déplacer `workflow-status/` → `tools/workflow-status/`

---

## 1.2 Créer structure skills

**Fichiers:** `frameworks/skills/`

### Tâches

- [ ] Créer `frameworks/skills/` (dossier racine)
- [ ] Créer `.gitkeep` ou `README.md` placeholder

### Structure cible

```
skills/
├── README.md
├── advanced-elicitation/
├── balance-testing/
├── progression-design/
├── performance-testing/
├── code-review/
├── mcp-core-tools/
├── mcp-blueprint-tools/
├── mcp-graph-tools/
├── mcp-world-tools/
├── mcp-asset-tools/
└── mcp-editor-tools/
```

---

## 1.3 Créer structure teams

**Fichiers:** `frameworks/teams/`

### Tâches

- [ ] Créer `frameworks/teams/`
- [ ] Créer `frameworks/teams/team-gamedev/`

---

## 1.4 Créer structure rules-templates

**Fichiers:** `frameworks/rules-templates/`

### Tâches

- [ ] Créer `frameworks/rules-templates/`
- [ ] Créer `frameworks/rules-templates/cursor/`
- [ ] Créer `frameworks/rules-templates/claude-code/`
- [ ] Créer `frameworks/rules-templates/windsurf/`
- [ ] Créer `frameworks/rules-templates/vscode-copilot/`
- [ ] Créer `frameworks/rules-templates/generic/`

---

## 1.5 Mettre à jour project templates

**Fichiers:** `frameworks/project/`

### Tâches

- [ ] Créer `frameworks/project/_config/`
- [ ] Créer `frameworks/project/_config/manifest.yaml.template`
- [ ] Créer `frameworks/project/_config/agents/` (avec `.gitkeep`)
- [ ] Mettre à jour `frameworks/project/config.yaml` si nécessaire
- [ ] Vérifier `frameworks/project/project-context.md`
- [ ] Vérifier `frameworks/project/workflow-status.yaml`

---

## 1.6 Nettoyer ancien contenu

### Tâches

- [ ] Supprimer `frameworks/global/` (remplacé par rules-templates)
- [ ] Supprimer workflows en double à la racine
- [ ] Vérifier qu'aucun fichier orphelin ne reste

---

## 1.7 Mettre à jour README.md

**Fichiers:** `frameworks/README.md`

### Tâches

- [ ] Mettre à jour avec nouvelle structure
- [ ] Documenter chaque dossier
- [ ] Ajouter exemples d'utilisation

---

## Critères de validation

- [ ] Structure de dossiers créée
- [ ] Tous les workflows existants déplacés
- [ ] Aucun fichier orphelin
- [ ] README.md à jour
- [ ] `git status` clean (tout commité)

---

## Notes

- Garder les fichiers `workflow.yaml` et `workflow.md` existants
- Ne pas modifier le contenu des workflows pour l'instant (juste déplacer)
- Les nouveaux workflows vides peuvent avoir juste un `workflow.yaml` minimal
