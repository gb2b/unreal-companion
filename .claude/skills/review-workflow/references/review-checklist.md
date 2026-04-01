# Workflow Review Quick Checklist

| Category | Check | Severity |
|----------|-------|----------|
| Files | workflow.yaml exists | CRITICAL |
| Files | instructions.md exists | CRITICAL |
| Files | steps/ directory exists | CRITICAL |
| Files | template.md exists | WARNING |
| YAML | id matches directory | CRITICAL |
| YAML | phase matches parent | WARNING |
| YAML | agent exists | CRITICAL |
| YAML | step IDs match files | CRITICAL |
| Steps | Mandatory rules present | WARNING |
| Steps | User questions present | WARNING |
| Steps | Menu [A][P][C][AE] present | INFO |
| Steps | Review step at end | WARNING |
| Instructions | XML control flow | WARNING |
| Instructions | One-step-at-a-time | WARNING |
| Loader | YAML parses | CRITICAL |
| Loader | No broken paths | CRITICAL |
| Content | No TODOs/placeholders | WARNING |
| Content | Logical step progression | INFO |
