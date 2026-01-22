#!/bin/bash
# setup.sh - Unreal Companion Setup & Onboarding
#
# Interactive setup that configures your virtual game dev studio.
# Run this after cloning the repository.

set -e

# =============================================================================
# Colors & Formatting
# =============================================================================
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# =============================================================================
# Paths
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GLOBAL_DIR="$HOME/.unreal-companion"
TEMPLATES_DIR="$SCRIPT_DIR/server/templates"
INSTALLED_FILE="$GLOBAL_DIR/.installed"
CONFIG_FILE="$GLOBAL_DIR/config.yaml"
VERSION="1.0.0"

# =============================================================================
# Helpers
# =============================================================================
print_header() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                                                           ║"
    echo "║        🎮  UNREAL COMPANION  🎮                          ║"
    echo "║           Your Virtual Game Dev Studio                    ║"
    echo "║                                                           ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "\n${BLUE}▸${NC} ${BOLD}$1${NC}"
}

print_success() {
    echo -e "  ${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "  ${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "  ${DIM}$1${NC}"
}

ask_yes_no() {
    local prompt="$1"
    local default="${2:-y}"

    if [ "$default" = "y" ]; then
        prompt="$prompt [Y/n] "
    else
        prompt="$prompt [y/N] "
    fi

    read -p "  $prompt" -n 1 -r
    echo

    if [ -z "$REPLY" ]; then
        REPLY="$default"
    fi

    [[ $REPLY =~ ^[Yy]$ ]]
}

ask_choice() {
    local prompt="$1"
    shift
    local options=("$@")

    echo -e "  ${prompt}"
    for i in "${!options[@]}"; do
        echo -e "    ${CYAN}$((i+1))${NC}) ${options[$i]}"
    done

    read -p "  Choice [1]: " choice

    if [ -z "$choice" ]; then
        choice=1
    fi

    echo $((choice-1))
}

# =============================================================================
# Version Check
# =============================================================================
get_installed_version() {
    if [ -f "$INSTALLED_FILE" ]; then
        grep -o '"version": *"[^"]*"' "$INSTALLED_FILE" | cut -d'"' -f4
    else
        echo ""
    fi
}

needs_update() {
    local installed=$(get_installed_version)
    if [ -z "$installed" ]; then
        return 0  # Not installed
    fi

    # Simple version comparison (could be improved)
    if [ "$installed" != "$VERSION" ]; then
        return 0  # Needs update
    fi

    return 1  # Up to date
}

# =============================================================================
# Installation Functions
# =============================================================================
create_directory_structure() {
    print_step "Creating directory structure..."

    mkdir -p "$GLOBAL_DIR/agents/defaults"
    mkdir -p "$GLOBAL_DIR/agents/custom"
    mkdir -p "$GLOBAL_DIR/workflows/defaults"
    mkdir -p "$GLOBAL_DIR/workflows/custom"

    print_success "~/.unreal-companion/ created"
}

install_agents() {
    print_step "Installing your virtual team..."

    if [ -d "$TEMPLATES_DIR/agents" ]; then
        local count=0
        for agent in "$TEMPLATES_DIR/agents"/*.yaml; do
            if [ -f "$agent" ]; then
                filename=$(basename "$agent")
                cp "$agent" "$GLOBAL_DIR/agents/defaults/$filename"
                name=$(grep "^name:" "$agent" | head -1 | sed 's/name: *"\?\([^"]*\)"\?/\1/')
                title=$(grep "^title:" "$agent" | head -1 | sed 's/title: *"\?\([^"]*\)"\?/\1/')
                print_success "$name - $title"
                ((count++))
            fi
        done
        echo -e "  ${DIM}$count agents ready to help${NC}"
    else
        print_warning "Agent templates not found"
    fi
}

install_workflows() {
    print_step "Installing workflows..."

    if [ -d "$TEMPLATES_DIR/workflows" ]; then
        local count=0
        for workflow in "$TEMPLATES_DIR/workflows"/*; do
            if [ -d "$workflow" ]; then
                workflow_name=$(basename "$workflow")
                cp -r "$workflow" "$GLOBAL_DIR/workflows/defaults/"
                print_success "$workflow_name"
                ((count++))
            fi
        done

        if [ $count -eq 0 ]; then
            print_info "No workflows yet (coming soon)"
        fi
    fi
}

create_config() {
    local locale="$1"
    local theme="$2"

    print_step "Creating configuration..."

    cat > "$CONFIG_FILE" << EOF
# Unreal Companion - Global Configuration
# Edit this file to customize your experience

version: "1.0"

# Language for workflows and agent messages
locale: $locale

# LLM Provider (configure API keys in environment variables)
# Supported: anthropic, openai, ollama, openrouter
llm:
  default_provider: null
  # Set these environment variables:
  # - ANTHROPIC_API_KEY
  # - OPENAI_API_KEY
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
  theme: $theme
  animations: true
  compact_mode: false

# Telemetry (anonymous usage stats)
telemetry:
  enabled: false
EOF

    print_success "config.yaml created"
}

create_projects_registry() {
    cat > "$GLOBAL_DIR/projects.json" << 'EOF'
{
  "version": "1.0",
  "projects": [],
  "last_opened": null
}
EOF
    print_success "projects.json created"
}

mark_installed() {
    cat > "$INSTALLED_FILE" << EOF
{
  "installed_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "version": "$VERSION",
  "source": "$SCRIPT_DIR"
}
EOF
}

# =============================================================================
# Unreal Project Detection
# =============================================================================
find_unreal_projects() {
    print_step "Searching for Unreal projects..."

    local search_dirs=("$HOME/Documents" "$HOME/Projects" "$HOME/Dev" "$HOME/Unreal Projects" "$HOME/UE5")
    local found_projects=()

    for dir in "${search_dirs[@]}"; do
        if [ -d "$dir" ]; then
            while IFS= read -r -d '' uproject; do
                found_projects+=("$uproject")
            done < <(find "$dir" -maxdepth 3 -name "*.uproject" -print0 2>/dev/null)
        fi
    done

    if [ ${#found_projects[@]} -eq 0 ]; then
        print_info "No Unreal projects found in common locations"
        print_info "You can add projects later via the Web UI or CLI"
        return
    fi

    echo -e "\n  ${GREEN}Found ${#found_projects[@]} Unreal project(s):${NC}"
    for i in "${!found_projects[@]}"; do
        local name=$(basename "${found_projects[$i]}" .uproject)
        local path=$(dirname "${found_projects[$i]}")
        echo -e "    ${CYAN}$((i+1))${NC}) $name"
        echo -e "       ${DIM}$path${NC}"
    done

    # Store for later use
    FOUND_PROJECTS=("${found_projects[@]}")
}

# =============================================================================
# Next Steps & Suggestions
# =============================================================================
print_next_steps() {
    local has_projects=${1:-false}

    echo -e "\n${GREEN}╔═══════════════════════════════════════════════════════════╗"
    echo "║              Setup Complete! 🎉                            ║"
    echo "╚═══════════════════════════════════════════════════════════╝${NC}"

    echo -e "\n${BOLD}Your virtual game dev studio is ready!${NC}\n"

    echo -e "${CYAN}━━━ Continue with Web UI ━━━${NC}"
    echo -e "  Start the server and open in browser:"
    echo -e "  ${YELLOW}cd $(basename "$SCRIPT_DIR") && ./start.sh${NC}"
    echo -e "  Then open: ${BLUE}http://localhost:3179${NC}\n"

    echo -e "${CYAN}━━━ Or continue with CLI ━━━${NC}"
    echo -e "  Add to your CLAUDE.md or cursor rules:"
    echo -e "  ${DIM}# Unreal Companion"
    echo -e "  Use the virtual team at ~/.unreal-companion/"
    echo -e "  Agents: Zelda (design), Solid (arch), Ada (dev), Navi (art)${NC}\n"

    if [ "$has_projects" = true ] && [ ${#FOUND_PROJECTS[@]} -gt 0 ]; then
        echo -e "${CYAN}━━━ Quick Start ━━━${NC}"
        echo -e "  Initialize your first project:"
        local first_project="${FOUND_PROJECTS[0]}"
        local project_name=$(basename "$first_project" .uproject)
        echo -e "  ${YELLOW}# In Web UI: Click 'Open Project' → Select $project_name${NC}"
        echo -e "  ${YELLOW}# Or via API: POST /api/projects/init${NC}\n"
    fi

    echo -e "${CYAN}━━━ Your Team ━━━${NC}"
    echo -e "  ${BOLD}Zelda${NC} - Lead Game Designer (creative vision)"
    echo -e "  ${BOLD}Solid${NC} - Technical Architect (systems & structure)"
    echo -e "  ${BOLD}Ada${NC}   - Senior Developer (code & implementation)"
    echo -e "  ${BOLD}Navi${NC}  - 3D Artist (visuals & assets)"
    echo -e "  ${BOLD}Lara${NC}  - Level Designer (worlds & spaces)"
    echo -e "  ${BOLD}Indie${NC} - Solo Dev Coach (scope & shipping)"
    echo -e "  ${BOLD}Epic${NC}  - Unreal Expert (engine & MCP tools)\n"

    echo -e "${DIM}Configuration: ~/.unreal-companion/config.yaml"
    echo -e "Custom agents:  ~/.unreal-companion/agents/custom/${NC}\n"
}

# =============================================================================
# Main Flow
# =============================================================================
main() {
    print_header

    # Check if already installed
    if [ -f "$INSTALLED_FILE" ]; then
        local installed_version=$(get_installed_version)

        if needs_update; then
            print_step "Update available"
            echo -e "  Installed: ${YELLOW}$installed_version${NC}"
            echo -e "  Available: ${GREEN}$VERSION${NC}"
            echo

            if ask_yes_no "Update to the latest version?"; then
                # Backup custom content
                if [ -d "$GLOBAL_DIR/agents/custom" ] && [ "$(ls -A $GLOBAL_DIR/agents/custom 2>/dev/null)" ]; then
                    print_info "Your custom agents will be preserved"
                fi

                # Update defaults only
                install_agents
                install_workflows
                mark_installed

                print_success "Updated to version $VERSION"
                print_next_steps false
                exit 0
            fi
        else
            print_step "Already installed (v$installed_version)"
            echo

            if ask_yes_no "Run setup again? (will preserve custom content)" "n"; then
                install_agents
                install_workflows
                print_success "Refreshed default content"
            fi

            # Offer to search for projects
            echo
            if ask_yes_no "Search for Unreal projects?"; then
                find_unreal_projects
            fi

            print_next_steps true
            exit 0
        fi
    fi

    # Fresh installation
    print_step "Welcome! Let's set up your virtual game dev studio."
    echo

    # Language preference
    echo -e "  ${BOLD}Language preference:${NC}"
    local lang_choice=$(ask_choice "Choose your language:" "English" "Français")
    local locale="en"
    [ "$lang_choice" -eq 1 ] && locale="fr"

    # Theme preference
    echo
    echo -e "  ${BOLD}UI Theme:${NC}"
    local theme_choice=$(ask_choice "Choose your theme:" "Dark (recommended)" "Light" "System")
    local theme="dark"
    [ "$theme_choice" -eq 1 ] && theme="light"
    [ "$theme_choice" -eq 2 ] && theme="system"

    echo

    # Create everything
    create_directory_structure
    install_agents
    install_workflows
    create_config "$locale" "$theme"
    create_projects_registry
    mark_installed

    # Search for existing projects
    echo
    if ask_yes_no "Search for existing Unreal projects?"; then
        find_unreal_projects
    fi

    print_next_steps true
}

# Run
main "$@"
