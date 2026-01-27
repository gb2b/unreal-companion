---
name: code-review
description: |
  Code review checklist and best practices for game development.
  Use when reviewing Blueprint or C++ code.
---

# Code Review

## When to Use

- Reviewing pull requests
- Self-review before committing
- Architecture review
- Performance audit

## Blueprint Review Checklist

### Structure
- [ ] Blueprint follows naming conventions (BP_, WBP_, etc.)
- [ ] Components are logically organized
- [ ] Functions are appropriately scoped (public/private)
- [ ] Variables have appropriate access levels

### Logic
- [ ] Event graph is not overcrowded (use functions)
- [ ] No spaghetti connections - use sequences, functions
- [ ] Loops have proper exit conditions
- [ ] Branches handle all cases

### Performance
- [ ] Tick is disabled if not needed
- [ ] Heavy operations not on Tick
- [ ] Arrays not searched every frame
- [ ] Casts cached, not repeated

### Best Practices
- [ ] Comments explain WHY, not WHAT
- [ ] Magic numbers replaced with variables
- [ ] Error cases handled gracefully
- [ ] Debug code removed/disabled

## C++ Review Checklist

### Memory
- [ ] Smart pointers used appropriately
- [ ] No memory leaks (RAII)
- [ ] TArray preferred over raw arrays
- [ ] FString for strings, not std::string

### Unreal Conventions
- [ ] UPROPERTY/UFUNCTION macros correct
- [ ] Proper use of GENERATED_BODY()
- [ ] BlueprintCallable where needed
- [ ] Replicated properties marked correctly

### Performance
- [ ] const correctness
- [ ] Pass by reference for large objects
- [ ] Avoid unnecessary allocations
- [ ] Profile-guided optimizations

### Thread Safety
- [ ] GameThread operations on GameThread
- [ ] Async operations properly synchronized
- [ ] No race conditions

## Common Issues

### Blueprint Anti-Patterns

```
❌ Long chains without organization
   → Use collapsed graphs or functions

❌ Tick doing expensive operations
   → Use timers or events

❌ Casting every frame
   → Cache the result

❌ Getting all actors every frame
   → Cache or use delegates
```

### C++ Anti-Patterns

```cpp
// ❌ Raw pointer ownership unclear
AActor* MyActor;

// ✅ Clear ownership with TObjectPtr
UPROPERTY()
TObjectPtr<AActor> MyActor;

// ❌ String concatenation in loop
for (auto& Item : Items) {
    Result += Item.Name;
}

// ✅ Use StringBuilder pattern
FString::JoinBy(Items, TEXT(", "), [](const FItem& I) { return I.Name; });
```

## Review Process

1. **First Pass: Structure**
   - Does it make sense?
   - Is it organized?
   - Can I understand it quickly?

2. **Second Pass: Logic**
   - Does it do what it claims?
   - Are edge cases handled?
   - Is error handling appropriate?

3. **Third Pass: Performance**
   - Any obvious bottlenecks?
   - Unnecessary operations?
   - Memory concerns?

4. **Fourth Pass: Style**
   - Naming conventions?
   - Comments useful?
   - Consistent formatting?

## Feedback Guidelines

### Good Feedback

```
"This loop runs on every tick. Consider using a timer 
or caching the result if the data doesn't change often."

"The variable name 'x' doesn't convey meaning. 
Consider 'playerHealth' or similar."
```

### Poor Feedback

```
"This is wrong" (no explanation)
"I would do it differently" (no alternative shown)
"This is ugly" (subjective, not actionable)
```

## Severity Levels

| Level | Description | Action |
|-------|-------------|--------|
| 🔴 Critical | Bugs, crashes, security | Must fix |
| 🟠 Major | Performance, maintainability | Should fix |
| 🟡 Minor | Style, naming, comments | Nice to fix |
| 🟢 Nitpick | Personal preference | Optional |
