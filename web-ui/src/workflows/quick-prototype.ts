import { Workflow } from './types'

export const quickPrototypeWorkflow: Workflow = {
  id: 'quick-prototype',
  name: 'Quick Prototype',
  description: 'Define your game idea in 5 minutes',
  icon: 'Zap',
  color: 'from-amber-500 to-orange-500',
  agent: 'indie',
  estimatedTime: '5 min',
  outputPath: 'concept/quick-prototype.md',
  outputTemplate: `# Quick Prototype - {{gameName}}

## Core Concept
{{concept}}

## Genre & Inspirations
- **Genre**: {{genre}}
- **Inspirations**: {{inspirations}}

## The Hook
{{hook}}

## Core Mechanic
{{coreMechanic}}

## Target Experience
- **Session Length**: {{sessionLength}}
- **Player Feeling**: {{playerFeeling}}

## MVP Scope (3 features max)
{{mvpFeatures}}

---
*Generated with Unreal Companion - Quick Prototype Workflow*
*Date: {{date}}*
`,
  steps: [
    {
      id: 'intro',
      title: "What's your game?",
      agentMessage: "Hey! Let's nail down your game idea real quick. No pressure, just vibes. What are we building?",
      questions: [
        {
          id: 'gameName',
          type: 'text',
          prompt: "What's your game called?",
          description: "Working title is fine, we can change it later",
          placeholder: 'My Awesome Game',
          required: true,
        },
        {
          id: 'concept',
          type: 'textarea',
          prompt: 'Describe your game in 1-2 sentences',
          description: 'The elevator pitch. What makes it interesting?',
          placeholder: "It's a roguelike where you play as a cat collecting artifacts in a procedural dungeon...",
          required: true,
        },
      ],
      celebration: "Nice! I can already see it taking shape.",
    },
    {
      id: 'genre',
      title: 'Genre & Vibes',
      agentMessage: "Cool concept! Now let's figure out what kind of game this is and what inspired you.",
      questions: [
        {
          id: 'genre',
          type: 'single',
          prompt: "What's the primary genre?",
          options: [
            { id: 'action', label: 'Action / Shooter', description: 'Fast-paced, reflex-based' },
            { id: 'adventure', label: 'Adventure / Exploration', description: 'Story, discovery, puzzles' },
            { id: 'rpg', label: 'RPG', description: 'Stats, progression, choices' },
            { id: 'roguelike', label: 'Roguelike / Roguelite', description: 'Runs, permadeath, variety' },
            { id: 'puzzle', label: 'Puzzle / Strategy', description: 'Thinking, planning, solving' },
            { id: 'platformer', label: 'Platformer', description: 'Jumping, precision, flow' },
            { id: 'simulation', label: 'Simulation / Management', description: 'Systems, growth, optimization' },
            { id: 'other', label: 'Other / Hybrid', description: 'Describe your unique genre', allowCustom: true },
          ],
          required: true,
        },
        {
          id: 'inspirations',
          type: 'text',
          prompt: 'What games inspire this? (2-3 titles)',
          placeholder: 'Hades, Dead Cells, Enter the Gungeon',
          required: false,
          suggestionsKey: 'references_by_genre',
        },
      ],
    },
    {
      id: 'hook',
      title: 'The Hook',
      agentMessage: "Every great game has a hook - that one thing that makes people say 'I need to try this'. What's yours?",
      questions: [
        {
          id: 'hook',
          type: 'textarea',
          prompt: "What's the unique hook?",
          description: 'The one thing that sets your game apart',
          placeholder: 'You can rewind time but it costs health, forcing strategic decisions...',
          required: true,
        },
        {
          id: 'coreMechanic',
          type: 'textarea',
          prompt: 'Describe the core mechanic',
          description: 'The main action players will do over and over',
          placeholder: 'Click to dash through enemies, chain kills for combo multiplier...',
          required: true,
        },
      ],
      celebration: "That's a solid hook! I'd play that.",
    },
    {
      id: 'scope',
      title: 'Scope & MVP',
      agentMessage: "Last step! Let's define what 'done' looks like for a first playable version.",
      questions: [
        {
          id: 'sessionLength',
          type: 'single',
          prompt: 'Target session length?',
          options: [
            { id: '5min', label: '5-10 minutes', description: 'Quick pick-up-and-play' },
            { id: '30min', label: '20-30 minutes', description: 'Medium session' },
            { id: '1hour', label: '1+ hour', description: 'Longer play sessions' },
            { id: 'variable', label: 'Variable', description: 'Player decides' },
          ],
          required: true,
        },
        {
          id: 'playerFeeling',
          type: 'single',
          prompt: 'How should players FEEL?',
          description: 'The core emotion you want to evoke',
          options: [
            { id: 'powerful', label: 'Powerful', description: 'Dominating, skilled, badass' },
            { id: 'clever', label: 'Clever', description: 'Smart, strategic, satisfying' },
            { id: 'tense', label: 'Tense', description: 'On edge, risk/reward' },
            { id: 'relaxed', label: 'Relaxed', description: 'Chill, meditative, cozy' },
            { id: 'curious', label: 'Curious', description: 'Exploring, discovering' },
            { id: 'creative', label: 'Creative', description: 'Building, expressing' },
          ],
          required: true,
        },
        {
          id: 'mvpFeatures',
          type: 'textarea',
          prompt: 'List 3 features for MVP (max!)',
          description: 'What absolutely needs to work for a first playable?',
          placeholder: '1. Core movement + combat\n2. One complete level\n3. Basic enemy AI',
          required: true,
        },
      ],
      celebration: "Ship it! Your prototype is defined. Now let's build it.",
    },
  ],
}
