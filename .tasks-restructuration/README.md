# Restructuration Frameworks - Plan de Tâches

**Date:** 27 janvier 2026  
**Référence:** `RECAP.md`

## Vue d'ensemble

Refonte complète de l'architecture `/frameworks/` pour Unreal Companion.

## Phases d'implémentation

| Phase | Description | Fichier | Status |
|-------|-------------|---------|--------|
| 1 | Structure de base | `01-structure.md` | ✅ |
| 2 | Format Agents | `02-agents.md` | ✅ |
| 3 | Skills | `03-skills.md` | ✅ |
| 4 | Rules Templates | `04-rules-templates.md` | ✅ |
| 5 | Memories System | `05-memories.md` | ✅ |
| 6 | CLI Updates | `06-cli.md` | ✅ |
| 7 | Web UI Updates | `07-web-ui.md` | ✅ |
| 8 | Tests & Validation | `08-tests.md` | ✅ |

## Ordre recommandé

```
Phase 1 (Structure) 
    ↓
Phase 2 (Agents) + Phase 3 (Skills) [parallélisable]
    ↓
Phase 4 (Rules Templates)
    ↓
Phase 5 (Memories)
    ↓
Phase 6 (CLI) + Phase 7 (Web UI) [parallélisable]
    ↓
Phase 8 (Tests)
```

## Conventions

- `[ ]` = À faire
- `[x]` = Terminé
- `[~]` = En cours
- `[!]` = Bloqué

## Fichiers de référence

- `RECAP.md` - Plan validé complet
- `frameworks/README.md` - Documentation structure
- `cli/src/utils/installer.js` - Installation CLI
- `web-ui/server/services/unified_loader.py` - Loader Python
