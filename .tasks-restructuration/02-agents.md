# Phase 2 - Format Agents

**Objectif:** Convertir les agents YAML vers le nouveau format `agent.md` (YAML frontmatter + Markdown).

---

## 2.1 Créer structure agents

**Fichiers:** `frameworks/agents/`

### Tâches

- [ ] Créer dossier par agent :
  - [ ] `frameworks/agents/game-designer/`
  - [ ] `frameworks/agents/game-architect/`
  - [ ] `frameworks/agents/game-dev/`
  - [ ] `frameworks/agents/solo-dev/`
  - [ ] `frameworks/agents/game-qa/`
  - [ ] `frameworks/agents/scrum-master/`
  - [ ] `frameworks/agents/3d-artist/`
  - [ ] `frameworks/agents/level-designer/`
  - [ ] `frameworks/agents/unreal-agent/`

---

## 2.2 Convertir game-designer

**Source:** `frameworks/agents/game-designer.yaml` (si existe)  
**Destination:** `frameworks/agents/game-designer/agent.md`

### Format cible

```markdown
---
id: game-designer
name: Game Designer
title: Lead Game Designer
icon: gamepad-2
skills:
  - balance-testing
  - progression-design
  - core-loop-design
triggers:
  - "game design"
  - "mechanics"
  - "GDD"
  - "gameplay"
---

# Game Designer

## Persona

**Role:** Lead Game Designer + Creative Vision Architect
**Tone:** Enthusiastic, creative, collaborative
**Avatar:** 🎲

## Activation

1. Load config from `{project}/.unreal-companion/config.yaml`
2. Store: {user_name}, {communication_language}, {output_folder}
3. Load project-context.md if exists
4. Load memories.yaml if exists
5. Greet user, show menu, WAIT for input

## Greeting

Hey {user_name}! Ready to design some amazing gameplay? 🎲

What would you like to work on today?

## Menu

| Cmd | Label | Action |
|-----|-------|--------|
| BG | Brainstorm | workflow:brainstorming |
| GB | Game Brief | workflow:game-brief |
| GDD | GDD | workflow:gdd |
| NAR | Narrative | workflow:narrative |
| CH | Chat | action:chat |
| PM | Party Mode | action:party |
| DA | Dismiss | action:exit |

## Expertise

- Game mechanics design
- Player experience (UX)
- Balancing and progression
- MDA Framework (Mechanics, Dynamics, Aesthetics)
- Core loop design
- Narrative integration

## Elicitation

| Trigger | Response |
|---------|----------|
| "I don't know" | "Think of a game you love - what makes it special?" |
| "maybe" | "Let's explore both paths - which excites you more?" |
| "not sure" | "What feeling do you want players to have?" |
| stuck | "Let's step back - what's the ONE thing that must work?" |

## Collaboration

- Works closely with **Game Architect** for technical feasibility
- Feeds **Narrative Designer** with world/character needs
- Guides **Level Designer** on pacing and flow
```

### Tâches

- [ ] Créer `frameworks/agents/game-designer/agent.md`
- [ ] Supprimer ancien fichier YAML si existe

---

## 2.3 Convertir game-architect

**Destination:** `frameworks/agents/game-architect/agent.md`

### Tâches

- [ ] Créer `agent.md` avec :
  - [ ] Frontmatter (id, name, title, icon, skills, triggers)
  - [ ] Persona section
  - [ ] Activation section
  - [ ] Greeting
  - [ ] Menu (Architecture, Tech Spec, Project Context, etc.)
  - [ ] Expertise (systems design, scalability, UE5 architecture)
  - [ ] Elicitation patterns
  - [ ] Collaboration notes

---

## 2.4 Convertir game-dev

**Destination:** `frameworks/agents/game-dev/agent.md`

### Tâches

- [ ] Créer `agent.md` avec :
  - [ ] Frontmatter
  - [ ] Persona (pragmatic, solution-focused)
  - [ ] Menu (Dev Story, Code Review, Sprint Status, etc.)
  - [ ] Expertise (Blueprint, C++, debugging, optimization)
  - [ ] Skills référencés (mcp-blueprint-tools, mcp-graph-tools, etc.)

---

## 2.5 Convertir solo-dev

**Destination:** `frameworks/agents/solo-dev/agent.md`

### Tâches

- [ ] Créer `agent.md` avec :
  - [ ] Frontmatter
  - [ ] Persona (polyvalent, efficace, "one-man army")
  - [ ] Menu combiné (Quick Prototype, Quick Dev, etc.)
  - [ ] Expertise (full-stack game dev)

---

## 2.6 Convertir autres agents

### game-qa
- [ ] Créer `frameworks/agents/game-qa/agent.md`
- [ ] Skills: performance-testing, playtesting

### scrum-master
- [ ] Créer `frameworks/agents/scrum-master/agent.md`
- [ ] Menu: Sprint Planning, Sprint Status, Retrospective

### 3d-artist
- [ ] Créer `frameworks/agents/3d-artist/agent.md`
- [ ] Skills: mcp-material-tools, mcp-asset-tools

### level-designer
- [ ] Créer `frameworks/agents/level-designer/agent.md`
- [ ] Skills: mcp-world-tools, mcp-level-tools

### unreal-agent
- [ ] Créer `frameworks/agents/unreal-agent/agent.md`
- [ ] Skills: TOUS les skills MCP
- [ ] Focus: exécution technique via MCP tools

---

## 2.7 Créer team-gamedev

**Destination:** `frameworks/teams/team-gamedev/team.md`

### Format cible

```markdown
---
id: team-gamedev
name: Game Development Team
icon: 🎮
agents:
  - game-designer
  - game-architect
  - game-dev
  - solo-dev
  - game-qa
  - scrum-master
workflows:
  - brainstorming
  - game-brief
  - gdd
  - game-architecture
  - sprint-planning
  - dev-story
---

# Game Development Team

Équipe spécialisée pour les projets de jeux vidéo de toutes tailles.

## Rôles

| Agent | Responsabilités |
|-------|-----------------|
| **Game Designer** | Vision créative, mécaniques, GDD |
| **Game Architect** | Systèmes techniques, architecture |
| **Game Dev** | Implémentation, code, debugging |
| **Solo Dev** | Prototypage rapide, full-stack |
| **Game QA** | Tests, qualité, performance |
| **Scrum Master** | Sprints, planning, suivi |

## Recommended Flow

### Préproduction
1. Brainstorming → Game Brief

### Design
2. Game Brief → GDD → Narrative

### Technical
3. GDD → Game Architecture → Project Context

### Production
4. Sprint Planning → Dev Stories → Code Review → Retrospective

## Party Mode

Les agents peuvent collaborer via mentions `@agent-name`.

Exemple:
- Game Designer: "J'ai besoin de valider la faisabilité technique"
- → "@game-architect, peux-tu évaluer cette mécanique ?"
```

### Tâches

- [ ] Créer `frameworks/teams/team-gamedev/team.md`

---

## 2.8 Nettoyer anciens fichiers

### Tâches

- [ ] Supprimer `frameworks/agents/*.yaml` (anciens fichiers)
- [ ] Vérifier qu'aucune référence ne pointe vers les anciens fichiers

---

## Critères de validation

- [ ] Tous les agents convertis en `agent.md`
- [ ] Frontmatter YAML valide (tester avec parser)
- [ ] Tous les skills référencés existent (ou seront créés)
- [ ] Team créée avec tous les agents
- [ ] Anciens fichiers YAML supprimés

---

## Notes

- Le frontmatter doit être parsable par `gray-matter` (JS) et `python-frontmatter` (Python)
- Les skills référencés seront créés dans la Phase 3
- Les triggers permettent l'auto-sélection d'agent basée sur la requête user
