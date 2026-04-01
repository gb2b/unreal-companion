# Agent Environment & Documentation Refonte — Design Spec

**Date:** 2026-04-02
**Approche:** Inside-Out (du coeur vers l'extérieur)

---

## Objectif

Créer un environnement agent optimal pour le développement d'unreal-companion ET pour la méthode BMGD. Un agent qui démarre une session doit immédiatement comprendre le projet, savoir où travailler, et disposer de skills guidés pour chaque type de tâche.

Deux couches distinctes :
- **Doc "méta"** — pour développer/maintenir unreal-companion (CLAUDE.md, skills de dev)
- **Doc "produit"** — ce que le projet fournit à ses utilisateurs (frameworks/, méthode BMGD)

---

## Phase 1 — Hiérarchie CLAUDE.md

### Structure

```
unreal-companion/
├── CLAUDE.md                          # Global — vision, architecture, routing
├── Python/CLAUDE.md                   # MCP Server — tools, conventions Python, sécurité
├── Plugins/UnrealCompanion/CLAUDE.md  # C++ Plugin — commands, bridge, patterns UE
├── web-ui/CLAUDE.md                   # Studio — React + FastAPI, stores, API
├── cli/CLAUDE.md                      # CLI — commandes, installer, déploiement
└── frameworks/CLAUDE.md               # BMGD — agents, workflows, skills, templates
```

### Contenu par fichier

**Racine (`CLAUDE.md`)** — Ce que tout agent doit savoir :
- Qu'est-ce qu'Unreal Companion (1 paragraphe)
- Architecture dual-process (schéma MCP → TCP → Plugin → UE)
- Les 5 parties et quand y travailler
- Conventions globales (naming snake_case, paths `/Game/...`, vecteurs `[x,y,z]`)
- Sécurité — résumé des risk levels + renvoi vers `SECURITY.md`
- Routing vers les CLAUDE.md locaux ("si tu travailles sur X, lis Y")
- Skills disponibles pour le dev

**`Python/CLAUDE.md`** — Le serveur MCP :
- Structure des tools (par catégorie), comment ils sont enregistrés
- Conventions Python (pas de `Any`/`Union`/`Optional`, docstrings avec Args/Returns/Example)
- Comment `helpers.py` gère la connexion TCP
- Batch operations (on_error, dry_run, verbosity, auto_compile)
- Tests et comment les lancer
- Pièges courants (pin names case-sensitive, oubli `/Game/` prefix)

**`Plugins/UnrealCompanion/CLAUDE.md`** — Le plugin C++ :
- Architecture Bridge → Commands → Game Thread
- Comment ajouter une commande (header + impl + route dans Bridge.cpp)
- Graph/ et NodeFactory/ — comment ça marche
- Conventions C++ (`.clang-format`, naming)
- Le piège critique : oublier la route dans `UnrealCompanionBridge.cpp`

**`web-ui/CLAUDE.md`** — Le Studio :
- Stack (React 19 + Vite + Tailwind + Zustand / FastAPI + SQLite)
- Frontend : composants, stores, services
- Backend : API routes → services → repositories → models
- Comment lancer (`npm run dev:all`, jamais `python main.py`)
- WebSocket pour le real-time
- Comment le backend charge depuis `~/.unreal-companion/` (unified_loader.py)
- Peut installer et initialiser des projets (même capacités que le CLI)

**`cli/CLAUDE.md`** — Le CLI :
- Entry point et commandes (main, upgrade, workflow)
- `installer.js` — le coeur (installGlobalDefaults, setupProject, generateIDERules)
- Flow d'installation : `frameworks/` → `~/.unreal-companion/` → `{project}/.unreal-companion/`
- Comment les templates sont découverts (`getSourcePaths()`)
- Génération des rules IDE (.mdc, CLAUDE.md, .windsurfrules)
- Peut installer et initialiser des projets (même capacités que le web-ui)

**`frameworks/CLAUDE.md`** — La méthode BMGD :
- C'est quoi (source de vérité pour les templates déployés chez l'utilisateur)
- N'est JAMAIS lu au runtime — uniquement utilisé par CLI install/upgrade
- Structure : agents/, workflows/, skills/, rules-templates/, project/, teams/
- Format des fichiers (agent.md, SKILL.md, workflow.yaml + steps/)
- Conventions des workflows (step-file architecture, mandatory execution rules, menu [A][P][C][AE])
- Comment ajouter/modifier un workflow, un agent, un skill
- Relation avec CLI et web-ui (déploiement et chargement)

### Fichiers à supprimer/absorber

| Fichier | Action | Raison |
|---|---|---|
| `AGENTS.md` | Supprimer — absorbé dans CLAUDE.md racine + locaux, et généré pour les users via rules-templates | Redondant |
| `.clinerules` | Supprimer — sera généré par CLI/web-ui à l'install | Fichier statique inutile dans le repo |
| `.windsurfrules` | Supprimer — sera généré par CLI/web-ui à l'install | Idem |
| `.cursor/rules/companion/index.mdc` | Supprimer — sera généré par CLI/web-ui à l'install | Stub inutile |
| `PLAN.md` | Archiver dans `docs/archive/` | Supercédé par RECAP.md |

### Fichiers conservés

| Fichier | Raison |
|---|---|
| `CLAUDE.md` (racine + 5 sous-parties) | Natif Claude Code, lu directement |
| `.claude/skills/*/SKILL.md` | Skills de dev, natifs Claude Code |
| `frameworks/rules-templates/*` | Source pour la génération des fichiers des autres IDE |
| `SECURITY.md` | Référence sécurité transversale |
| `README.md` | Page GitHub, pas pour les agents |
| `RECAP.md` | Planning actif |

---

## Phase 2 — Skills de développement

### Structure de chaque skill

```
.claude/skills/{skill-name}/
├── SKILL.md            # Skill principal (YAML frontmatter + contenu)
├── references/         # Exemples, templates, patterns, checklists
├── scripts/            # Scripts d'automatisation si nécessaire
└── eval/               # Tests/validation du skill
```

Chaque skill est créé via `/skill-creator` pour garantir le format correct.

### Liste des 21 skills

#### MCP Tools (3)
| Skill | Description |
|---|---|
| `add-mcp-tool` | Création complète d'un MCP tool : Python function → C++ header → C++ impl → route Bridge.cpp → doc → tests. Templates dans references/. |
| `review-mcp-tool` | Audit qualité : vérifier existence dans les 5 endroits, types (pas de Any/Union/Optional), naming cohérent, doc complète, sécurité, tests. Rapport avec score. |
| `debug-bridge` | Diagnostic TCP Python ↔ C++ : vérifier plugin UE (port 55557), tester connexion, lire logs, arbre de décision par type d'erreur. |

#### BMGD / Frameworks (4)
| Skill | Description |
|---|---|
| `add-workflow` | Créer un workflow BMGD : dossier dans frameworks/workflows/, workflow.yaml, instructions.md, steps/, template.md. Vérifier chargement CLI et web-ui. |
| `review-workflow` | Audit workflow : fichiers requis, YAML frontmatter, mandatory execution rules, numérotation steps, menu [A][P][C][AE], chargement unified_loader.py. |
| `update-frameworks` | Comparer frameworks/ (source) vs ~/.unreal-companion/ (installé), lister les différences, proposer mise à jour avec backup, vérifier chargement. |
| `add-bmgd-skill` | Créer un skill BMGD dans frameworks/skills/ : SKILL.md avec frontmatter, references/, l'associer à des agents, vérifier disponibilité CLI et web-ui. |

#### CLI (2)
| Skill | Description |
|---|---|
| `add-cli-command` | Ajouter une commande dans cli/src/commands/, l'enregistrer dans main, gérer les args, ajouter les tests. |
| `review-cli-installer` | Auditer installer.js : getSourcePaths(), copie des templates, génération rules IDE, flow install + init + upgrade. |

#### Web UI Frontend (2)
| Skill | Description |
|---|---|
| `add-webui-component` | Créer composant React dans components/, store Zustand dans stores/, service API dans services/, types dans types/. Respecter patterns existants. |
| `review-webui-frontend` | Audit : patterns React 19, usage Zustand, responsive Tailwind, accessibilité, performance. |

#### Web UI Backend (2)
| Skill | Description |
|---|---|
| `add-webui-endpoint` | Route dans api/, service dans services/, repo dans repositories/, model SQLAlchemy si besoin. Respecter architecture en couches. |
| `review-webui-backend` | Audit : séparation route/service/repo, validation inputs, gestion erreurs, cohérence avec frontend. |

#### C++ Plugin (2)
| Skill | Description |
|---|---|
| `add-cpp-command` | Header + impl + route Bridge, sans le côté Python. Complémentaire à add-mcp-tool pour le C++ seul. |
| `review-cpp-command` | Audit : mémoire (pas de leaks), thread safety (GameThread vs background), patterns UE5 (TSharedPtr, FString), JSON. |

#### Sécurité (1)
| Skill | Description |
|---|---|
| `add-security-level` | Ajouter/modifier un risk level sur un tool : token flow, whitelist, mise à jour SECURITY.md et Python security.py. |

#### Testing (1)
| Skill | Description |
|---|---|
| `test-mcp-pipeline` | Tester un tool end-to-end : Python → TCP → C++ → UE → response. Unit tests Python, mock bridge, test UE live, edge cases. |

#### Transversal (2)
| Skill | Description |
|---|---|
| `review-docs-sync` | Comparer tools Python enregistrés vs docs Docs/Tools/, vérifier tool counts, détecter tools non documentés ou docs orphelines. |
| `add-agent` | Créer un agent BMGD dans frameworks/agents/ : agent.md (frontmatter YAML, persona, communication style, skills, menu, activation protocol). |

#### Release (1)
| Skill | Description |
|---|---|
| `prepare-release` | Bump version, mettre à jour CHANGELOG, vérifier tool counts, run review-docs-sync, tag git. |

#### Onboarding (1)
| Skill | Description |
|---|---|
| `project-tour` | Visite guidée pour nouvel agent/dev : architecture, parties, où trouver quoi, lancer les tests, vérifier que tout marche, configurer l'environnement. |

---

## Phase 3 — BMGD Source de vérité et runtime

### Modèle de données

```
frameworks/                          # SOURCE — maintenue par les devs
    ↓ (CLI install/upgrade OU web-ui install/upgrade)
~/.unreal-companion/                 # USER — état global partagé
    ├── defaults/                    #   read-only, écrasé à chaque upgrade
    ├── custom/                      #   modifs user, jamais écrasé
    ├── manifest.yaml                #   version installée
    └── projects.json                #   registre des projets connus
    ↓ (CLI init OU web-ui init)
{project}/.unreal-companion/         # LOCAL — état projet
    ├── config.yaml                  #   overrides projet
    ├── output/                      #   documents générés (game-brief, GDD, etc.)
    ├── workflow-status.yaml         #   progression des workflows
    ├── project-context.md           #   contexte auto-updated par workflows
    └── memories.yaml                #   mémoires persistantes
```

### Règles fondamentales

1. **`frameworks/` n'est JAMAIS lu au runtime.** C'est uniquement la source pour install/upgrade.
2. **CLI et web-ui sont des portes d'entrée équivalentes.** Tous deux peuvent installer, initialiser, exécuter des workflows, et lire/écrire au même endroit.
3. **L'utilisateur passe de l'un à l'autre sans perdre son état.** Un doc généré via CLI est visible dans le web-ui et inversement.
4. **Si rien n'est installé → proposer l'installation.** Pas de fallback silencieux.

### Résolution au runtime (identique CLI et web-ui)

```
1. {project}/.unreal-companion/     → override projet
2. ~/.unreal-companion/custom/      → override user
3. ~/.unreal-companion/defaults/    → copie installée
4. Si rien → proposer installation
```

### Versioning des templates

`frameworks/manifest.yaml` :
```yaml
version: "1.1.0"
lastUpdated: "2026-04-02"
components:
  workflows: "1.1.0"
  agents: "1.0.0"
  skills: "1.0.0"
  rules-templates: "1.1.0"
```

Comparé avec `~/.unreal-companion/manifest.yaml` installé → propose upgrade si version différente.

### Mises à jour des templates BMGD

Dans `frameworks/` :
- Review et mise à jour du contenu des workflows (steps, yaml, templates)
- Vérifier cohérence des skills associés aux agents
- Compléter les references/ des skills BMGD
- Mettre à jour le template Claude Code (`rules-templates/claude-code/CLAUDE.md.template`) avec la nouvelle hiérarchie
- Ajouter `templateVersion` dans les project templates (config.yaml, etc.)

---

## Phase 4 — Adaptation multi-agent

### Claude Code (natif, prioritaire)

- CLAUDE.md hiérarchiques dans le repo (phase 1)
- 21 skills dans `.claude/skills/` (phase 2)
- Settings dans `.claude/settings.local.json` si nécessaire

### Autres IDE (générés, jamais maintenus à la main dans le repo)

| IDE | Fichier généré | Source template |
|---|---|---|
| Cursor | `.cursor/rules/companion/*.mdc` | `frameworks/rules-templates/cursor/*.mdc.template` |
| Windsurf | `.windsurfrules` | `frameworks/rules-templates/windsurf/rules.md.template` |
| VS Code Copilot | `.github/instructions/*.instructions.md` | `frameworks/rules-templates/vscode-copilot/*.template` |
| Générique | `AGENTS.md` | `frameworks/rules-templates/generic/AGENTS.md.template` |

Les fichiers des autres IDE sont générés par le CLI ou le web-ui lors de l'installation dans le projet de l'utilisateur. Ils ne vivent pas dans le repo source d'unreal-companion.

### Template Claude Code pour les utilisateurs

Distinction importante :
- `CLAUDE.md` dans le repo = doc pour développer unreal-companion (doc "méta")
- `frameworks/rules-templates/claude-code/CLAUDE.md.template` = ce qui est déployé dans le projet de l'utilisateur pour utiliser la méthode BMGD (doc "produit")

---

## Ordre d'implémentation

### Étape 1 — CLAUDE.md hiérarchiques
1. Écrire le CLAUDE.md racine
2. Écrire les 5 CLAUDE.md locaux (Python, Plugins, web-ui, cli, frameworks)
3. Supprimer AGENTS.md, .clinerules, .windsurfrules, .cursor/rules/companion/index.mdc
4. Archiver PLAN.md dans docs/archive/
5. Mettre à jour README.md (corriger tool counts, nettoyer)

### Étape 2 — Skills de développement
1. Créer les 21 skills via /skill-creator avec structure complète (SKILL.md + references/ + eval/)
2. Prioriser : add-mcp-tool, review-mcp-tool, project-tour (les plus utilisés)
3. Puis les skills par partie (CLI, web-ui, C++)
4. Puis les skills transversaux et release

### Étape 3 — BMGD templates
1. Ajouter frameworks/manifest.yaml avec versioning
2. Review et mise à jour du contenu des workflows existants
3. Vérifier cohérence agents ↔ skills
4. Mettre à jour rules-templates/claude-code/CLAUDE.md.template
5. S'assurer que unified_loader.py et le CLI lisent depuis ~/.unreal-companion/ (pas frameworks/)

### Étape 4 — Multi-agent
1. Mettre à jour les templates dans rules-templates/ pour chaque IDE
2. Vérifier que le CLI génère correctement les fichiers pour chaque IDE
3. Vérifier que le web-ui fait de même
4. Tester le flow complet : install → init → les fichiers IDE sont présents et corrects
