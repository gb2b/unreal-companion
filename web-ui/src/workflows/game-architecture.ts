import { Workflow } from './types'

export const gameArchitectureWorkflow: Workflow = {
  id: 'game-architecture',
  name: 'Game Architecture',
  description: 'Design your game\'s technical architecture',
  icon: 'Layers',
  color: 'from-orange-500 to-red-500',
  agent: 'game-architect',
  estimatedTime: '45 min',
  outputPath: 'technical/architecture.md',
  outputTemplate: `# Technical Architecture - {{gameName}}

## Overview

{{architectureOverview}}

## Technology Stack

### Engine
{{engine}}

### Target Platforms
{{platforms}}

### Third-Party Services
{{thirdPartyServices}}

## System Architecture

### High-Level Diagram

\`\`\`
{{systemDiagram}}
\`\`\`

### Core Systems

{{coreSystems}}

## Gameplay Systems

### {{primarySystem}}

**Responsibility**: {{primarySystemDescription}}

**Key Components**:
{{primarySystemComponents}}

**Data Flow**:
{{primarySystemDataFlow}}

### {{secondarySystem}}

**Responsibility**: {{secondarySystemDescription}}

**Key Components**:
{{secondarySystemComponents}}

### Additional Systems

{{additionalSystems}}

## Data Architecture

### Save System

{{saveSystemDesign}}

### Configuration

{{configurationDesign}}

### Asset Management

{{assetManagement}}

## Multiplayer Architecture (if applicable)

{{multiplayerArchitecture}}

## Performance Considerations

### Target Performance
{{performanceTargets}}

### Optimization Strategy
{{optimizationStrategy}}

### Memory Budget
{{memoryBudget}}

## Scalability & Extensibility

### Modding Support
{{moddingSupport}}

### Content Pipeline
{{contentPipeline}}

### Future Expansion Points
{{expansionPoints}}

## Technical Risks & Mitigations

{{technicalRisks}}

## Dependencies & Integration Points

### External Dependencies
{{externalDependencies}}

### Internal Module Dependencies
{{moduleDependencies}}

## Development Guidelines

### Coding Standards
{{codingStandards}}

### Testing Strategy
{{testingStrategy}}

### Documentation Requirements
{{documentationRequirements}}

## Implementation Roadmap

### Phase 1: Foundation ({{phase1Duration}})
{{phase1Tasks}}

### Phase 2: Core Systems ({{phase2Duration}})
{{phase2Tasks}}

### Phase 3: Polish & Integration ({{phase3Duration}})
{{phase3Tasks}}

## Appendix

### Glossary
{{glossary}}

### References
{{references}}

---
*Generated with Unreal Companion - Architecture Workflow*
*Date: {{date}}*
`,
  steps: [
    {
      id: 'overview',
      title: 'Project Overview',
      agentMessage: "Let's establish the technical foundation. I'll help you design a solid, scalable architecture.",
      questions: [
        {
          id: 'gameName',
          type: 'text',
          prompt: 'Project name',
          description: 'Name of the game this architecture is for',
          placeholder: 'Project Nebula',
          required: true,
        },
        {
          id: 'architectureOverview',
          type: 'textarea',
          prompt: 'Architecture overview',
          description: 'High-level description of the technical approach',
          placeholder: 'A modular, data-driven architecture designed for procedural content generation and extensibility. Core gameplay systems are decoupled from rendering, allowing for headless testing and easy iteration...',
          required: true,
        },
      ],
    },
    {
      id: 'stack',
      title: 'Technology Stack',
      agentMessage: "What technologies will power your game? Let's define the stack.",
      questions: [
        {
          id: 'engine',
          type: 'single',
          prompt: 'Game Engine',
          options: [
            { id: 'ue5', label: 'Unreal Engine 5', description: 'AAA-quality, C++/Blueprints' },
            { id: 'ue4', label: 'Unreal Engine 4', description: 'Mature, stable' },
            { id: 'unity', label: 'Unity', description: 'C#, versatile' },
            { id: 'godot', label: 'Godot', description: 'Open-source, GDScript/C#' },
            { id: 'custom', label: 'Custom Engine', description: 'Built from scratch' },
          ],
          required: true,
        },
        {
          id: 'platforms',
          type: 'multiple',
          prompt: 'Target platforms',
          options: [
            { id: 'windows', label: 'Windows', description: 'Primary PC platform' },
            { id: 'mac', label: 'macOS', description: 'Apple desktop' },
            { id: 'linux', label: 'Linux', description: 'Steam Deck compatible' },
            { id: 'ps5', label: 'PlayStation 5', description: 'Sony console' },
            { id: 'xbox', label: 'Xbox Series X/S', description: 'Microsoft console' },
            { id: 'switch', label: 'Nintendo Switch', description: 'Portable console' },
            { id: 'mobile', label: 'Mobile (iOS/Android)', description: 'Smartphones/tablets' },
          ],
          required: true,
        },
        {
          id: 'thirdPartyServices',
          type: 'textarea',
          prompt: 'Third-party services & middleware',
          description: 'External services, SDKs, middleware you plan to use',
          placeholder: '- Steamworks for achievements/leaderboards\n- PlayFab for backend\n- FMOD for audio\n- Wwise for sound design',
          required: false,
        },
      ],
    },
    {
      id: 'systems',
      title: 'Core Systems',
      agentMessage: "Let's identify the major systems that will make up your game.",
      questions: [
        {
          id: 'systemDiagram',
          type: 'textarea',
          prompt: 'System diagram (ASCII)',
          description: 'Simple ASCII diagram showing main systems and their relationships',
          placeholder: `┌─────────────────────────────────────────┐
│              Game Manager               │
├─────────┬──────────┬──────────┬─────────┤
│ Input   │ Gameplay │ AI       │ Audio   │
│ System  │ Systems  │ Director │ Manager │
├─────────┴──────────┴──────────┴─────────┤
│           Save/Load System              │
└─────────────────────────────────────────┘`,
          required: false,
        },
        {
          id: 'coreSystems',
          type: 'textarea',
          prompt: 'Core engine systems',
          description: 'Foundational systems (input, save/load, config, etc.)',
          placeholder: '1. **Input System** - Handles all player input, rebindable controls\n2. **Save System** - Serialization, auto-save, cloud sync\n3. **Audio Manager** - Sound playback, mixing, music state machine\n4. **UI Framework** - Data-driven menus, localization',
          required: true,
        },
      ],
    },
    {
      id: 'gameplay-systems',
      title: 'Gameplay Systems',
      agentMessage: "Now let's detail the gameplay-specific systems that define your game.",
      questions: [
        {
          id: 'primarySystem',
          type: 'text',
          prompt: 'Primary gameplay system name',
          description: 'The most important gameplay system',
          placeholder: 'Combat System',
          required: true,
        },
        {
          id: 'primarySystemDescription',
          type: 'textarea',
          prompt: 'Primary system description',
          description: 'What does this system do?',
          placeholder: 'Manages all combat interactions including attack detection, damage calculation, combo tracking, and special move execution.',
          required: true,
        },
        {
          id: 'primarySystemComponents',
          type: 'textarea',
          prompt: 'Key components',
          description: 'Main classes/components in this system',
          placeholder: '- CombatManager (singleton)\n- AttackComponent (actor component)\n- DamageCalculator\n- ComboTracker\n- HitDetection subsystem',
          required: true,
        },
        {
          id: 'primarySystemDataFlow',
          type: 'textarea',
          prompt: 'Data flow',
          description: 'How does data move through this system?',
          placeholder: 'Input → AttackComponent → CombatManager validates → HitDetection checks → DamageCalculator computes → Target receives damage event',
          required: false,
        },
        {
          id: 'secondarySystem',
          type: 'text',
          prompt: 'Secondary gameplay system name',
          description: 'Another important gameplay system',
          placeholder: 'Progression System',
          required: true,
        },
        {
          id: 'secondarySystemDescription',
          type: 'textarea',
          prompt: 'Secondary system description',
          description: 'What does this system do?',
          placeholder: 'Tracks player progress, manages XP/leveling, unlocks, and meta-progression across runs.',
          required: true,
        },
        {
          id: 'secondarySystemComponents',
          type: 'textarea',
          prompt: 'Key components',
          description: 'Main classes/components',
          placeholder: '- ProgressionManager\n- XPCalculator\n- UnlockRegistry\n- StatModifier system',
          required: false,
        },
        {
          id: 'additionalSystems',
          type: 'textarea',
          prompt: 'Additional gameplay systems',
          description: 'Brief description of other important systems',
          placeholder: '- **AI Director**: Controls enemy spawning, pacing, difficulty\n- **Inventory System**: Item management, equipment\n- **Dialogue System**: Branching conversations, triggers',
          required: false,
        },
      ],
      celebration: "Systems are taking shape!",
    },
    {
      id: 'data',
      title: 'Data Architecture',
      agentMessage: "How will your game handle data? Save files, configuration, assets...",
      questions: [
        {
          id: 'saveSystemDesign',
          type: 'textarea',
          prompt: 'Save system design',
          description: 'How will game state be persisted?',
          placeholder: '- JSON serialization for save files\n- Auto-save every 5 minutes + on key events\n- Separate meta-progression saves from run saves\n- Cloud sync via Steam/platform services',
          required: true,
        },
        {
          id: 'configurationDesign',
          type: 'textarea',
          prompt: 'Configuration design',
          description: 'How will game settings and config be handled?',
          placeholder: '- Data tables for game balance (hot-reloadable)\n- INI files for user settings\n- Command line overrides for debugging\n- Runtime console commands',
          required: false,
        },
        {
          id: 'assetManagement',
          type: 'textarea',
          prompt: 'Asset management strategy',
          description: 'How will assets be organized and loaded?',
          placeholder: '- Asset bundles per level/area\n- Async loading with loading screens\n- Texture streaming for open world\n- LOD system for 3D assets',
          required: false,
        },
      ],
    },
    {
      id: 'performance',
      title: 'Performance',
      agentMessage: "Let's set clear performance targets and optimization strategies.",
      questions: [
        {
          id: 'performanceTargets',
          type: 'textarea',
          prompt: 'Performance targets',
          description: 'Specific FPS, resolution, hardware targets',
          placeholder: '- 60 FPS on mid-range hardware (RTX 3060, Ryzen 5)\n- 30 FPS on Steam Deck\n- 1080p minimum, 4K supported\n- <3 second load times',
          required: true,
        },
        {
          id: 'optimizationStrategy',
          type: 'textarea',
          prompt: 'Optimization strategy',
          description: 'Key optimization techniques you\'ll employ',
          placeholder: '- Object pooling for projectiles/effects\n- Culling and LOD for distant objects\n- Async compute for AI\n- GPU particle systems',
          required: false,
        },
        {
          id: 'memoryBudget',
          type: 'textarea',
          prompt: 'Memory budget',
          description: 'How will memory be allocated?',
          placeholder: '- 4GB target for textures\n- 1GB for audio\n- 500MB for game state\n- Streaming budget: 2GB',
          required: false,
        },
      ],
    },
    {
      id: 'multiplayer',
      title: 'Multiplayer (Optional)',
      agentMessage: "If your game has multiplayer, let's design the network architecture.",
      questions: [
        {
          id: 'multiplayerArchitecture',
          type: 'textarea',
          prompt: 'Multiplayer architecture',
          description: 'Network model, synchronization strategy (or N/A if single-player only)',
          placeholder: 'N/A - Single-player only\n\nOR\n\n- Client-server model\n- Dedicated servers for competitive\n- P2P with host migration for co-op\n- Delta compression for network traffic',
          required: false,
        },
      ],
    },
    {
      id: 'extensibility',
      title: 'Extensibility',
      agentMessage: "How will your architecture support future content and modifications?",
      questions: [
        {
          id: 'moddingSupport',
          type: 'textarea',
          prompt: 'Modding support',
          description: 'Will you support mods? How?',
          placeholder: '- Data mods via JSON/data tables\n- Custom levels via built-in editor\n- Workshop integration\n- Scripting via Lua (post-launch)',
          required: false,
        },
        {
          id: 'contentPipeline',
          type: 'textarea',
          prompt: 'Content pipeline',
          description: 'How will new content be added?',
          placeholder: '- Data-driven enemies/items via spreadsheets\n- Hot-reload during development\n- Versioned content for updates\n- A/B testing framework',
          required: false,
        },
        {
          id: 'expansionPoints',
          type: 'textarea',
          prompt: 'Future expansion points',
          description: 'Where is the architecture designed to grow?',
          placeholder: '- New game modes via GameMode subclasses\n- DLC content chunks\n- New weapon types without code changes\n- Pluggable AI behaviors',
          required: false,
        },
      ],
    },
    {
      id: 'risks',
      title: 'Risks & Dependencies',
      agentMessage: "Let's identify technical risks and plan mitigations.",
      questions: [
        {
          id: 'technicalRisks',
          type: 'textarea',
          prompt: 'Technical risks & mitigations',
          description: 'What could go wrong technically?',
          placeholder: '| Risk | Impact | Likelihood | Mitigation |\n|------|--------|------------|------------|\n| Procedural gen too slow | High | Medium | Pre-generate chunks, async |\n| Network latency | Medium | High | Client prediction, interpolation |\n| Memory on Switch | High | High | Aggressive streaming, lower textures |',
          required: true,
        },
        {
          id: 'externalDependencies',
          type: 'textarea',
          prompt: 'External dependencies',
          description: 'Third-party dependencies and their risks',
          placeholder: '- Unreal Engine (Epic) - stable, well-supported\n- FMOD - audio middleware, licensed\n- Steam SDK - platform-specific',
          required: false,
        },
        {
          id: 'moduleDependencies',
          type: 'textarea',
          prompt: 'Internal module dependencies',
          description: 'How do your internal systems depend on each other?',
          placeholder: 'Core → Gameplay → UI\n\n- Core has no dependencies\n- Gameplay depends on Core\n- UI depends on Gameplay for data binding',
          required: false,
        },
      ],
    },
    {
      id: 'guidelines',
      title: 'Development Guidelines',
      agentMessage: "Finally, let's establish development practices to maintain quality.",
      questions: [
        {
          id: 'codingStandards',
          type: 'textarea',
          prompt: 'Coding standards',
          description: 'Code style, naming conventions, patterns',
          placeholder: '- Follow Unreal Engine coding standards\n- Prefix interfaces with I, abstract classes with A\n- Component-based architecture\n- Event-driven communication between systems',
          required: false,
        },
        {
          id: 'testingStrategy',
          type: 'textarea',
          prompt: 'Testing strategy',
          description: 'How will you test the game?',
          placeholder: '- Unit tests for core systems\n- Integration tests for gameplay flows\n- Automated playthroughs for regression\n- Performance benchmarks in CI',
          required: true,
        },
        {
          id: 'documentationRequirements',
          type: 'textarea',
          prompt: 'Documentation requirements',
          description: 'What documentation will be maintained?',
          placeholder: '- API docs for public classes\n- System overview docs\n- README in each module\n- Architecture decision records (ADRs)',
          required: false,
        },
      ],
      celebration: "Your architecture document is complete! Ready to build.",
    },
    {
      id: 'roadmap',
      title: 'Implementation Roadmap',
      agentMessage: "Let's break down the implementation into phases.",
      questions: [
        {
          id: 'phase1Duration',
          type: 'text',
          prompt: 'Phase 1 duration',
          description: 'Time for foundation phase',
          placeholder: '4 weeks',
          required: true,
        },
        {
          id: 'phase1Tasks',
          type: 'textarea',
          prompt: 'Phase 1: Foundation tasks',
          description: 'What gets built first?',
          placeholder: '- [ ] Project setup and folder structure\n- [ ] Core systems (input, save, config)\n- [ ] Basic player controller\n- [ ] Development tools (debug UI, console)',
          required: true,
        },
        {
          id: 'phase2Duration',
          type: 'text',
          prompt: 'Phase 2 duration',
          description: 'Time for core systems phase',
          placeholder: '8 weeks',
          required: true,
        },
        {
          id: 'phase2Tasks',
          type: 'textarea',
          prompt: 'Phase 2: Core Systems tasks',
          description: 'Main gameplay implementation',
          placeholder: '- [ ] Primary gameplay system\n- [ ] Secondary gameplay system\n- [ ] AI foundation\n- [ ] Audio integration',
          required: true,
        },
        {
          id: 'phase3Duration',
          type: 'text',
          prompt: 'Phase 3 duration',
          description: 'Time for polish phase',
          placeholder: '4 weeks',
          required: true,
        },
        {
          id: 'phase3Tasks',
          type: 'textarea',
          prompt: 'Phase 3: Polish & Integration tasks',
          description: 'Final integration and polish',
          placeholder: '- [ ] System integration testing\n- [ ] Performance optimization\n- [ ] Bug fixing\n- [ ] Documentation',
          required: true,
        },
      ],
    },
  ],
}
