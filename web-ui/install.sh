#!/bin/bash
# install.sh - Install Unreal Companion global configuration
#
# This script sets up ~/.unreal-companion/ with default agents and workflows.
# Run this once after cloning the repository.

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Paths
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GLOBAL_DIR="$HOME/.unreal-companion"
TEMPLATES_DIR="$SCRIPT_DIR/server/templates"

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║           Unreal Companion - Installation                 ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if already installed
if [ -d "$GLOBAL_DIR" ]; then
    echo -e "${YELLOW}~/.unreal-companion/ already exists.${NC}"
    read -p "Reinstall and reset to defaults? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installation cancelled."
        exit 0
    fi
    echo -e "${YELLOW}Backing up existing config...${NC}"
    BACKUP_DIR="$GLOBAL_DIR.backup.$(date +%Y%m%d_%H%M%S)"
    mv "$GLOBAL_DIR" "$BACKUP_DIR"
    echo "  Backup created at: $BACKUP_DIR"
fi

echo -e "\n${BLUE}Creating directory structure...${NC}"

# Create directories
mkdir -p "$GLOBAL_DIR/agents/defaults"
mkdir -p "$GLOBAL_DIR/agents/custom"
mkdir -p "$GLOBAL_DIR/workflows/defaults"
mkdir -p "$GLOBAL_DIR/workflows/custom"

echo "  ~/.unreal-companion/"
echo "  ├── agents/"
echo "  │   ├── defaults/"
echo "  │   └── custom/"
echo "  ├── workflows/"
echo "  │   ├── defaults/"
echo "  │   └── custom/"
echo "  ├── config.yaml"
echo "  └── projects.json"

# Copy default agents
echo -e "\n${BLUE}Installing default agents...${NC}"
if [ -d "$TEMPLATES_DIR/agents" ]; then
    for agent in "$TEMPLATES_DIR/agents"/*.yaml; do
        if [ -f "$agent" ]; then
            filename=$(basename "$agent")
            cp "$agent" "$GLOBAL_DIR/agents/defaults/$filename"
            # Extract agent name for display
            name=$(grep "^name:" "$agent" | head -1 | sed 's/name: *"\?\([^"]*\)"\?/\1/')
            echo "  ✓ $filename ($name)"
        fi
    done
else
    echo -e "${YELLOW}  Warning: No agent templates found at $TEMPLATES_DIR/agents${NC}"
fi

# Copy default workflows
echo -e "\n${BLUE}Installing default workflows...${NC}"
if [ -d "$TEMPLATES_DIR/workflows" ]; then
    for workflow in "$TEMPLATES_DIR/workflows"/*.yaml; do
        if [ -f "$workflow" ]; then
            filename=$(basename "$workflow")
            cp "$workflow" "$GLOBAL_DIR/workflows/defaults/$filename"
            echo "  ✓ $filename"
        fi
    done
else
    echo -e "${YELLOW}  Warning: No workflow templates found at $TEMPLATES_DIR/workflows${NC}"
    echo "  Creating placeholder..."
    mkdir -p "$GLOBAL_DIR/workflows/defaults"
fi

# Create config.yaml
echo -e "\n${BLUE}Creating configuration...${NC}"
cat > "$GLOBAL_DIR/config.yaml" << 'EOF'
# Unreal Companion - Global Configuration
# This file stores your preferences across all projects.

version: "1.0"

# Default language for workflows and agent messages
locale: en

# LLM Provider settings (user must configure their own API keys)
llm:
  # Supported: openai, anthropic, ollama, openrouter
  default_provider: null
  # API keys are stored in environment variables:
  # - OPENAI_API_KEY
  # - ANTHROPIC_API_KEY
  # - OPENROUTER_API_KEY

# Default queues for new projects
default_queues:
  - id: concept
    name: Concept
    icon: Target
    color: blue
    default_agent: game-designer
  - id: dev
    name: Development
    icon: Code
    color: green
    default_agent: game-architect
  - id: art
    name: Art
    icon: Palette
    color: pink
    default_agent: 3d-artist
  - id: levels
    name: Level Design
    icon: Map
    color: amber
    default_agent: level-designer

# UI preferences
ui:
  theme: system  # system, light, dark
  animations: true
  compact_mode: false

# Telemetry (anonymous usage stats - disabled by default)
telemetry:
  enabled: false
EOF
echo "  ✓ config.yaml"

# Create projects.json
cat > "$GLOBAL_DIR/projects.json" << 'EOF'
{
  "version": "1.0",
  "projects": [],
  "last_opened": null
}
EOF
echo "  ✓ projects.json"

# Create installed marker with metadata
cat > "$GLOBAL_DIR/.installed" << EOF
{
  "installed_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "version": "1.0.0",
  "source": "$SCRIPT_DIR"
}
EOF

echo -e "\n${GREEN}╔═══════════════════════════════════════════════════════════╗"
echo "║              Installation Complete!                        ║"
echo "╚═══════════════════════════════════════════════════════════╝${NC}"
echo
echo "Your virtual game dev studio is ready!"
echo
echo -e "Next steps:"
echo -e "  1. Start the server:  ${BLUE}cd web-ui && ./start.sh${NC}"
echo -e "  2. Open the Web UI:   ${BLUE}http://localhost:3179${NC}"
echo -e "  3. Create a project or open an existing .uproject"
echo
echo -e "Configuration: ${YELLOW}~/.unreal-companion/config.yaml${NC}"
echo -e "Custom agents: ${YELLOW}~/.unreal-companion/agents/custom/${NC}"
echo
