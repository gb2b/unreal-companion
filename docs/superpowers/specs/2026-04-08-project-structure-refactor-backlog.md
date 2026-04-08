# Project Structure Refactor — Backlog

**Date:** 2026-04-08
**Status:** Backlog — à brainstormer proprement avant implémentation
**Impact:** CLI + Studio + DocumentStore + tous les endpoints

---

## Problème actuel

```
.unreal-companion/
├── docs/
│   ├── concept/game-brief.md          ← docs générés par Studio v2
│   ├── concept/game-brief.meta.json
│   ├── concept/game-brief.session.json
│   ├── concept/game-brief.steps.json
│   ├── concept/game-brief.history.json
│   ├── concept/game-brief.versions/
│   ├── references/pitch.pdf           ← uploads mélangés avec les docs
│   └── tags.json
├── output/                             ← vide, inutilisé par Studio v2
│   ├── concept/
│   ├── design/
│   └── technical/
├── assets/references/                  ← aussi vide, doublon
├── sessions/                           ← reliquat CLI v1
├── workflows.db                        ← reliquat CLI v1
└── workflow-status.yaml                ← reliquat CLI v1
```

**Problèmes :**
- `docs/` vs `output/` — confusion, duplication de catégories vides
- Fichiers satellites (.meta.json, .session.json, .steps.json, .history.json, .versions/) au même niveau que le .md → encombre le dossier
- `assets/references/` et `docs/references/` — doublon
- Catégories hardcodées en sous-dossiers — pas flexible pour le user
- Reliquats CLI v1 inutilisés

## Structure cible proposée

```
.unreal-companion/
├── project-context.md
├── output/                              ← tous les docs générés
│   ├── game-brief-2026-04-08/          ← 1 dossier par document
│   │   ├── document.md                  ← le contenu markdown
│   │   ├── meta.json                    ← metadata (tags, status, agent, etc.)
│   │   ├── session.json                 ← session memory du workflow
│   │   ├── steps.json                   ← micro-steps du builder
│   │   ├── history.json                 ← conversation history
│   │   ├── versions/                    ← section version history
│   │   └── prototypes/                  ← HTML prototypes
│   ├── level-design-zone1-2026-04-08/
│   │   ├── document.md
│   │   └── meta.json
│   └── gdd-2026-04-10/
│       └── ...
├── references/                          ← uploads séparés (pas dans output)
│   ├── pitch.pdf
│   ├── pitch.pdf.meta.json
│   ├── concept-art.png
│   └── concept-art.png.meta.json
├── agents/
├── workflows/
│   └── custom/
└── config.yaml
```

**Principes :**
- `output/` = docs générés par les workflows. Nom = `{workflow-id}-{date}` ou renommé par le user
- 1 dossier par document — tous les fichiers satellites dedans, clean
- `references/` = uploads externes, séparés des docs générés
- Catégories = tags dans meta.json, pas des dossiers. Le user organise via tags/filtres dans la Library
- Plus de `docs/`, `sessions/`, `workflows.db`, `workflow-status.yaml`
- Le CLI lit `output/` et `references/` — même structure que le Studio

## Ce qui doit changer

| Composant | Changement |
|-----------|-----------|
| `DocumentStore` | Nouveau path scheme: `output/{doc-folder}/document.md` au lieu de `docs/{category}/{id}.md` |
| `studio_v2.py` | Tous les endpoints qui construisent des paths |
| `builderStore.ts` | doc_id generation, resume logic |
| `document_store.py` | list_documents, get_document, save_document, delete_document, update_section |
| `section_version_store.py` | Path resolution |
| `microstep_store.py` | Path resolution |
| `conversation_history.py` | Path resolution |
| `context_brief.py` | project-context path |
| CLI (`cli/`) | Adapter les commandes qui lisent les docs |
| Migration script | Migrer les projets existants |

## Migration

Besoin d'un script de migration qui :
1. Déplace les docs de `docs/{category}/{id}.md` → `output/{id}/document.md`
2. Déplace les meta/steps/history/versions dans le dossier du document
3. Déplace `docs/references/` → `references/`
4. Supprime les dossiers vides (`output/`, `assets/`, `sessions/`)
5. Supprime les reliquats (`workflows.db`, `workflow-status.yaml`)
6. Met à jour `project-context.md` (déplace à la racine si pas déjà)

## Risques

- CLI v1 compatibility — les utilisateurs existants ont des projets avec l'ancienne structure
- Le script de migration doit être robuste et réversible
- Les tags.json et custom tags doivent migrer aussi

## Priorité

Moyen — pas bloquant pour les features en cours, mais la dette technique grandit. À faire avant une release publique.
