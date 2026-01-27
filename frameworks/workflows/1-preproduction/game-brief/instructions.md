<critical>The workflow execution engine is governed by: {project-root}/.unreal-companion/core/workflow-engine.md</critical>
<critical>You MUST have already loaded and processed: {installed_path}/workflow.yaml</critical>
<critical>Communicate all responses in {communication_language}</critical>
<critical>Document output in {document_output_language}</critical>
<critical>⚠️ NO TIME ESTIMATES - Never mention hours, days, weeks. AI has changed development speed.</critical>
<critical>⚠️ CHECKPOINT PROTOCOL: After EVERY template-output tag, SAVE → SHOW separator → DISPLAY content → PRESENT options → WAIT for user.</critical>

<workflow>

  <step n="1" goal="Initialize and prepare" tag="workflow-init">
    <action>Check if output document already exists at {default_output_file}</action>
    
    <check if="document exists with status: in_progress">
      <output>Found an existing Game Brief in progress!</output>
      <ask>Would you like to:
1. Continue where you left off
2. Start fresh (backup existing)

Your choice:</ask>
      <check if="1">
        <action>Load existing document, read stepsCompleted from frontmatter</action>
        <action>Jump to first incomplete step</action>
      </check>
      <check if="2">
        <action>Rename existing to game-brief-backup-{date}.md</action>
        <action>Continue with fresh start</action>
      </check>
    </check>
    
    <check if="document exists with status: complete">
      <output>⚠️ A completed Game Brief already exists.</output>
      <ask>This is a one-shot workflow. Do you want to:
1. View the existing document
2. Create a new version (backup existing)
3. Cancel

Your choice:</ask>
    </check>
    
    <action>Load context from input_discovery patterns</action>
    <action>Prepare user for the creative process</action>
    
    <output>**Welcome to the Game Brief Workflow, {user_name}!**

We'll define your game's vision through these sections:
1. Game Identity - Name, genre, hook
2. Vision Statement - The core experience
3. Design Pillars - 3-5 guiding principles
4. References - Games and media that inspire you
5. Target Audience - Who will play your game
6. Scope - Platform, timeline, constraints

Ready to begin? [Y/N]</output>
    
    <ask>Wait for confirmation</ask>
    
    <action>Create initial document from template with empty sections</action>
    <action>Update frontmatter: stepsCompleted: [1]</action>
  </step>

  <step n="2" goal="Define Game Identity" tag="identity">
    <action>Read context.md for identity guidance</action>
    
    <output>**Step 2: Game Identity**

Let's establish your game's core identity. This is the "elevator pitch" - what makes your game unique?</output>
    
    <ask>**Game Name:** What's your working title?
(Don't worry, it can change later)</ask>
    
    <ask>**Genre:** What genre or genre blend?
Examples: Roguelike FPS, Narrative Puzzle, Action RPG with crafting...</ask>
    
    <ask>**The Hook:** In one sentence, what makes your game special?
What's the "I've never seen this before" element?</ask>
    
    <template-output section="Game Identity">
## Game Identity

**Name:** {{game_name}}

**Genre:** {{genre}}

**Hook:** {{hook}}
    </template-output>
    
    <action>Update frontmatter: stepsCompleted: [1, 2]</action>
  </step>

  <step n="3" goal="Craft Vision Statement" tag="vision">
    <output>**Step 3: Vision Statement**

The vision is the emotional core - what players should FEEL when playing.</output>
    
    <ask>**Core Experience:** 
When someone finishes playing your game, how do you want them to feel?
What memory should they take away?</ask>
    
    <ask>**Player Fantasy:**
What identity or power fantasy does your game fulfill?
What can players do/be that they can't in real life?</ask>
    
    <template-output section="Vision">
## Vision

**Core Experience:** {{core_experience}}

**Player Fantasy:** {{player_fantasy}}

**Vision Statement:**
{{generated_vision_statement}}
    </template-output>
    
    <action>Update frontmatter: stepsCompleted: [1, 2, 3]</action>
  </step>

  <step n="4" goal="Define Core Pillars" tag="pillars">
    <output>**Step 4: Core Design Pillars**

Pillars are your guiding principles - when you're unsure about a design decision, these tell you what to prioritize.</output>
    
    <ask>**Pillar Ideas:**
What are 3-5 non-negotiable aspects of your game?
Examples:
- "Always Fair" - difficulty challenges skill, not RNG
- "Player Expression" - multiple valid solutions
- "Emergent Stories" - systems create unique moments

What are YOUR pillars?</ask>
    
    <template-output section="Core Pillars">
## Core Pillars

{{#each pillars}}
### {{pillar.number}}. {{pillar.name}}
{{pillar.description}}

{{/each}}
    </template-output>
    
    <action>Update frontmatter: stepsCompleted: [1, 2, 3, 4]</action>
  </step>

  <step n="5" goal="Gather References" tag="references">
    <output>**Step 5: References & Inspirations**

No game exists in a vacuum. What inspires you?</output>
    
    <ask>**Game References:**
What games inspire this project? What do you take from each?
Format: "Game Name - what I want to capture"</ask>
    
    <ask>**Other Media:**
Any films, books, music, or art that influence the tone/feel?</ask>
    
    <template-output section="References & Inspirations">
## References & Inspirations

### Game References
{{game_references}}

### Other Media
{{other_media}}
    </template-output>
    
    <action>Update frontmatter: stepsCompleted: [1, 2, 3, 4, 5]</action>
  </step>

  <step n="6" goal="Define Target Audience" tag="audience">
    <output>**Step 6: Target Audience**

Who will play your game? Understanding your audience shapes every design decision.</output>
    
    <ask>**Primary Audience:**
Who is your ideal player? Describe them:
- Age range, gaming experience
- What games do they currently play?
- What draws them to your genre?</ask>
    
    <ask>**Player Motivation:**
Why will they play YOUR game specifically?
What need or desire does it fulfill?</ask>
    
    <template-output section="Target Audience">
## Target Audience

### Primary Audience
{{primary_audience}}

### Player Motivation
{{player_motivation}}

### Accessibility Considerations
{{accessibility_notes}}
    </template-output>
    
    <action>Update frontmatter: stepsCompleted: [1, 2, 3, 4, 5, 6]</action>
  </step>

  <step n="7" goal="Define Scope" tag="scope">
    <output>**Step 7: Scope & Constraints**

Let's be realistic about what you can achieve. This protects your vision by setting boundaries.</output>
    
    <ask>**Platform(s):**
Where will your game launch?
PC, Console, Mobile, VR?</ask>
    
    <ask>**Team & Timeline:**
How big is your team (or is it solo)?
What's your target timeline?</ask>
    
    <ask>**MVP Definition:**
What's the MINIMUM version that captures your vision?
What features are "must have" vs "nice to have"?</ask>
    
    <template-output section="Scope & Constraints">
## Scope & Constraints

### Target Platform(s)
{{platforms}}

### Team Composition
{{team}}

### MVP Features (Must Have)
{{mvp_features}}

### Future Features (Nice to Have)
{{future_features}}

### Known Constraints
{{constraints}}
    </template-output>
    
    <action>Update frontmatter: stepsCompleted: [1, 2, 3, 4, 5, 6, 7]</action>
  </step>

  <step n="8" goal="Review and Complete" tag="review">
    <action>Display complete document</action>
    
    <output>**Step 8: Review**

Here's your complete Game Brief. Let's make sure everything captures your vision.</output>
    
    <ask>**Review each section:**
- Is anything missing?
- Does anything need refinement?
- Does this document capture YOUR game?

Any changes? (or type 'complete' to finish)</ask>
    
    <check if="changes requested">
      <action>Navigate to specific section for editing</action>
      <goto step="review" after="edit complete"/>
    </check>
    
    <action>Update frontmatter: 
      status: complete
      completed_at: {datetime}
      stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
    </action>
    
    <action>Update workflow-status.yaml: game-brief → path to document</action>
    <action>Update project-context.md with game brief summary</action>
    
    <output>**✅ Game Brief Complete, {user_name}!**

**Document saved:** {default_output_file}

**Next Steps:**
- Your Game Brief is ready! It will guide your GDD development.
- Consider running the **GDD workflow** next to expand on these concepts.
- Or start **brainstorming** specific game mechanics.

Check status anytime with: `workflow-status`</output>
  </step>

</workflow>
