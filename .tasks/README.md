# Unreal Companion - Tasks

Vue d'ensemble des tâches d'implémentation pour la refonte du projet.

## Philosophie

Projet open-source gratuit pour :
- **Contrôler Unreal Engine** via MCP (Model Context Protocol)
- **Équipe virtuelle** pour aider les solo devs dans la conception

L'utilisateur configure ses propres LLM providers.

## Structure des Phases

| Phase | Nom | Tasks | Description |
|-------|-----|-------|-------------|
| 1 | Fondations | 4 | Structure globale, project init, système de tasks, **CLI setup** |
| 2 | Studio Core | 9 | Refactoring web-ui, production board, boards visuels, workflows, expérience ludique, contexte LLM, document desk |
| 3 | Editor Core | 3 | Home page, Unreal Agent, contexte Studio→Editor |
| 4 | CLI | 3 | Workflows CLI-ready, docs MCP, CLAUDE.md template |
| 5 | Studio Avancé | 5 | Suggestions IA, workflow dynamique, Document Live, avatars |
| 6 | Assets | 4 | Génération images, Meshy 3D, services externes |
| 7 | Polish | 5 | Party Mode complet, voice, multimodal, i18n, polish final |

**Total : 33 tasks**

### Tasks Complétées

| Task | Description                             | Date       |
|------|-----------------------------------------|------------|
| P1.4 | CLI Setup & Open Source Infrastructure | 2024-01-22 |

## Ordre d'Implémentation

```
Phase 1 ──→ Phase 2 ──→ Phase 3
               │
               └──→ Phase 4 (CLI, priorité haute)
               │
               └──→ Phase 5 ──→ Phase 6 ──→ Phase 7
```

## Comment Utiliser

### Lire une task

Chaque fichier contient :
- **Objectif** : Ce qu'on veut accomplir
- **Prérequis** : Tasks à compléter avant
- **Fichiers** : À créer/modifier
- **Spécifications** : Détails techniques
- **Critères d'acceptation** : Quand c'est "done"
- **Tests** : À écrire

### Workflow

1. Choisir la prochaine task (respecter les dépendances)
2. Lire le fichier complet
3. Implémenter
4. Écrire les tests
5. Valider les critères d'acceptation
6. Passer à la suivante

## Fichiers de Référence

- [PLAN.md](../PLAN.md) - Vision et architecture globale
- [Web-UI existant](../web-ui/) - Code à réutiliser
- [Plan de revue](.claude/plans/jolly-cuddling-pony.md) - Décisions architecturales

## Conventions

### Nommage des fichiers

```
P{phase}.{numéro}-{nom-court}.md
```

Exemples :
- `P1.1-global-structure.md`
- `P2.4-workflow-definitions.md`

### Status des tasks

Dans le fichier, utiliser :
- `[ ]` - À faire
- `[x]` - Fait
- `[~]` - En cours / Partiel

## Notes Importantes

1. **Web-UI existant** : Ne pas tout supprimer ! Réutiliser ce qui fonctionne.
2. **Tests** : Couverture complète (Unit + Integration + E2E)
3. **CLI** : Priorité haute, impacte l'architecture
4. **Erreurs** : Toujours afficher clairement (bandeau, logs)
