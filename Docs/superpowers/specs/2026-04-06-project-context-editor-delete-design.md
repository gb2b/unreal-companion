# Project Context + Éditeur Markdown + Suppression intelligente

**Date:** 2026-04-06
**Scope:** Web UI Studio — Library, éditeur de documents, project-context, suppression avec diff

---

## 1. Éditeur Markdown universel

Tous les documents (game-brief, GDD, project-context, etc.) s'ouvrent dans le même éditeur.

### Layout

```
┌─────────────────────────────────────────────────────┐
│ 🏷️ Bannière : titre + description traduite du doc   │
│ [Workflow assisté ▶] (si workflow lié)              │
├────────────────────────┬────────────────────────────┤
│                        │                            │
│   CodeMirror 6         │   Preview live             │
│   (markdown editing)   │   (react-markdown)         │
│                        │                            │
│                        │                            │
│                        │                            │
├────────────────────────┴────────────────────────────┤
│ Auto-saved • Last edit: 2 min ago                   │
└─────────────────────────────────────────────────────┘
```

### Composant : `MarkdownEditor.tsx`

- **Lib** : CodeMirror 6 (`@codemirror/view`, `@codemirror/lang-markdown`, `@codemirror/theme-one-dark`)
- **Preview** : `react-markdown` + `remark-gfm` (déjà installés)
- **Layout** : `react-resizable-panels` (déjà installé) — deux panneaux redimensionnables
- **Auto-save** : debounce 1s → `PUT /api/v2/studio/documents/{doc_id}` (sauvegarde le .md)
- **Theme** : theme dark custom qui match le Cyber Mint existant (cyan primary, fond `hsl(220 20% 7%)`)

### Bannière de description

Chaque document affiche une bannière en haut avec :
- **Titre** du document (éditable inline pour renommer)
- **Description** : traduite dynamiquement via un petit call LLM
- **Bouton "Workflow assisté"** : uniquement si le doc a un `workflow_id` dans son meta

**Source des descriptions** :
- Documents workflow : la `description` du workflow YAML, traduite
- Project-context : description fixe traduite ("Mémoire vivante du projet — vue d'ensemble et références aux documents")

**Cache traduction** : stocké dans `.meta.json` champ `translated_descriptions: { fr: "...", en: "...", es: "..." }`. Un call LLM est fait uniquement si la langue courante n'est pas encore cachée.

### Endpoint de traduction

```
POST /api/v2/studio/translate
Body: { text: string, target_language: string }
Response: { translated: string }
```

Petit call Claude (haiku) pour traduire. Résultat caché côté client dans le meta.

### Endpoint de sauvegarde directe

```
PUT /api/v2/studio/documents/{doc_id}
Body: { content: string, project_path: string }
Response: { success: true }
```

Écrit le contenu markdown directement dans le `.md`. Ne touche pas au meta (sauf `updated` timestamp).

---

## 2. Project Context dans la Library

### Header card épinglée

Au-dessus de la grille de documents, une carte spéciale :

```
┌─────────────────────────────────────────────────────┐
│ 🧠 Project Context                    Updated 5m ago│
│                                                     │
│ The Last Shard — Aventure/Puzzle avec exploration    │
│                                                     │
│ 📄 Game Brief ✓  📄 GDD ◐ 3/8  📄 Level Design ○  │
│                                                     │
│ [Ouvrir ▶]                                          │
└─────────────────────────────────────────────────────┘
```

### Composant : `ProjectContextCard.tsx`

- Affiche le contenu résumé du project-context (première ligne ou titre extrait)
- Liste les documents référencés avec leur statut (parsé depuis le project-context.md ou les meta des docs existants)
- Clic → ouvre le project-context dans l'éditeur markdown (pas de workflow, pas de bouton "Workflow assisté")
- **Fetch** : `GET /api/v2/studio/project-context` (endpoint existant)
- **Bannière dans l'éditeur** : description traduite, ex: "Mémoire vivante du projet — vue d'ensemble, décisions clés et références aux documents"

### Grille de documents (en dessous)

Identique à aujourd'hui. Ajout de la description/bannière dans chaque `DocumentCard` : une ligne sous le titre qui montre la description traduite du workflow.

---

## 3. Suppression avec diff du Project Context

### Flow en 2 étapes

**Step 1** : Dialog classique "Supprimer ce document ? Cette action est irréversible."
- Si l'utilisateur confirme → suppression des fichiers (`.md`, `.meta.json`, `.steps.json`, `.history.json`, `.prototypes/`, `.versions/`)
- Check si le project-context.md existe et mentionne le document

**Step 2** (si project-context contient des références au doc supprimé) :
- Call LLM avec le prompt :
  ```
  Le document "{doc_name}" ({doc_id}) a été supprimé du projet.
  Voici le project-context actuel :
  ---
  {current_project_context}
  ---
  Propose une version mise à jour qui retire les références à ce document
  et ajuste le contenu en conséquence. Renvoie UNIQUEMENT le markdown mis à jour.
  ```
- Parse la réponse et calcule un diff bloc par bloc (split par `##` headers ou par paragraphes)
- Affiche un dialog de diff :

```
┌─────────────────────────────────────────────────────┐
│ Mise à jour du Project Context                      │
│                                                     │
│ Le document "Game Brief" a été supprimé.             │
│ Changements proposés :                              │
│                                                     │
│ ┌─ Bloc modifié ──────────────────────────── [✓] ─┐│
│ │ - Game Brief ✓ (complete)                        ││
│ │ + (supprimé)                                     ││
│ └──────────────────────────────────────────────────┘│
│                                                     │
│ ┌─ Bloc modifié ──────────────────────────── [✓] ─┐│
│ │ - Docs: Game Brief, GDD, Level Design            ││
│ │ + Docs: GDD, Level Design                        ││
│ └──────────────────────────────────────────────────┘│
│                                                     │
│ ┌─ Bloc inchangé (2 blocs) ──────────────────────┐ │
│ │ (pas de changement)                             │ │
│ └──────────────────────────────────────────────────┘│
│                                                     │
│          [Appliquer la sélection]  [Ignorer]        │
└─────────────────────────────────────────────────────┘
```

### Composant : `ProjectContextDiffDialog.tsx`

- Reçoit : `oldContent` (project-context actuel), `newContent` (proposé par LLM)
- **Diff engine** : split les deux contenus par blocs (`##` headers ou double newline), compare bloc par bloc
- Chaque bloc modifié/supprimé/ajouté a un **checkbox** (coché par défaut)
- Les blocs inchangés sont collapsés
- **"Appliquer la sélection"** : merge les blocs acceptés (nouveau) avec les blocs refusés (ancien) → écrit le résultat dans project-context.md
- **"Ignorer"** : ne touche pas au project-context

### Backend

**Endpoint LLM pour la proposition de mise à jour :**

```
POST /api/v2/studio/project-context/propose-update
Body: { project_path: string, deleted_doc_id: string, deleted_doc_name: string }
Response: { proposed_content: string }
```

- Lit le project-context actuel
- Envoie au LLM (claude-haiku pour rapidité + coût)
- Retourne le markdown proposé

**Endpoint pour appliquer :**

```
PUT /api/v2/studio/project-context
Body: { project_path: string, content: string }
Response: { success: true }
```

---

## 4. Backend : `DocumentStore.delete_document()`

Méthode manquante à ajouter. Nettoie tous les fichiers associés :
- `.md`
- `.meta.json`
- `.steps.json`
- `.history.json`
- `.prototypes/` (rmtree)
- `.versions/` (rmtree) — actuellement oublié dans le delete endpoint

L'endpoint `DELETE /api/v2/studio/documents/{doc_id}` appelle cette méthode au lieu de faire le cleanup inline.

---

## 5. Traductions dynamiques

### Approche

- Les descriptions de bannières sont traduites via un call LLM léger (haiku)
- Le résultat est caché dans le `.meta.json` du document
- Si la langue du user change, un nouveau call est fait et caché
- Le project-context card dans la Library utilise le même mécanisme

### Endpoint

```
POST /api/v2/studio/translate
Body: { text: string, target_language: string }
Response: { translated: string }
```

Pas besoin de contexte complexe — juste une traduction directe. Le LLM reçoit : "Translate the following text to {language}. Return ONLY the translation, nothing else: {text}"

---

## 6. Fichiers à créer / modifier

### Nouveaux fichiers

| Fichier | Rôle |
|---------|------|
| `web-ui/src/components/studio/Editor/MarkdownEditor.tsx` | Éditeur CodeMirror 6 + preview |
| `web-ui/src/components/studio/Editor/EditorBanner.tsx` | Bannière titre + description + bouton workflow |
| `web-ui/src/components/studio/Editor/EditorView.tsx` | Vue complète (bannière + éditeur) |
| `web-ui/src/components/studio/Dashboard/ProjectContextCard.tsx` | Header card dans Library |
| `web-ui/src/components/studio/Dashboard/ProjectContextDiffDialog.tsx` | Dialog diff bloc par bloc |

### Fichiers modifiés

| Fichier | Changement |
|---------|-----------|
| `web-ui/package.json` | Ajouter `@codemirror/view`, `@codemirror/state`, `@codemirror/lang-markdown`, `@codemirror/theme-one-dark` |
| `web-ui/src/components/studio/Dashboard/LibraryTab.tsx` | Ajouter ProjectContextCard en header |
| `web-ui/src/components/studio/Dashboard/DocumentCard.tsx` | Ajouter description traduite |
| `web-ui/src/components/studio/Dashboard/DocumentActionMenu.tsx` | Step 2 diff dialog après suppression |
| `web-ui/server/services/document_store.py` | Ajouter `delete_document()` |
| `web-ui/server/api/studio_v2.py` | Ajouter endpoints : `PUT /documents/{doc_id}`, `POST /translate`, `POST /project-context/propose-update`, `PUT /project-context`. Refactor `DELETE` pour utiliser `delete_document()` + cleanup `.versions/` |

### Dépendances npm à ajouter

```
@codemirror/view
@codemirror/state
@codemirror/lang-markdown
@codemirror/theme-one-dark
@codemirror/commands
@codemirror/language
```

---

## 7. Navigation

- **Library → clic sur un document** : ouvre `EditorView` avec le .md chargé
- **Library → clic sur ProjectContextCard** : ouvre `EditorView` avec project-context.md
- **EditorView → bouton "Workflow assisté"** : ouvre le Builder actuel (si workflow lié)
- **EditorView → retour** : revient à la Library

Route : `/studio/edit/:docId` (nouveau) ou réutilisation de la route existante avec un mode param.
