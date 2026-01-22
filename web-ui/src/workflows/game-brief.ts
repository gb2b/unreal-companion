import { Workflow } from './types'

export const gameBriefWorkflow: Workflow = {
  id: 'game-brief',
  name: 'Game Brief',
  description: 'Create a complete game brief document',
  icon: 'FileText',
  color: 'from-purple-500 to-pink-500',
  agent: 'game-designer',
  estimatedTime: '30 min',
  outputPath: 'concept/game-brief.md',
  outputTemplate: `# Game Brief - {{gameName}}

## Executive Summary
{{elevatorPitch}}

## Vision Statement
{{visionStatement}}

## Core Pillars
{{corePillars}}

## Target Audience

### Demographics
- **Age Range**: {{ageRange}}
- **Player Type**: {{playerType}}
- **Platform**: {{platform}}

### Player Motivations
{{playerMotivations}}

## Genre & Inspirations

### Primary Genre
{{genre}}
{{genreCustom}}

### Key Inspirations
{{inspirations}}

### What We Take From Each
{{inspirationDetails}}

## Unique Selling Points (USP)

### Primary Hook
{{primaryHook}}

### Secondary Differentiators
{{secondaryDifferentiators}}

## Core Gameplay Loop

### Moment-to-Moment
{{momentToMoment}}

### Session Loop
{{sessionLoop}}

### Long-term Loop
{{longTermLoop}}

## Key Features (MVP)

### Must Have
{{mustHaveFeatures}}

### Should Have
{{shouldHaveFeatures}}

### Could Have (Post-MVP)
{{couldHaveFeatures}}

## Scope & Constraints

### Team Size
{{teamSize}}

### Timeline Target
{{timeline}}

### Technical Constraints
{{technicalConstraints}}

### Known Risks
{{risks}}

## Success Metrics

### Definition of Done (MVP)
{{mvpDefinition}}

### Success Criteria
{{successCriteria}}

## Art Direction (Brief)
{{artDirection}}

## Audio Direction (Brief)
{{audioDirection}}

## Next Steps
1. Create detailed GDD
2. Prototype core loop
3. Validate with playtesting

---
*Generated with Unreal Companion - Game Brief Workflow*
*Date: {{date}}*
`,
  steps: [
    {
      id: 'vision',
      title: 'Vision & Pitch',
      agentMessage: "Let's start with the big picture. What's your game about and why does it matter?",
      questions: [
        {
          id: 'gameName',
          type: 'text',
          prompt: "What's your game called?",
          description: 'Working title is fine',
          placeholder: 'Project Nebula',
          required: true,
        },
        {
          id: 'elevatorPitch',
          type: 'textarea',
          prompt: 'Elevator pitch (2-3 sentences)',
          description: 'If you had 30 seconds to explain your game, what would you say?',
          placeholder: 'A roguelike deckbuilder where you play as a time-traveling detective, solving procedurally generated murder mysteries by manipulating the timeline...',
          required: true,
        },
        {
          id: 'visionStatement',
          type: 'textarea',
          prompt: 'Vision statement',
          description: 'What experience do you want players to have? How should they feel?',
          placeholder: 'Players should feel like brilliant detectives, piecing together clues across time, with that satisfying "aha!" moment when everything clicks...',
          required: true,
        },
      ],
      celebration: "Great vision! Let's dig deeper.",
    },
    {
      id: 'pillars',
      title: 'Core Pillars',
      agentMessage: "Every great game stands on 3-4 core pillars - the non-negotiable elements that define the experience.",
      questions: [
        {
          id: 'corePillars',
          type: 'textarea',
          prompt: 'Define your 3-4 core pillars',
          description: 'These are the fundamental elements that everything else is built on',
          placeholder: '1. **Temporal Mastery** - Time manipulation as core mechanic\n2. **Deductive Gameplay** - Logical puzzle-solving\n3. **Emergent Stories** - Procedural mysteries that feel handcrafted\n4. **Meaningful Choices** - Every decision has consequences',
          required: true,
        },
      ],
    },
    {
      id: 'audience',
      title: 'Target Audience',
      agentMessage: "Who are we making this for? Understanding your audience shapes every design decision.",
      questions: [
        {
          id: 'ageRange',
          type: 'single',
          prompt: 'Primary age range',
          options: [
            { id: 'teens', label: '13-17', description: 'Teen gamers' },
            { id: 'young-adult', label: '18-25', description: 'Young adults' },
            { id: 'adult', label: '25-35', description: 'Core gaming demographic' },
            { id: 'mature', label: '35+', description: 'Mature gamers' },
            { id: 'all-ages', label: 'All ages', description: 'Family-friendly' },
          ],
          required: true,
        },
        {
          id: 'playerType',
          type: 'single',
          prompt: 'Primary player type (Bartle taxonomy)',
          options: [
            { id: 'achiever', label: 'Achievers', description: 'Love goals, progression, completion' },
            { id: 'explorer', label: 'Explorers', description: 'Love discovery, secrets, lore' },
            { id: 'socializer', label: 'Socializers', description: 'Love community, cooperation' },
            { id: 'killer', label: 'Competitors', description: 'Love challenge, competition, mastery' },
          ],
          required: true,
        },
        {
          id: 'platform',
          type: 'multiple',
          prompt: 'Target platforms',
          options: [
            { id: 'pc', label: 'PC (Steam)', description: 'Windows/Mac/Linux' },
            { id: 'console', label: 'Consoles', description: 'PS5, Xbox, Switch' },
            { id: 'mobile', label: 'Mobile', description: 'iOS, Android' },
            { id: 'vr', label: 'VR', description: 'Quest, PCVR' },
          ],
          required: true,
        },
        {
          id: 'playerMotivations',
          type: 'textarea',
          prompt: 'What motivates your players?',
          description: 'Why will they play? What need does your game fulfill?',
          placeholder: 'They want to feel smart and capable. They enjoy complex puzzles that reward careful thinking. They love "just one more run" games...',
          required: false,
        },
      ],
      celebration: "You know your audience! That's crucial.",
    },
    {
      id: 'genre',
      title: 'Genre & References',
      agentMessage: "Let's position your game in the market. What genre is it, and what games inspire you?",
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
          type: 'textarea',
          prompt: 'Key inspirations (3-5 games)',
          description: 'What games inspire this project?',
          placeholder: '1. Slay the Spire - Deckbuilding roguelike structure\n2. Return of the Obra Dinn - Deductive investigation\n3. Hades - Narrative in roguelike format',
          required: true,
          suggestionsKey: 'references_by_genre',
        },
        {
          id: 'inspirationDetails',
          type: 'textarea',
          prompt: 'What do you take from each?',
          description: 'Be specific about what elements you want to incorporate',
          placeholder: 'From Slay the Spire: The "one more run" loop and card synergies\nFrom Obra Dinn: The satisfaction of deduction\nFrom Hades: Story that progresses through failure',
          required: false,
        },
      ],
    },
    {
      id: 'usp',
      title: 'Unique Selling Points',
      agentMessage: "What makes your game special? Why should someone play THIS game instead of alternatives?",
      questions: [
        {
          id: 'primaryHook',
          type: 'textarea',
          prompt: "What's your primary hook?",
          description: 'The ONE thing that makes people say "I need to try this"',
          placeholder: 'Time manipulation as a core puzzle mechanic - you can rewind, pause, and fast-forward evidence to solve crimes across different timelines.',
          required: true,
        },
        {
          id: 'secondaryDifferentiators',
          type: 'textarea',
          prompt: 'Secondary differentiators',
          description: 'Other things that set you apart (2-3 points)',
          placeholder: '- Procedurally generated mysteries that feel hand-crafted\n- Consequences persist across runs\n- Choose your detective\'s personality, affecting dialogue and solutions',
          required: false,
        },
      ],
      celebration: "Now we're getting to the good stuff!",
    },
    {
      id: 'gameplay',
      title: 'Core Gameplay Loop',
      agentMessage: "Let's define what players actually DO in your game, at different timescales.",
      questions: [
        {
          id: 'momentToMoment',
          type: 'textarea',
          prompt: 'Moment-to-moment gameplay (seconds)',
          description: 'What are players doing second-to-second?',
          placeholder: 'Examining crime scenes, talking to suspects, playing evidence cards to reveal information, manipulating the timeline...',
          required: true,
        },
        {
          id: 'sessionLoop',
          type: 'textarea',
          prompt: 'Session loop (minutes to hours)',
          description: 'What happens in a typical play session?',
          placeholder: 'Solve one complete mystery (15-30 min), unlock new cards/abilities, discover meta-story beats, start new case...',
          required: true,
        },
        {
          id: 'longTermLoop',
          type: 'textarea',
          prompt: 'Long-term loop (days/weeks)',
          description: 'What keeps players coming back?',
          placeholder: 'Unlock new detective personas, uncover the overarching conspiracy, complete case collections, chase high scores...',
          required: false,
        },
      ],
    },
    {
      id: 'features',
      title: 'Key Features',
      agentMessage: "Time to scope! What's essential for MVP, what's nice-to-have, and what's future?",
      questions: [
        {
          id: 'mustHaveFeatures',
          type: 'textarea',
          prompt: 'Must Have (MVP)',
          description: 'Features absolutely required for first playable',
          placeholder: '- Core time manipulation mechanic\n- 3 complete, handcrafted tutorial cases\n- Basic deckbuilding with 20 unique cards\n- One playable detective',
          required: true,
        },
        {
          id: 'shouldHaveFeatures',
          type: 'textarea',
          prompt: 'Should Have (MVP+)',
          description: 'Important features for a complete experience',
          placeholder: '- Procedural mystery generation\n- 3 different detectives\n- Meta-progression unlocks\n- Full story arc',
          required: false,
        },
        {
          id: 'couldHaveFeatures',
          type: 'textarea',
          prompt: 'Could Have (Post-MVP)',
          description: 'Nice-to-have features for later',
          placeholder: '- Multiplayer co-op mode\n- Level editor\n- Daily challenge cases\n- Mod support',
          required: false,
        },
      ],
      celebration: "Scope is defined! That's half the battle.",
    },
    {
      id: 'constraints',
      title: 'Scope & Constraints',
      agentMessage: "Let's be realistic about what we can achieve. Constraints breed creativity!",
      questions: [
        {
          id: 'teamSize',
          type: 'single',
          prompt: 'Team size',
          options: [
            { id: 'solo', label: 'Solo', description: 'Just you' },
            { id: 'tiny', label: '2-3 people', description: 'Tiny team' },
            { id: 'small', label: '4-10 people', description: 'Small indie' },
            { id: 'medium', label: '10-30 people', description: 'Medium studio' },
          ],
          required: true,
        },
        {
          id: 'timeline',
          type: 'single',
          prompt: 'Target timeline to MVP',
          options: [
            { id: '3months', label: '3 months', description: 'Rapid prototype' },
            { id: '6months', label: '6 months', description: 'Focused development' },
            { id: '1year', label: '1 year', description: 'Full development cycle' },
            { id: '2years', label: '2+ years', description: 'Major production' },
          ],
          required: true,
        },
        {
          id: 'technicalConstraints',
          type: 'textarea',
          prompt: 'Technical constraints',
          description: 'Engine, platform limitations, performance targets...',
          placeholder: 'Unreal Engine 5, target 60fps on mid-range PC, must run on Steam Deck...',
          required: false,
        },
        {
          id: 'risks',
          type: 'textarea',
          prompt: 'Known risks',
          description: 'What could go wrong? What are you unsure about?',
          placeholder: '- Procedural generation quality is unproven\n- Time manipulation might be confusing\n- Story pacing in roguelike is tricky',
          required: false,
        },
      ],
    },
    {
      id: 'success',
      title: 'Success Criteria',
      agentMessage: "How will you know when you've succeeded? Let's define done.",
      questions: [
        {
          id: 'mvpDefinition',
          type: 'textarea',
          prompt: 'Definition of Done (MVP)',
          description: 'What needs to be true for MVP to be "done"?',
          placeholder: '- Player can complete 3 tutorial cases\n- Core loop is fun in playtesting\n- 15-minute session feels complete\n- No critical bugs',
          required: true,
        },
        {
          id: 'successCriteria',
          type: 'textarea',
          prompt: 'Success criteria (long-term)',
          description: 'How will you measure success?',
          placeholder: '- Positive Steam reviews (70%+)\n- Players finish at least 5 cases on average\n- Active community sharing solutions\n- Break even on development costs',
          required: false,
        },
      ],
    },
    {
      id: 'direction',
      title: 'Art & Audio Direction',
      agentMessage: "Last step! Let's capture the aesthetic vision briefly.",
      questions: [
        {
          id: 'artDirection',
          type: 'textarea',
          prompt: 'Art direction (brief)',
          description: 'Visual style, mood, references',
          placeholder: 'Noir-inspired with time distortion effects. Think "Disco Elysium meets Inception". Muted colors with pops of temporal energy. Hand-painted character portraits.',
          required: false,
        },
        {
          id: 'audioDirection',
          type: 'textarea',
          prompt: 'Audio direction (brief)',
          description: 'Music style, sound design mood',
          placeholder: 'Jazz-noir soundtrack with electronic distortion during time manipulation. Satisfying "click" sounds for deductions. Voice acting for key characters.',
          required: false,
        },
      ],
      celebration: "Your game brief is complete! Time to build it.",
    },
  ],
}
