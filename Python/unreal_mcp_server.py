"""
Unreal Companion - MCP Server

A Model Context Protocol server for controlling Unreal Engine via AI.
"""

import logging
import socket
import sys
import json
from contextlib import asynccontextmanager
from typing import AsyncIterator, Dict, Any, Optional
from mcp.server.fastmcp import FastMCP

# Configure logging with more detailed format
# Note: Use stderr for terminal output (stdout is used by MCP for JSON communication)
import os
from pathlib import Path
from logging.handlers import RotatingFileHandler

# Log file in a known location
LOG_DIR = Path.home() / ".unreal_mcp"
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / "unreal_mcp.log"

log_formatter = logging.Formatter(
    '%(asctime)s | %(levelname)-8s | %(message)s',
    datefmt='%H:%M:%S'
)

# File handler - rotating logs (max 5MB per file, keep 3 backups)
file_handler = RotatingFileHandler(
    str(LOG_FILE),
    maxBytes=5 * 1024 * 1024,  # 5 MB
    backupCount=3,             # Keep .log, .log.1, .log.2, .log.3
    encoding='utf-8'
)
file_handler.setLevel(logging.DEBUG)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'
))

# Console handler - uses stderr (not stdout!) to avoid interfering with MCP JSON
console_handler = logging.StreamHandler(sys.stderr)
console_handler.setLevel(logging.INFO)  # Less verbose for terminal
console_handler.setFormatter(log_formatter)

# Configure root logger
logging.basicConfig(
    level=logging.DEBUG,
    handlers=[file_handler, console_handler]
)
logger = logging.getLogger("UnrealCompanion")

# Configuration
UNREAL_HOST = "127.0.0.1"
UNREAL_PORT = 55557

class UnrealConnection:
    """Connection to an Unreal Engine instance."""
    
    def __init__(self):
        """Initialize the connection."""
        self.socket = None
        self.connected = False
    
    def connect(self) -> bool:
        """Connect to the Unreal Engine instance."""
        try:
            # Close any existing socket
            if self.socket:
                try:
                    self.socket.close()
                except:
                    pass
                self.socket = None
            
            logger.info(f"Connecting to Unreal at {UNREAL_HOST}:{UNREAL_PORT}...")
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.settimeout(5)  # 5 second timeout
            
            # Set socket options for better stability
            self.socket.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
            
            # Set larger buffer sizes
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 65536)
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 65536)
            
            self.socket.connect((UNREAL_HOST, UNREAL_PORT))
            self.connected = True
            logger.info("Connected to Unreal Engine")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to Unreal: {e}")
            self.connected = False
            return False
    
    def disconnect(self):
        """Disconnect from the Unreal Engine instance."""
        if self.socket:
            try:
                self.socket.close()
            except:
                pass
        self.socket = None
        self.connected = False

    def receive_full_response(self, sock, buffer_size=4096) -> bytes:
        """Receive a complete response from Unreal, handling chunked data."""
        chunks = []
        sock.settimeout(5)  # 5 second timeout
        try:
            while True:
                chunk = sock.recv(buffer_size)
                if not chunk:
                    if not chunks:
                        raise Exception("Connection closed before receiving data")
                    break
                chunks.append(chunk)
                
                # Process the data received so far
                data = b''.join(chunks)
                decoded_data = data.decode('utf-8')
                
                # Try to parse as JSON to check if complete
                try:
                    json.loads(decoded_data)
                    logger.info(f"Received complete response ({len(data)} bytes)")
                    return data
                except json.JSONDecodeError:
                    # Not complete JSON yet, continue reading
                    logger.debug(f"Received partial response, waiting for more data...")
                    continue
                except Exception as e:
                    logger.warning(f"Error processing response chunk: {str(e)}")
                    continue
        except socket.timeout:
            logger.warning("Socket timeout during receive")
            if chunks:
                # If we have some data already, try to use it
                data = b''.join(chunks)
                try:
                    json.loads(data.decode('utf-8'))
                    logger.info(f"Using partial response after timeout ({len(data)} bytes)")
                    return data
                except:
                    pass
            raise Exception("Timeout receiving Unreal response")
        except Exception as e:
            logger.error(f"Error during receive: {str(e)}")
            raise
    
    def send_command(self, command: str, params: Dict[str, Any] = None) -> Optional[Dict[str, Any]]:
        """Send a command to Unreal Engine and get the response."""
        # Always reconnect for each command, since Unreal closes the connection after each command
        # This is different from Unity which keeps connections alive
        if self.socket:
            try:
                self.socket.close()
            except:
                pass
            self.socket = None
            self.connected = False
        
        if not self.connect():
            logger.error("Failed to connect to Unreal Engine for command")
            return None
        
        try:
            # Match Unity's command format exactly
            command_obj = {
                "type": command,  # Use "type" instead of "command"
                "params": params or {}  # Use Unity's params or {} pattern
            }
            
            # Send without newline, exactly like Unity
            command_json = json.dumps(command_obj)
            logger.info(f"Sending command: {command_json}")
            self.socket.sendall(command_json.encode('utf-8'))
            
            # Read response using improved handler
            response_data = self.receive_full_response(self.socket)
            response = json.loads(response_data.decode('utf-8'))
            
            # Log complete response for debugging
            logger.info(f"Complete response from Unreal: {response}")
            
            # Check for both error formats: {"status": "error", ...} and {"success": false, ...}
            if response.get("status") == "error":
                error_message = response.get("error") or response.get("message", "Unknown Unreal error")
                logger.error(f"Unreal error (status=error): {error_message}")
                # We want to preserve the original error structure but ensure error is accessible
                if "error" not in response:
                    response["error"] = error_message
            elif response.get("success") is False:
                # This format uses {"success": false, "error": "message"} or {"success": false, "message": "message"}
                error_message = response.get("error") or response.get("message", "Unknown Unreal error")
                logger.error(f"Unreal error (success=false): {error_message}")
                # Convert to the standard format expected by higher layers
                response = {
                    "status": "error",
                    "error": error_message
                }
            
            # Always close the connection after command is complete
            # since Unreal will close it on its side anyway
            try:
                self.socket.close()
            except:
                pass
            self.socket = None
            self.connected = False
            
            return response
            
        except Exception as e:
            logger.error(f"Error sending command: {e}")
            # Always reset connection state on any error
            self.connected = False
            try:
                self.socket.close()
            except:
                pass
            self.socket = None
            return {
                "status": "error",
                "error": str(e)
            }

# Global connection state
_unreal_connection: UnrealConnection = None

def get_unreal_connection() -> Optional[UnrealConnection]:
    """Get the connection to Unreal Engine."""
    global _unreal_connection
    try:
        if _unreal_connection is None:
            _unreal_connection = UnrealConnection()
            if not _unreal_connection.connect():
                logger.warning("Could not connect to Unreal Engine")
                _unreal_connection = None
        else:
            # Verify connection is still valid with a ping-like test
            try:
                # Simple test by sending an empty buffer to check if socket is still connected
                _unreal_connection.socket.sendall(b'\x00')
                logger.debug("Connection verified with ping test")
            except Exception as e:
                logger.warning(f"Existing connection failed: {e}")
                _unreal_connection.disconnect()
                _unreal_connection = None
                # Try to reconnect
                _unreal_connection = UnrealConnection()
                if not _unreal_connection.connect():
                    logger.warning("Could not reconnect to Unreal Engine")
                    _unreal_connection = None
                else:
                    logger.info("Successfully reconnected to Unreal Engine")
        
        return _unreal_connection
    except Exception as e:
        logger.error(f"Error getting Unreal connection: {e}")
        return None

@asynccontextmanager
async def server_lifespan(server: FastMCP) -> AsyncIterator[Dict[str, Any]]:
    """Handle server startup and shutdown."""
    global _unreal_connection
    logger.info("UnrealCompanion server starting up")
    try:
        _unreal_connection = get_unreal_connection()
        if _unreal_connection:
            logger.info("Connected to Unreal Engine on startup")
        else:
            logger.warning("Could not connect to Unreal Engine on startup")
    except Exception as e:
        logger.error(f"Error connecting to Unreal Engine on startup: {e}")
        _unreal_connection = None
    
    try:
        yield {}
    finally:
        if _unreal_connection:
            _unreal_connection.disconnect()
            _unreal_connection = None
        logger.info("Unreal MCP server shut down")

# Initialize server
mcp = FastMCP(
    "UnrealCompanion",
    description="Unreal Engine integration via Model Context Protocol",
    lifespan=server_lifespan
)

# Auto-discover and register all tools from tools/ directory
# Each *_tools.py module is automatically found and its register_*_tools(mcp) function called
# To add new tools: create category_tools.py with register_category_tools(mcp) function
from tools import register_all_tools

# Register all discovered tools
num_modules = register_all_tools(mcp)
logger.info(f"Auto-discovered and registered {num_modules} tool modules")  

@mcp.prompt()
def info():
    """How to use Unreal Companion tools effectively."""
    return """
# Unreal Companion - Tool Guide

## CRITICAL: Use the RIGHT tool

### To SEARCH or FIND anything → `core_query`
```python
core_query(type="asset", action="list", path="/Game/Blueprints")           # List assets
core_query(type="asset", action="find", pattern="BP_Enemy*")              # Find by name
core_query(type="asset", action="exists", path="/Game/BP_Player")         # Check existence
core_query(type="actor", action="list")                                    # List actors in level
core_query(type="actor", action="find", pattern="Light*")                 # Find actors
core_query(type="actor", action="find", tag="Enemy")                      # Find by tag
core_query(type="actor", action="find", center=[0,0,0], radius=1000)     # Find in radius
core_query(type="node", action="list", blueprint_name="BP_Player")        # List nodes
core_query(type="folder", action="exists", path="/Game/Maps")             # Check folder
```

### To GET INFO about anything → `core_get_info`
```python
core_get_info(type="blueprint", path="/Game/BP_Player")                    # Blueprint info
core_get_info(type="asset", path="/Game/Meshes/SM_Rock")                   # Asset info
core_get_info(type="actor", actor_name="PlayerStart")                      # Actor properties
core_get_info(type="material", path="/Game/Materials/M_Base")              # Material info
```

### To SAVE anything → `core_save`
```python
core_save(scope="all")                                                      # Save everything
core_save(scope="level")                                                    # Save current level
core_save(scope="dirty")                                                    # Save modified only
core_save(scope="asset", path="/Game/BP_Player")                           # Save one asset
```

## Main Workflow Tools

### Blueprint Creation
```python
blueprint_create(name="BP_Player", parent_class="Character")
blueprint_create_interface(name="BPI_Damageable", functions=[...])
blueprint_variable_batch(blueprint_name, operations=[
    {"action": "add", "name": "Health", "type": "Float", "default_value": 100}
])
blueprint_component_batch(blueprint_name, components=[
    {"ref": "mesh", "class": "StaticMeshComponent"}
])
blueprint_function_batch(blueprint_name, operations=[
    {"action": "add", "name": "TakeDamage", "inputs": [{"name": "Amount", "type": "Float"}]}
])
blueprint_add_event_dispatcher(blueprint_name, dispatcher_name="OnDeath")
blueprint_implement_interface(blueprint_name, interface_name="BPI_Damageable")
```

### Adding Logic (Nodes) → ALWAYS use `graph_batch`
```python
graph_batch(
    blueprint_name="BP_Player",
    nodes=[
        {"ref": "begin", "type": "event", "event_name": "ReceiveBeginPlay"},
        {"ref": "print", "type": "function_call", "function_name": "PrintString"}
    ],
    pin_values=[{"ref": "print", "pin": "InString", "value": "Hello!"}],
    connections=[
        {"source_ref": "begin", "source_pin": "Then",
         "target_ref": "print", "target_pin": "execute"}
    ]
)
```
Node types: event, custom_event, function_call, branch, sequence, for_each,
get_variable, set_variable, cast, spawn_actor, timeline, make_struct,
break_struct, select, switch_int, switch_enum, interface_call, macro, comment, reroute

### Widget UI → use `widget_batch`
```python
widget_create(name="WBP_HUD", path="/Game/UI")
widget_batch(widget_name="WBP_HUD", widgets=[
    {"ref": "box", "type": "VerticalBox", "slot": {"position": [20, 20]}},
    # Built-in widget
    {"ref": "text", "type": "TextBlock", "parent_ref": "box",
     "properties": {"text": "Score: 0", "font_size": 24}},
    # Custom User Widget (just use its name!)
    {"ref": "bar", "type": "WBP_ProgressBar", "name": "HealthBar",
     "parent_ref": "box", "is_variable": True,
     "properties": {"DefaultPercent": 1.0, "BarColor": [0, 1, 0, 1]}}
])
widget_get_info(widget_name="WBP_HUD", include_tree=True)
```

### Actors in Level
```python
world_spawn_batch(actors=[
    {"ref": "p1", "blueprint": "BP_Player", "name": "Player1", "location": [0, 0, 100]}
])
world_set_batch(actors=[
    {"name": "Player1", "location": [500, 0, 100], "properties": {"Health": 50}}
])
world_delete_batch(actors=["TempActor1", "DebugMarker"])
world_select_actors(actor_names=["Player1"])
world_get_selected_actors()
world_duplicate_actor(actor_name="Enemy1", new_location=[1000, 0, 100])
```

### Enhanced Input (UE5)
```python
project_create_input_action(action_name="IA_Fire", value_type="Digital")
project_add_to_mapping_context(
    context_path="/Game/Input/IMC_Default",
    action_path="/Game/Input/Actions/IA_Fire",
    key="LeftMouseButton"
)
```

### Landscape & Foliage Tools (6)
```python
landscape_create(size_x=8, size_y=8, section_size=127, scale=[100, 100, 200])
landscape_sculpt(actor_name="Landscape", operations=[
    {"type": "canyon", "center": [0,0], "direction": [0,1], "depth": 0.8, "width": 3000, "radius": 15000, "roughness": 0.5},
    {"type": "noise", "center": [0,0], "radius": 20000, "frequency": 0.003, "amplitude": 0.4, "octaves": 4},
    {"type": "crater", "center": [2000, 3000], "radius": 1500, "depth": 0.6, "rim_height": 0.2}
])
landscape_import_heightmap(actor_name="Landscape", heightmap_path="/tmp/heightmap.png", scale_z=1.5)
foliage_add_type(mesh="/Game/Meshes/SM_Rock", scale_min=0.3, scale_max=2.5, align_to_normal=True)
foliage_scatter(mesh="/Game/Meshes/SM_Rock", center=[0,0,0], radius=15000, count=200, scale_range=[0.5, 2.0], min_distance=100)
foliage_remove(center=[0,0,0], radius=3000, mesh="/Game/Meshes/SM_Rock")
```

### Other Tools
```python
# Graph inspection (use graph_batch for creating/connecting/deleting nodes)
graph_node_find(asset_name="BP_Player", node_type="event")
graph_node_info(asset_name="BP_Player", node_id="GUID")
graph_node_search_available(search_term="Print")

# Assets
asset_create_folder(path="/Game/Blueprints/Characters")
asset_modify_batch(operations=[{"action": "rename", "path": "...", "new_name": "..."}])
asset_delete_batch(assets=["/Game/Old/BP_Unused"])
asset_import(source_path="/tmp/model.fbx", destination="/Game/Meshes/")

# Materials
material_create(name="M_Base")
material_create_instance(name="MI_Red", parent_material="/Game/M_Base")
material_set_parameter(material_path, parameter_name, value, parameter_type)

# Lights
light_spawn(light_type="point", location=[0, 0, 200], intensity=5000)

# Level
level_create(name="TestLevel")
level_open(level_path="/Game/Maps/TestLevel")
level_get_info()

# Editor
play(action="start")  # or "stop", "pause", "resume"
console(action="execute", command="stat fps")
editor_undo(steps=1)
viewport_screenshot()
viewport_focus(target="PlayerStart")

# Blueprint config
blueprint_compile(blueprint_name="BP_Player")
blueprint_set_property(blueprint_name, property_name, property_value)
blueprint_set_parent_class(blueprint_name, parent_class)
blueprint_list_parent_classes(search_term="Actor")

# Python (requires confirmation token)
python_execute(code="print('hello')")

# Landscape & Foliage (terrain level design)
landscape_create(size_x=8, size_y=8, scale=[100, 100, 200])
landscape_sculpt(actor_name="Landscape", operations=[{"type": "canyon", "center": [0,0], "direction": [0,1], "depth": 0.8, "width": 3000, "radius": 15000}])
landscape_import_heightmap(actor_name="Landscape", heightmap_path="/tmp/h.png")
landscape_paint_layer(actor_name="Landscape", layer_name="Rock", position=[0,0], radius=3000)
foliage_scatter(mesh="/Game/SM_Rock", center=[0,0,0], radius=10000, count=200)
foliage_add_type(mesh="/Game/SM_Rock", scale_min=0.5, scale_max=2.0)
foliage_remove(center=[0,0,0], radius=3000)

# Geometry (procedural shapes via Geometry Script)
geometry_create(type="box", name="Wall", location=[0,0,150], width=1000, height=300, depth=50)
geometry_boolean(target_actor="Terrain", tool_actor="Hole", operation="subtract")

# Splines (paths and mesh scattering)
spline_create(name="Path", points=[[0,0,0],[2000,1000,0],[4000,500,0]])
spline_scatter_meshes(spline_actor="Path", mesh="/Game/SM_FencePost", spacing=200)

# Environment (atmosphere, fog, time of day)
environment_configure(action="setup_atmosphere")
environment_configure(action="set_time_of_day", time=18.5, sun_color=[1,0.6,0.3])
environment_configure(action="set_fog", density=0.05, volumetric=True)

# 3D Generation (requires MESHY_API_KEY)
meshy_text_to_3d_preview(prompt="A fantasy dragon")
```

## Tool count: 84 tools total

## Rules
1. Check existence before creating: core_query(type="asset", action="exists")
2. One batch call > multiple individual calls
3. Auto-compile is ON - no need for blueprint_compile() after batch ops
4. Always core_save(scope="all") at the end
5. Use dry_run=True to validate complex operations first
6. For nodes: ALWAYS use graph_batch() - it handles create, connect, set values, delete in one call
7. For widgets: ALWAYS use widget_batch() - it handles add, modify, remove in one call
    """

# Web UI Server launcher
def start_web_ui_server():
    """Start the Web UI server as a subprocess."""
    import subprocess
    import atexit
    
    web_ui_dir = Path(__file__).parent.parent / "web-ui" / "server"
    
    if not web_ui_dir.exists():
        logger.warning(f"Web UI server not found at {web_ui_dir}")
        return None
    
    # Check for virtual environment
    venv_python = web_ui_dir / ".venv" / "bin" / "python"
    if not venv_python.exists():
        # Try Windows path
        venv_python = web_ui_dir / ".venv" / "Scripts" / "python.exe"
    
    if not venv_python.exists():
        logger.warning("Web UI virtual environment not found. Run: cd web-ui && ./start.sh")
        return None
    
    try:
        # Start the web UI server
        process = subprocess.Popen(
            [str(venv_python), "main.py"],
            cwd=str(web_ui_dir),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE
        )
        
        # Register cleanup
        def cleanup_web_ui():
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
        
        atexit.register(cleanup_web_ui)
        
        logger.info(f"Web UI server started (PID: {process.pid})")
        logger.info(f"  Web UI: http://localhost:3179")
        logger.info(f"  (or http://unreal-companion.local:3179 if configured in /etc/hosts)")
        return process
        
    except Exception as e:
        logger.error(f"Failed to start Web UI server: {e}")
        return None


# Run the server
if __name__ == "__main__":
    # Startup banner
    logger.info("=" * 60)
    logger.info("Unreal Companion Server Starting")
    logger.info(f"  Unreal Engine: {UNREAL_HOST}:{UNREAL_PORT}")
    logger.info(f"  Log file: {LOG_FILE}")
    logger.info("=" * 60)
    
    # Start Web UI server (optional - runs alongside MCP)
    web_ui_enabled = os.environ.get("UNREAL_COMPANION_WEB_UI", "true").lower() == "true"
    if web_ui_enabled:
        web_ui_process = start_web_ui_server()
    
    logger.info("Waiting for MCP client connection...")
    mcp.run(transport='stdio')