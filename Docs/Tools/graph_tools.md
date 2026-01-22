# Graph Tools

Tools for manipulating Unreal Engine graphs (Blueprint, Material, Widget, Animation, etc.).

Uses the generic `UEdGraphNode` API which is common to all graph types.

## Available Tools (9)

| Tool | Description |
|------|-------------|
| `graph_batch` | Unified graph manipulation: nodes, pins, connections (batch) |
| `graph_node_create` | Create a single node |
| `graph_node_delete` | Delete one or more nodes |
| `graph_node_find` | Find nodes in a graph |
| `graph_node_info` | Get detailed info about a node |
| `graph_pin_connect` | Connect two pins |
| `graph_pin_disconnect` | Disconnect pins |
| `graph_pin_set_value` | Set a pin's default value |
| `graph_node_search_available` | Search available node types (Blueprint) |

### When to use which tool?

- **`graph_batch`** - For complex operations with multiple nodes/connections in one call
- **`graph_node_*`** / **`graph_pin_*`** - For simple single operations (less overhead)

---

## graph_batch

**The primary tool for graph manipulation.** Manages nodes, pins, and connections in a single call. **Auto-compiles by default.**

Works with any graph that uses `UEdGraphNode`:
- Blueprint EventGraph, Function graphs
- Material Editor graphs  
- Widget Blueprint graphs
- Animation Blueprint graphs
- Niagara graphs
- And more...

```python
graph_batch(
    blueprint_name: str,
    
    # Node operations
    nodes: List[Dict] = None,              # Nodes to create
    remove: List[str] = None,              # Node IDs to remove
    break_links: List[str] = None,         # Node IDs to disconnect all links
    enable_nodes: List[str] = None,        # Node IDs to enable
    disable_nodes: List[str] = None,       # Node IDs to disable
    reconstruct_nodes: List[str] = None,   # Node IDs to reconstruct (refresh pins)
    
    # Pin operations  
    split_pins: List[Dict] = None,         # Split struct pins (Vector → X,Y,Z)
    recombine_pins: List[Dict] = None,     # Recombine split pins
    break_pin_links: List[Dict] = None,    # Break specific pin connections
    
    # Connection operations
    pin_values: List[Dict] = None,         # Pin values to set
    connections: List[Dict] = None,        # Connections to make
    
    # Options
    graph_name: str = None,                # Target graph (default: EventGraph)
    on_error: str = "rollback",
    dry_run: bool = False,
    verbosity: str = "normal",
    auto_arrange: bool = False,
    auto_arrange_mode: str = "layered",    # Layout: "layered", "straight", "compact"
    auto_compile: bool = True,             # Compile after changes (default: true)
    focus_editor: bool = True              # Auto-open Blueprint in editor (default: true)
)
```

### Execution Order

Operations execute in this order:
1. **Remove nodes** (`remove`)
2. **Break node links** (`break_links`)
3. **Enable/Disable nodes** (`enable_nodes`, `disable_nodes`)
4. **Reconstruct nodes** (`reconstruct_nodes`)
5. **Split pins** (`split_pins`)
6. **Recombine pins** (`recombine_pins`)
7. **Break pin links** (`break_pin_links`)
8. **Create nodes** (`nodes`)
9. **Make connections** (`connections`)
10. **Set pin values** (`pin_values`)
11. **Compile** (if auto_compile enabled)

### Editor Focus Tracking

When `focus_editor=True` (default):
- **Opens the Blueprint** in the editor
- **Navigates to the modified graph** (EventGraph, function, etc.)
- **Stays open** if errors occur (for inspection)
- **Auto-closes previous asset** when switching to a different Blueprint

This provides visual feedback of what the agent is doing in real-time.

To disable: `focus_editor=False`

### Response Fields

| Field | Description |
|-------|-------------|
| `success` | Overall success (no failures) |
| `compiled` | True if Blueprint was compiled |
| `editor_focused` | True if editor was opened/focused |
| `nodes_removed` | Number of nodes successfully removed |
| `nodes_created` | Number of nodes successfully created |
| `links_broken` | Number of nodes with all links broken |
| `nodes_enabled` | Number of nodes enabled |
| `nodes_disabled` | Number of nodes disabled |
| `nodes_reconstructed` | Number of nodes reconstructed |
| `pins_split` | Number of pins split |
| `pins_recombined` | Number of pins recombined |
| `pin_links_broken` | Number of pin links broken |
| `connections_made` | Number of connections made |
| `pin_values_set` | Number of pin values set |
| `ref_to_id` | Mapping of symbolic refs to actual node GUIDs |

---

## Node Operations

### Creating Nodes

```python
{
    "ref": "begin",           # Symbolic reference (for connections)
    "type": "event",          # Node type (see below)
    "position": [0, 0],       # Optional [X, Y] position
    # Type-specific parameters...
}
```

### Node Types (Blueprint)

#### Events & Flow Control

| Type | Parameters | Description |
|------|------------|-------------|
| `event` | event_name | Standard events (ReceiveBeginPlay, ReceiveTick) |
| `input_action` | action_name | Input action events |
| `custom_event` | event_name | Custom events |
| `branch` | - | If/Then/Else |
| `sequence` | num_outputs | Execute multiple outputs in order |
| `for_each` | - | ForEach loop |
| `return` | - | Return node |

#### Functions & Variables

| Type | Parameters | Description |
|------|------------|-------------|
| `function_call` | function_name, target | Function calls |
| `interface_message` | function_name, interface | Send message to any object (runtime check, no cast needed) |
| `interface_call` | function_name, interface | Direct interface call (requires prior cast to interface) |
| `get_variable` | variable_name | Get variable node |
| `set_variable` | variable_name | Set variable node |
| `get_self` | - | Self reference |
| `get_component` | component_name | Component reference |

#### Type Operations

| Type | Parameters | Description |
|------|------------|-------------|
| `cast` | target_class | Cast To (e.g., "Actor", "Pawn") |
| `select` | - | Select value based on index |
| `make_array` | num_inputs | Create an array |
| `make_struct` | struct_type | Create a struct (e.g., "Vector") |
| `break_struct` | struct_type | Break struct into components |

#### Switch Nodes

| Type | Parameters | Description |
|------|------------|-------------|
| `switch_int` | - | Switch on Integer |
| `switch_string` | - | Switch on String |
| `switch_enum` | enum_type | Switch on Enum |

#### Object Creation

| Type | Parameters | Description |
|------|------------|-------------|
| `spawn_actor` | - | Spawn Actor from Class |
| `construct_object` | - | Construct Object from Class |
| `add_component` | component_class, component_name | Add Component to Actor |

#### Macros & Advanced

| Type | Parameters | Description |
|------|------------|-------------|
| `macro` | macro_name | Call a macro |
| `array_function` | function_name | Array operations (Get, Set, Add, Remove, Find, etc.) |
| `get_class_defaults` | class_name | Get class default values |
| `format_text` | - | Format Text node |

#### Utility

| Type | Parameters | Description |
|------|------------|-------------|
| `timeline` | timeline_name | Create a Timeline |
| `reroute` | - | Reroute/Knot node |
| `create_delegate` | - | Create a delegate |
| `comment` | text | Comment box |

### Removing Nodes

```python
remove=["B971F6FA4A44F3E10B05358F314901A6", "85765E321542A413EEB2B2AED106F7B1"]
```

### Breaking All Links on a Node

```python
break_links=["node_guid_here"]  # Breaks all connections to/from this node
```

### Enable/Disable Nodes

```python
# Disable nodes (they won't compile)
disable_nodes=["node_guid_1", "node_guid_2"]

# Re-enable nodes
enable_nodes=["node_guid_1"]
```

### Reconstruct Nodes

Refresh a node's pins (useful after struct changes):

```python
reconstruct_nodes=["node_guid_here"]
```

---

## Pin Operations

### Split Struct Pins

Expand a struct pin (like Vector) into its component sub-pins (X, Y, Z):

```python
split_pins=[
    {"node_id": "NODE_GUID", "pin": "Location"}
]
# After: Location pin becomes Location_X, Location_Y, Location_Z
```

### Recombine Split Pins

Collapse sub-pins back into the original struct pin:

```python
recombine_pins=[
    {"node_id": "NODE_GUID", "pin": "Location_X"}  # Any sub-pin works
]
# After: Restores the original Location struct pin
```

### Break Pin Links

Break specific connections or all connections on a pin:

```python
# Break ALL links on a pin
break_pin_links=[
    {"node_id": "NODE_GUID", "pin": "ReturnValue"}
]

# Break a SPECIFIC link between two pins
break_pin_links=[
    {
        "node_id": "SOURCE_GUID",
        "pin": "ReturnValue",
        "target_node_id": "TARGET_GUID",
        "target_pin": "InputValue"
    }
]
```

---

## Connection Operations

### Setting Pin Values

```python
pin_values=[
    {"ref": "print", "pin": "InString", "value": "Hello!"},
    # OR use node_id for existing nodes
    {"node_id": "GUID...", "pin": "Damage", "value": "50.0"}
]
```

### Making Connections

```python
connections=[
    {
        "source_ref": "begin",    # Or "source_id": "GUID..."
        "source_pin": "Then",
        "target_ref": "print",    # Or "target_id": "GUID..."
        "target_pin": "execute"
    }
]
```

---

## Complete Examples

### Hello World

```python
graph_batch(
    blueprint_name="BP_HelloWorld",
    nodes=[
        {"ref": "begin", "type": "event", "event_name": "ReceiveBeginPlay"},
        {"ref": "print", "type": "function_call", "function_name": "PrintString"}
    ],
    pin_values=[
        {"ref": "print", "pin": "InString", "value": "Hello World!"}
    ],
    connections=[
        {"source_ref": "begin", "source_pin": "Then", "target_ref": "print", "target_pin": "execute"}
    ]
)
```

### Replace Nodes

```python
graph_batch(
    blueprint_name="BP_Player",
    remove=["old_node_guid_here"],
    nodes=[
        {"ref": "new_begin", "type": "event", "event_name": "ReceiveBeginPlay"},
        {"ref": "new_print", "type": "function_call", "function_name": "PrintString"}
    ],
    connections=[
        {"source_ref": "new_begin", "source_pin": "Then", "target_ref": "new_print", "target_pin": "execute"}
    ]
)
```

### Rewire Connections

```python
graph_batch(
    blueprint_name="BP_Player",
    break_pin_links=[
        {"node_id": "NODE_GUID", "pin": "Then"}
    ],
    connections=[
        {"source_id": "NODE_GUID", "source_pin": "Then", "target_id": "NEW_TARGET_GUID", "target_pin": "execute"}
    ]
)
```

### Debug: Temporarily Disable Nodes

```python
# Disable some nodes for debugging
graph_batch(
    blueprint_name="BP_Player",
    disable_nodes=["debug_node_1", "debug_node_2"]
)

# Later: re-enable them
graph_batch(
    blueprint_name="BP_Player", 
    enable_nodes=["debug_node_1", "debug_node_2"]
)
```

### Auto-Arrange Modes

When `auto_arrange=True`, nodes are automatically positioned based on the selected mode:

| Mode | Description |
|------|-------------|
| `layered` | Default. Traditional vertical layout with layers per execution flow. Event nodes at top, subsequent nodes below. |
| `straight` | All execution nodes on the same Y line (horizontal timeline). Good for simple linear flows. |
| `compact` | Minimize vertical space with tighter stacking. Good for complex graphs with many parallel paths. |

```python
# Auto-arrange with straight layout (horizontal timeline)
graph_batch(
    blueprint_name="BP_Player",
    nodes=[...],
    connections=[...],
    auto_arrange=True,
    auto_arrange_mode="straight"
)
```

---

## graph_node_find

**Enhanced node discovery with powerful filtering.** Find existing nodes before creating duplicates, or check node properties like `is_pure`.

```python
graph_node_find(
    asset_name: str,
    node_type: str = None,           # "event", "function_call", "get_variable", "set_variable", etc.
    class_name: str = None,          # Filter by class name (partial match)
    variable_name: str = None,       # Filter by variable name
    event_name: str = None,          # Filter by event name
    function_name: str = None,       # Filter by function name
    only_unconnected: bool = False,  # Only nodes with no connections
    only_pure: bool = False,         # Only pure nodes (no exec pins)
    only_impure: bool = False,       # Only impure nodes (has exec pins)
    graph_name: str = None
)
```

### Response Fields (per node)

| Field | Description |
|-------|-------------|
| `node_id` | Node GUID |
| `title` | Display title |
| `class` | Node class name |
| `is_pure` | True if node has no exec pins |
| `has_exec_pins` | True if node has exec pins |
| `has_connections` | True if any pin is connected |
| `total_connections` | Total number of connections |
| `variable_name` | For variable get/set nodes |
| `event_name` | For event nodes |
| `function_name` | For function call nodes |
| `function_class` | Class owning the function |
| `is_static` | If function is static |
| `is_const` | If function is const |

### Use Cases

**1. Avoid duplicate nodes:**
```python
# Check if Set InitialLocation exists before creating
existing = graph_node_find("BP_Player", 
    node_type="set_variable", 
    variable_name="InitialLocation")

if existing["count"] == 0:
    # Create the node
    graph_batch(blueprint_name="BP_Player", nodes=[...])
```

**2. Find unconnected nodes to reuse:**
```python
# Find orphan Set Variable nodes
graph_node_find("BP_Player", 
    node_type="set_variable", 
    only_unconnected=True)
```

**3. Check if a function is pure before connecting exec pins:**
```python
# Pure functions (like GetActorLocation) have NO exec pins
result = graph_node_find("BP_Player", 
    node_type="function_call",
    function_name="K2_GetActorLocation")

if result["nodes"][0]["is_pure"]:
    # Don't try to connect exec pins - they don't exist!
    # Only connect data pins
```

**4. Find all events in a Blueprint:**
```python
graph_node_find("BP_Player", node_type="event")
```

---

## node_search_available

Search for **available** node types/functions to discover what CAN be added. Returns `is_pure` to help plan connections.

```python
node_search_available(
    search_term: str = None,   # Search in function names
    class_name: str = None,    # Filter by class
    max_results: int = 50
)
```

### Response Fields (per function)

| Field | Description |
|-------|-------------|
| `function_name` | Function name to use in `function_call` |
| `class_name` | Class owning the function |
| `is_pure` | **True = no exec pins** (only data in/out) |
| `is_const` | Function is const |
| `is_static` | Function is static |
| `category` | Blueprint category |
| `inputs` | Array of input parameters |
| `outputs` | Array of output parameters |

### Understanding Pure vs Impure Functions

| Type | Exec Pins | When to Use |
|------|-----------|-------------|
| **Pure** (`is_pure: true`) | None | Getters, math, no side effects. Connect data pins only. |
| **Impure** (`is_pure: false`) | Has `execute` input and `then` output | Actions, setters, side effects. Connect exec AND data pins. |

**Examples:**
```python
# Find GetActorLocation - it's PURE (no exec pins)
graph_node_search_available(search_term="GetActorLocation")
# Result: is_pure: true

# Find SetActorLocation - it's IMPURE (has exec pins)
graph_node_search_available(search_term="SetActorLocation")  
# Result: is_pure: false
```

**Correct connection patterns:**
```python
# PURE function (GetActorLocation) - data pins only
connections=[
    {"source_ref": "getloc", "source_pin": "ReturnValue", 
     "target_ref": "setloc", "target_pin": "NewLocation"}
]

# IMPURE function (SetActorLocation) - exec AND data pins
connections=[
    {"source_ref": "tick", "source_pin": "then", 
     "target_ref": "setloc", "target_pin": "execute"},  # Exec flow
    {"source_ref": "getloc", "source_pin": "ReturnValue", 
     "target_ref": "setloc", "target_pin": "NewLocation"}  # Data
]
```

---

## Architecture Notes

### Generic Graph Support

The `graph_batch` tool uses `UEdGraphNode` API which is common to ALL Unreal graph types:

| Graph Type | Asset Type | Notes |
|------------|------------|-------|
| Blueprint EventGraph | UBlueprint | Current main support |
| Blueprint Function | UBlueprint | Via `graph_name` parameter |
| Material Editor | UMaterial | Future support |
| Widget Blueprint | UWidgetBlueprint | Future support |
| Animation Blueprint | UAnimBlueprint | Future support |
| Niagara | UNiagaraScript | Future support |

### Key UEdGraphNode Functions Used

| Function | Purpose |
|----------|---------|
| `DestroyNode()` | Delete a node |
| `BreakAllNodeLinks()` | Break all connections |
| `SetEnabledState()` | Enable/disable node |
| `ReconstructNode()` | Refresh pins |
| `FindPin()` | Find a pin by name |
| `CanUserDeleteNode()` | Check if deletable |

### Key UEdGraphSchema_K2 Functions Used

| Function | Purpose |
|----------|---------|
| `SplitPin()` | Split struct pin |
| `RecombinePin()` | Recombine split pin |
| `CanSplitStructPin()` | Check if splittable |
| `CanRecombineStructPin()` | Check if recombinable |
