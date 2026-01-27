---
name: mcp-graph-tools
description: |
  MCP tools for Blueprint graph manipulation - nodes, connections, and pin values.
  Use when you need to add logic to Blueprints.
---

# MCP Graph Tools

## When to Use

- Adding nodes to Blueprint graphs
- Connecting nodes together
- Setting pin values
- Building Blueprint logic

## Tools

### graph_batch

The primary tool for all graph operations. Handles nodes, connections, and pin values in a single call.

**Parameters:**
- `blueprint_name`: Blueprint path
- `graph_name`: Graph name (default: "EventGraph")
- `nodes`: List of nodes to create
- `connections`: List of connections to make
- `pin_values`: Dict of pin values to set
- `auto_arrange`: Auto-arrange nodes
- `auto_compile`: Compile after changes (default: true)

**Execution Order:**
1. remove → break_links → enable/disable → reconstruct
2. split_pins → recombine_pins → break_pin_links
3. **create nodes** → **connections** → **pin_values**
4. compile

### Node Definition

```python
{
    "ref": "unique_ref",           # Required: Reference for connections
    "type": "NodeClassName",       # Required: Node type
    "position": [x, y],            # Optional: Position
    "properties": {}               # Optional: Node properties
}
```

### Connection Definition

```python
{
    "source_ref": "node_a",        # Source node ref
    "source_pin": "ReturnValue",   # Source pin name
    "target_ref": "node_b",        # Target node ref
    "target_pin": "Value"          # Target pin name
}
```

## Common Nodes

### Events

```python
# BeginPlay
{"ref": "begin", "type": "K2Node_Event", "properties": {"EventReference": "ReceiveBeginPlay"}}

# Tick
{"ref": "tick", "type": "K2Node_Event", "properties": {"EventReference": "ReceiveTick"}}

# Custom Event
{"ref": "custom", "type": "K2Node_CustomEvent", "properties": {"CustomFunctionName": "MyEvent"}}
```

### Functions

```python
# Print String
{"ref": "print", "type": "K2Node_CallFunction", "properties": {"FunctionReference": "PrintString"}}

# Delay
{"ref": "delay", "type": "K2Node_Delay"}

# Set Timer
{"ref": "timer", "type": "K2Node_CallFunction", "properties": {"FunctionReference": "SetTimerByFunctionName"}}
```

### Variables

```python
# Get Variable
{"ref": "get_health", "type": "K2Node_VariableGet", "properties": {"VariableReference": "Health"}}

# Set Variable
{"ref": "set_health", "type": "K2Node_VariableSet", "properties": {"VariableReference": "Health"}}
```

### Flow Control

```python
# Branch (If)
{"ref": "branch", "type": "K2Node_IfThenElse"}

# Sequence
{"ref": "seq", "type": "K2Node_ExecutionSequence"}

# For Each Loop
{"ref": "foreach", "type": "K2Node_ForEachLoop"}
```

### Math

```python
# Add
{"ref": "add", "type": "K2Node_CommutativeAssociativeBinaryOperator", "properties": {"FunctionReference": "Add_FloatFloat"}}

# Multiply
{"ref": "mult", "type": "K2Node_CommutativeAssociativeBinaryOperator", "properties": {"FunctionReference": "Multiply_FloatFloat"}}

# Compare
{"ref": "compare", "type": "K2Node_CallFunction", "properties": {"FunctionReference": "Less_FloatFloat"}}
```

## Complete Example

```python
# Add damage system to BP_Enemy
graph_batch(
    blueprint_name="/Game/Blueprints/BP_Enemy",
    graph_name="EventGraph",
    nodes=[
        # Custom event for taking damage
        {"ref": "damage_event", "type": "K2Node_CustomEvent", 
         "properties": {"CustomFunctionName": "ApplyDamage"}},
        
        # Get current health
        {"ref": "get_health", "type": "K2Node_VariableGet", 
         "properties": {"VariableReference": "Health"}},
        
        # Subtract damage
        {"ref": "subtract", "type": "K2Node_CallFunction", 
         "properties": {"FunctionReference": "Subtract_FloatFloat"}},
        
        # Set new health
        {"ref": "set_health", "type": "K2Node_VariableSet", 
         "properties": {"VariableReference": "Health"}},
        
        # Check if dead
        {"ref": "branch", "type": "K2Node_IfThenElse"},
        
        # Less than or equal to zero
        {"ref": "check_dead", "type": "K2Node_CallFunction", 
         "properties": {"FunctionReference": "LessEqual_FloatFloat"}},
        
        # Destroy actor if dead
        {"ref": "destroy", "type": "K2Node_CallFunction", 
         "properties": {"FunctionReference": "DestroyActor"}}
    ],
    connections=[
        # Event -> Get Health
        {"source_ref": "damage_event", "source_pin": "then", 
         "target_ref": "get_health", "target_pin": "execute"},
        
        # Health - Damage -> Set Health
        {"source_ref": "get_health", "source_pin": "Health", 
         "target_ref": "subtract", "target_pin": "A"},
        {"source_ref": "damage_event", "source_pin": "DamageAmount", 
         "target_ref": "subtract", "target_pin": "B"},
        {"source_ref": "subtract", "source_pin": "ReturnValue", 
         "target_ref": "set_health", "target_pin": "Health"},
        
        # Execution flow
        {"source_ref": "set_health", "source_pin": "then", 
         "target_ref": "check_dead", "target_pin": "execute"},
        {"source_ref": "set_health", "source_pin": "Health", 
         "target_ref": "check_dead", "target_pin": "A"},
        
        # Branch on death check
        {"source_ref": "check_dead", "source_pin": "then", 
         "target_ref": "branch", "target_pin": "execute"},
        {"source_ref": "check_dead", "source_pin": "ReturnValue", 
         "target_ref": "branch", "target_pin": "Condition"},
        
        # Destroy if dead
        {"source_ref": "branch", "source_pin": "True", 
         "target_ref": "destroy", "target_pin": "execute"}
    ],
    pin_values={
        "check_dead.B": 0.0  # Compare health to 0
    },
    auto_arrange=True
)
```

## Pin Names

Pin names are **case-sensitive**. Use `graph_node_info` to verify exact names.

Common pins:
- `execute` / `then` - Execution pins
- `ReturnValue` - Function return
- `Condition` - Branch condition
- `True` / `False` - Branch outputs

## Tips

1. **Use refs** - Always assign unique refs to nodes for connections
2. **Check pin names** - Use `graph_node_info()` to verify exact pin names
3. **Auto-arrange** - Set `auto_arrange=True` for cleaner graphs
4. **Batch operations** - Do everything in one `graph_batch` call when possible
