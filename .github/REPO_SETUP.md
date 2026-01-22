# GitHub Repository Setup Guide

This document describes the recommended GitHub settings for this repository.

## Branch Protection Rules

Go to **Settings > Branches > Add branch protection rule**

### For `main` branch:

- **Branch name pattern**: `main`

- [x] **Require a pull request before merging**
  - [x] Require approvals: `1`
  - [x] Dismiss stale pull request approvals when new commits are pushed
  - [x] Require review from Code Owners (optional)

- [x] **Require status checks to pass before merging**
  - [x] Require branches to be up to date before merging
  - Status checks required:
    - `Lint Python`
    - `Test Python`
    - `Test CLI`
    - `Build Web UI`

- [x] **Require conversation resolution before merging**

- [x] **Do not allow bypassing the above settings**

- [ ] **Allow force pushes** (DISABLED)

- [ ] **Allow deletions** (DISABLED)

## Repository Settings

### General

Go to **Settings > General**

- **Features**
  - [x] Issues
  - [x] Discussions (recommended for community Q&A)
  - [x] Projects (for roadmap tracking)
  - [ ] Wiki (use docs/ folder instead)

- **Pull Requests**
  - [x] Allow merge commits
  - [x] Allow squash merging (default)
  - [ ] Allow rebase merging
  - [x] Always suggest updating pull request branches
  - [x] Automatically delete head branches

### Code Security

Go to **Settings > Code security and analysis**

- [x] Dependency graph
- [x] Dependabot alerts
- [x] Dependabot security updates
- [x] Secret scanning
- [x] Push protection

### Actions

Go to **Settings > Actions > General**

- **Actions permissions**: Allow all actions and reusable workflows
- **Workflow permissions**: Read and write permissions
- [x] Allow GitHub Actions to create and approve pull requests

## Labels

Create these labels for better issue organization:

| Label | Color | Description |
|-------|-------|-------------|
| `bug` | `#d73a4a` | Something isn't working |
| `enhancement` | `#a2eeef` | New feature or request |
| `documentation` | `#0075ca` | Improvements or additions to documentation |
| `good first issue` | `#7057ff` | Good for newcomers |
| `help wanted` | `#008672` | Extra attention is needed |
| `question` | `#d876e3` | Further information is requested |
| `wontfix` | `#ffffff` | This will not be worked on |
| `duplicate` | `#cfd3d7` | This issue or pull request already exists |
| `invalid` | `#e4e669` | This doesn't seem right |
| `cli` | `#1d76db` | Related to CLI |
| `web-ui` | `#5319e7` | Related to Web UI |
| `mcp` | `#fbca04` | Related to MCP tools |
| `plugin` | `#b60205` | Related to Unreal Plugin |
| `agents` | `#0e8a16` | Related to AI agents |
| `workflows` | `#c5def5` | Related to workflows |

## Environments (Optional)

For releases, create environments:

1. **staging** - For pre-release testing
2. **production** - For npm publishing

Each environment can have:
- Required reviewers
- Environment secrets (NPM_TOKEN, etc.)

## Secrets

Required secrets for workflows:

| Secret | Usage |
|--------|-------|
| `NPM_TOKEN` | For publishing to npm (optional) |
| `CODECOV_TOKEN` | For code coverage reports (optional) |

## CODEOWNERS

Create `.github/CODEOWNERS`:

```
# Default owners
* @your-username

# CLI
/cli/ @your-username

# Web UI
/web-ui/ @your-username

# MCP Server
/Python/ @your-username

# Plugin
/Plugins/ @your-username
```

## Community Profile

Go to **Insights > Community** and ensure you have:

- [x] Description
- [x] README
- [x] Code of conduct
- [x] Contributing guidelines
- [x] License
- [x] Security policy
- [x] Issue templates
- [x] Pull request template

## Social Preview

Upload a social preview image (1280x640px recommended):
- Go to **Settings > General > Social preview**
- Add an attractive image showcasing the project
