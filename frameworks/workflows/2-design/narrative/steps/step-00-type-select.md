# Step 0: Select Narrative Document Type

## Goal
Determine which type of narrative document the user wants to create.

## Instructions

Present the user with the available narrative document types:

---

**What kind of narrative content would you like to create?**

| # | Type | Description | Time |
|---|------|-------------|------|
| 1 | 📚 **Narrative Bible** | Complete narrative foundation - world, characters, story structure | 45-60 min |
| 2 | 👤 **Character Profile** | Deep dive into a single character | 15-20 min |
| 3 | 🗡️ **Quest Design** | Design a quest or mission | 15-20 min |
| 4 | 📜 **Lore Entry** | World-building lore piece | 10-15 min |
| 5 | 💬 **Dialogue Script** | Write a dialogue sequence | 15-20 min |

**Choose a number (1-5):**

---

## On Selection

Based on user choice:

1. **Narrative Bible** → Continue to step "premise" (full workflow)
2. **Character Profile** → Ask character name, then use `character_steps`
3. **Quest Design** → Ask quest name, then use `quest_steps`
4. **Lore Entry** → Ask topic, then use `lore_steps`
5. **Dialogue Script** → Ask context, then use dialogue steps

## Subject Extraction

For types 2-5, extract the subject from the user's response:
- "I want to create a character for the villain" → subject = "villain"
- "Let's design the main story quest" → subject = "main-story"
- "Write lore about the ancient war" → subject = "ancient-war"

**Slugify the subject** for the filename:
- "The Dark Lord Malachar" → "dark-lord-malachar"
- "Ancient War of the Titans" → "ancient-war-titans"
