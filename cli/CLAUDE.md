# CLI — Unreal Companion

CLI Node.js pour installer, configurer, et utiliser Unreal Companion.

## Commandes

```bash
npx unreal-companion              # Entry point intelligent (install → health → menu)
npx unreal-companion --web        # Lancer le Web UI
npx unreal-companion --status     # Status détaillé
npx unreal-companion upgrade      # Mise à jour
npx unreal-companion workflow <id> # Exécuter un workflow
```

## Structure

```
cli/
├── bin/
│   └── unreal-companion.js       # Entry point npm/npx
├── src/
│   ├── commands/
│   │   ├── main.js               # Install → health check → action menu
│   │   ├── upgrade.js            # Mise à jour frameworks + IDE rules
│   │   └── workflow.js           # Exécution de workflows
│   └── utils/
│       └── installer.js          # LE COEUR — install, init, IDE rules
└── package.json                  # (hérite du root package.json)
```

## installer.js — Le coeur

### Fonctions principales

| Fonction | Rôle |
|----------|------|
| `installGlobalDefaults()` | Copie `frameworks/` → `~/.unreal-companion/` |
| `setupProject(projectPath)` | Crée `{project}/.unreal-companion/` |
| `generateProjectIDERules()` | Génère les fichiers IDE (.mdc, CLAUDE.md, .windsurfrules) |
| `getSourcePaths()` | Localise `frameworks/` dans le package |

### Flow d'installation

```
frameworks/                          # Source dans le package
    ↓ installGlobalDefaults()
~/.unreal-companion/                 # Installation globale
    ├── defaults/                    # Copie read-only (écrasé à l'upgrade)
    │   ├── workflows/
    │   ├── agents/
    │   └── skills/
    ├── custom/                      # Customisations user (jamais écrasé)
    ├── manifest.yaml                # Version installée
    └── projects.json                # Registre des projets
    ↓ setupProject()
{project}/.unreal-companion/         # Initialisation projet
    ├── config.yaml                  # Config projet
    ├── workflow-status.yaml         # Progression workflows
    ├── project-context.md           # Contexte auto-updated
    ├── memories.yaml                # Mémoires persistantes
    └── output/                      # Documents générés
        ├── concept/
        ├── design/
        ├── technical/
        └── ...
```

### Résolution au runtime

Le CLI (et le web-ui) résolvent dans cet ordre :
1. `{project}/.unreal-companion/` (override projet)
2. `~/.unreal-companion/custom/` (override user)
3. `~/.unreal-companion/defaults/` (installé)
4. Rien → proposer `npx unreal-companion install`

### getSourcePaths()

Cherche `frameworks/` dans :
1. `cli/../../frameworks/` (mode dev)
2. `cli/../../../../frameworks/` (npm install)
3. `process.cwd()/frameworks/` (fallback)

## Génération des rules IDE

Le CLI génère les fichiers pour chaque IDE depuis `frameworks/rules-templates/` :

| IDE | Fichier généré | Template source |
|-----|---------------|-----------------|
| Cursor | `.cursor/rules/companion/*.mdc` | `rules-templates/cursor/*.mdc.template` |
| Claude Code | `.claude/CLAUDE.md` | `rules-templates/claude-code/CLAUDE.md.template` |
| Windsurf | `.windsurfrules` | `rules-templates/windsurf/rules.md.template` |
| VS Code Copilot | `.github/instructions/*` | `rules-templates/vscode-copilot/*.template` |

## Tests

```bash
npm run test:cli
# ou
node --test cli/src/**/*.test.js
```

## Dépendances

chalk, commander, inquirer, ora, semver, yaml — voir root `package.json`.
