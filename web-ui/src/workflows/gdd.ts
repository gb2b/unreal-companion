import { Workflow } from './types'

export const gddWorkflow: Workflow = {
  id: 'gdd',
  name: 'Game Design Document',
  description: 'Create a comprehensive GDD with all game systems',
  icon: 'BookOpen',
  color: 'from-indigo-500 to-purple-500',
  agent: 'game-designer',
  estimatedTime: '45-60 min',
  outputPath: 'design/gdd.md',
  dynamicPrompts: true,
  outputTemplate: `# Game Design Document - {{gameName}}

*Version {{version}} | Last Updated: {{date}}*

---

## 1. Overview

### 1.1 Game Concept
{{gameConcept}}

### 1.2 Target Audience
{{targetAudience}}

### 1.3 Platform & Requirements
{{platforms}}

### 1.4 Key Pillars
{{keyPillars}}

---

## 2. Gameplay

### 2.1 Core Loop
{{coreLoop}}

### 2.2 Session Flow
{{sessionFlow}}

### 2.3 Player Actions
{{playerActions}}

### 2.4 Controls
{{controls}}

---

## 3. Game Systems

### 3.1 Core Mechanics
{{coreMechanics}}

### 3.2 Progression System
{{progressionSystem}}

### 3.3 Economy
{{economy}}

### 3.4 Combat/Interaction System
{{combatSystem}}

---

## 4. Content

### 4.1 World & Setting
{{worldSetting}}

### 4.2 Characters
{{characters}}

### 4.3 Levels/Areas
{{levels}}

### 4.4 Items & Equipment
{{items}}

---

## 5. Narrative

### 5.1 Story Overview
{{storyOverview}}

### 5.2 Narrative Structure
{{narrativeStructure}}

### 5.3 Key Story Beats
{{storyBeats}}

### 5.4 Dialogue System
{{dialogueSystem}}

---

## 6. Art Direction

### 6.1 Visual Style
{{visualStyle}}

### 6.2 Character Design
{{characterDesign}}

### 6.3 Environment Design
{{environmentDesign}}

### 6.4 UI/UX Design
{{uiDesign}}

---

## 7. Audio

### 7.1 Music Direction
{{musicDirection}}

### 7.2 Sound Design
{{soundDesign}}

### 7.3 Voice Acting
{{voiceActing}}

---

## 8. Technical

### 8.1 Engine & Tools
{{engineTools}}

### 8.2 Performance Targets
{{performanceTargets}}

### 8.3 Platform Considerations
{{platformConsiderations}}

---

## 9. Production

### 9.1 Milestones
{{milestones}}

### 9.2 Team Structure
{{teamStructure}}

### 9.3 Risk Assessment
{{riskAssessment}}

---

## Appendix

### A. Glossary
{{glossary}}

### B. References
{{references}}

---
*Generated with Unreal Companion - GDD Workflow*
`,
  steps: [
    {
      id: 'overview',
      title: 'Game Overview',
      agentMessage: "Let's start with the big picture. Tell me about your game's core vision.",
      questions: [
        {
          id: 'gameName',
          type: 'text',
          prompt: 'Game Title',
          placeholder: 'Project Nebula',
          required: true,
        },
        {
          id: 'version',
          type: 'text',
          prompt: 'Document Version',
          placeholder: '1.0',
          required: true,
        },
        {
          id: 'gameConcept',
          type: 'textarea',
          prompt: 'Game Concept (2-3 paragraphs)',
          description: 'Describe what the game is, what makes it unique, and why players will love it.',
          placeholder: 'A roguelike deckbuilder where you play as a time-traveling detective...',
          required: true,
        },
        {
          id: 'targetAudience',
          type: 'textarea',
          prompt: 'Target Audience',
          description: 'Who is this game for? Age, preferences, gaming habits.',
          placeholder: 'Core gamers aged 18-35 who enjoy strategy games...',
          required: true,
        },
        {
          id: 'platforms',
          type: 'textarea',
          prompt: 'Platforms & Requirements',
          description: 'Target platforms and minimum requirements.',
          placeholder: 'PC (Steam), PlayStation 5, Xbox Series X|S\nMinimum: GTX 1060, 8GB RAM...',
          required: true,
        },
        {
          id: 'keyPillars',
          type: 'textarea',
          prompt: 'Design Pillars (3-4)',
          description: 'The non-negotiable core elements of your game.',
          placeholder: '1. Strategic Depth\n2. Emergent Narratives\n3. Satisfying Progression...',
          required: true,
        },
      ],
      celebration: "Great foundation! Let's dive into gameplay.",
    },
    {
      id: 'gameplay',
      title: 'Core Gameplay',
      agentMessage: "Now let's define what players actually DO in your game.",
      questions: [
        {
          id: 'coreLoop',
          type: 'textarea',
          prompt: 'Core Gameplay Loop',
          description: 'The fundamental cycle of play, second by second.',
          placeholder: 'Explore room → Encounter enemies → Choose cards → Execute actions → Collect rewards → Proceed...',
          required: true,
        },
        {
          id: 'sessionFlow',
          type: 'textarea',
          prompt: 'Session Flow',
          description: 'What happens in a typical 30-60 minute play session?',
          placeholder: 'Start run → Navigate floors → Boss encounters → Run completion/failure → Meta-progression...',
          required: true,
        },
        {
          id: 'playerActions',
          type: 'textarea',
          prompt: 'Primary Player Actions',
          description: 'List the main verbs/actions players perform.',
          placeholder: '- Move/Navigate\n- Attack/Cast\n- Block/Dodge\n- Collect items\n- Manage deck...',
          required: true,
        },
        {
          id: 'controls',
          type: 'textarea',
          prompt: 'Control Scheme',
          description: 'How players interact with the game.',
          placeholder: 'Mouse for card selection and targeting\nWASD/Arrow keys for movement\nSpace to confirm...',
          required: true,
        },
      ],
    },
    {
      id: 'systems',
      title: 'Game Systems',
      agentMessage: "Let's design the systems that power your game.",
      questions: [
        {
          id: 'coreMechanics',
          type: 'textarea',
          prompt: 'Core Mechanics',
          description: 'Detailed explanation of your main gameplay mechanics.',
          placeholder: '**Deckbuilding**: Players start with 10 basic cards and add/remove cards through gameplay...',
          required: true,
        },
        {
          id: 'progressionSystem',
          type: 'textarea',
          prompt: 'Progression System',
          description: 'How do players grow stronger over time?',
          placeholder: 'Within-run: Card upgrades, relics, gold\nMeta: Unlockable characters, starting bonuses, achievements...',
          required: true,
        },
        {
          id: 'economy',
          type: 'textarea',
          prompt: 'Economy System',
          description: 'Currencies, resources, and how they flow.',
          placeholder: 'Gold (in-run currency): Earned from combat, spent in shops\nMeta-currency: Earned on run completion...',
          required: false,
        },
        {
          id: 'combatSystem',
          type: 'textarea',
          prompt: 'Combat/Core Interaction System',
          description: 'If applicable, how does combat or core interaction work?',
          placeholder: 'Turn-based card combat:\n- Player draws 5 cards per turn\n- 3 energy to spend\n- Enemies telegraph next action...',
          required: false,
        },
      ],
      celebration: "Systems designed! Let's add content.",
    },
    {
      id: 'content',
      title: 'Game Content',
      agentMessage: "Time to fill your world with content.",
      questions: [
        {
          id: 'worldSetting',
          type: 'textarea',
          prompt: 'World & Setting',
          description: 'Where and when does the game take place?',
          placeholder: 'A noir-inspired city caught in a time loop. Art deco architecture meets quantum anomalies...',
          required: true,
        },
        {
          id: 'characters',
          type: 'textarea',
          prompt: 'Key Characters',
          description: 'Main characters and their roles.',
          placeholder: '**The Detective**: Player character, cynical but determined\n**The Oracle**: Mysterious guide...',
          required: true,
        },
        {
          id: 'levels',
          type: 'textarea',
          prompt: 'Levels/Areas/Zones',
          description: 'The major areas or levels in your game.',
          placeholder: 'Act 1: The Undercity (3 zones)\nAct 2: The Towers (3 zones)\nAct 3: The Nexus (2 zones + final boss)',
          required: true,
        },
        {
          id: 'items',
          type: 'textarea',
          prompt: 'Items & Equipment',
          description: 'Categories and examples of items.',
          placeholder: '**Cards**: 100+ unique cards across 4 types\n**Relics**: 50 passive items\n**Consumables**: 20 one-time use items',
          required: false,
        },
      ],
    },
    {
      id: 'narrative',
      title: 'Narrative Design',
      agentMessage: "Let's craft the story that brings your world to life.",
      questions: [
        {
          id: 'storyOverview',
          type: 'textarea',
          prompt: 'Story Overview',
          description: 'The main narrative arc in 2-3 paragraphs.',
          placeholder: 'Detective Aria discovers she is trapped in a time loop, reliving the same week...',
          required: true,
        },
        {
          id: 'narrativeStructure',
          type: 'textarea',
          prompt: 'Narrative Structure',
          description: 'How is the story delivered to the player?',
          placeholder: 'Environmental storytelling + dialogue scenes between runs + collectible lore entries...',
          required: true,
        },
        {
          id: 'storyBeats',
          type: 'textarea',
          prompt: 'Key Story Beats',
          description: 'Major plot points without spoilers.',
          placeholder: '1. Discovery of the loop\n2. First clue to the cause\n3. Revelation about the antagonist\n4. Final confrontation choices',
          required: false,
        },
        {
          id: 'dialogueSystem',
          type: 'textarea',
          prompt: 'Dialogue System',
          description: 'How do characters communicate?',
          placeholder: 'Visual novel-style dialogue boxes with character portraits. Branching choices that affect relationships...',
          required: false,
        },
      ],
      celebration: "Story crafted! Let's define the aesthetics.",
    },
    {
      id: 'art',
      title: 'Art Direction',
      agentMessage: "Now let's define how your game looks and feels.",
      questions: [
        {
          id: 'visualStyle',
          type: 'textarea',
          prompt: 'Visual Style',
          description: 'The overall aesthetic and artistic direction.',
          placeholder: 'Hand-painted 2D art with noir influence. Dark palette with neon accent colors...',
          required: true,
        },
        {
          id: 'characterDesign',
          type: 'textarea',
          prompt: 'Character Art Direction',
          description: 'Style guidelines for character design.',
          placeholder: 'Exaggerated proportions, expressive faces. Mix of 1940s fashion with futuristic elements...',
          required: true,
        },
        {
          id: 'environmentDesign',
          type: 'textarea',
          prompt: 'Environment Art Direction',
          description: 'Style guidelines for environments.',
          placeholder: 'Layered parallax backgrounds. Strong use of light and shadow. Each zone has distinct color palette...',
          required: true,
        },
        {
          id: 'uiDesign',
          type: 'textarea',
          prompt: 'UI/UX Design Direction',
          description: 'Interface design principles.',
          placeholder: 'Minimalist UI that doesn\'t obscure gameplay. Art deco frames. Clear iconography. Accessibility options...',
          required: true,
        },
      ],
    },
    {
      id: 'audio',
      title: 'Audio Design',
      agentMessage: "Let's design the soundscape of your game.",
      questions: [
        {
          id: 'musicDirection',
          type: 'textarea',
          prompt: 'Music Direction',
          description: 'Style and approach to the game\'s music.',
          placeholder: 'Jazz-noir soundtrack with synth elements. Dynamic layers that respond to gameplay intensity...',
          required: true,
        },
        {
          id: 'soundDesign',
          type: 'textarea',
          prompt: 'Sound Design',
          description: 'Approach to sound effects and ambiance.',
          placeholder: 'Punchy, satisfying card and combat sounds. Subtle ambient layers for each environment...',
          required: true,
        },
        {
          id: 'voiceActing',
          type: 'textarea',
          prompt: 'Voice Acting',
          description: 'Voice acting plans if any.',
          placeholder: 'Full voice acting for main story scenes. Grunts and callouts for combat. Multiple language options planned...',
          required: false,
        },
      ],
    },
    {
      id: 'technical',
      title: 'Technical Design',
      agentMessage: "Let's cover the technical foundation.",
      questions: [
        {
          id: 'engineTools',
          type: 'textarea',
          prompt: 'Engine & Tools',
          description: 'Technology stack for development.',
          placeholder: 'Unreal Engine 5.4\nWwise for audio\nPlasticSCM for version control\nJira for project management',
          required: true,
        },
        {
          id: 'performanceTargets',
          type: 'textarea',
          prompt: 'Performance Targets',
          description: 'FPS, resolution, and other metrics.',
          placeholder: '60 FPS on PS5/Xbox Series X\n30 FPS on Steam Deck\n4K resolution on high-end PCs',
          required: true,
        },
        {
          id: 'platformConsiderations',
          type: 'textarea',
          prompt: 'Platform-Specific Considerations',
          description: 'Special requirements per platform.',
          placeholder: 'Steam Deck: Custom control bindings, optimized battery mode\nConsole: Haptic feedback, achievements integration',
          required: false,
        },
      ],
    },
    {
      id: 'production',
      title: 'Production Plan',
      agentMessage: "Finally, let's outline the production roadmap.",
      questions: [
        {
          id: 'milestones',
          type: 'textarea',
          prompt: 'Milestones',
          description: 'Key development milestones.',
          placeholder: 'Prototype: Core loop playable\nAlpha: All systems, 50% content\nBeta: Feature complete, polish\nGold: Release candidate',
          required: true,
        },
        {
          id: 'teamStructure',
          type: 'textarea',
          prompt: 'Team Structure',
          description: 'Team roles and responsibilities.',
          placeholder: '1 Game Designer (Lead)\n2 Programmers\n1 Artist\n1 Audio Designer\n1 Producer',
          required: true,
        },
        {
          id: 'riskAssessment',
          type: 'textarea',
          prompt: 'Risk Assessment',
          description: 'Known risks and mitigation strategies.',
          placeholder: 'Risk: Procedural generation quality → Mitigation: Handcrafted elements + generation rules\nRisk: Scope creep → Mitigation: Strict MVP definition',
          required: false,
        },
        {
          id: 'glossary',
          type: 'textarea',
          prompt: 'Glossary (optional)',
          description: 'Define key terms used in this document.',
          placeholder: 'Run: A single playthrough attempt\nMeta-progression: Permanent unlocks across runs',
          required: false,
        },
        {
          id: 'references',
          type: 'textarea',
          prompt: 'References',
          description: 'Games, media, or other references.',
          placeholder: 'Slay the Spire, Hades, Disco Elysium, Blade Runner',
          required: false,
        },
      ],
      celebration: "Your GDD is complete! Time to build this game.",
    },
  ],
}
