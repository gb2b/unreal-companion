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
    """Information about available Unreal MCP tools and best practices."""
    return """
    # Unreal MCP Server Tools
    
    All tools follow the naming convention: category_action (e.g., asset_list, blueprint_create)
    
    ## Asset Tools (asset_*)
    - `asset_create_folder(path)` - Create folders in Content Browser
    - `asset_list(path, asset_class, max_results, recursive)` - List assets
    - `asset_find(name, asset_class)` - Find assets by name
    - `asset_exists(path)` - Check if asset exists
    - `asset_folder_exists(path)` - Check if folder exists
    - `asset_get_info(path)` - Get detailed asset information
    - `asset_get_bounds(path)` - Get mesh bounds (for placement)
    - `asset_delete(path, force)` - Delete an asset
    - `asset_rename(path, new_name)` - Rename an asset
    - `asset_move(path, destination)` - Move asset to folder
    - `asset_duplicate(path, new_name, destination)` - Duplicate asset
    - `asset_save(path)` - Save specific asset
    - `asset_save_all()` - Save all modified assets
    
    ## Blueprint Tools (blueprint_*)
    - `blueprint_create(name, parent_class, path)` - Create Blueprint
    - `blueprint_compile(blueprint_name)` - Compile Blueprint
    - `blueprint_get_info(blueprint_name, info_type)` - Get Blueprint info
    - `blueprint_get_compilation_messages(blueprint_name)` - Get compile errors
    - `blueprint_set_parent_class(blueprint_name, parent_class)` - Change parent
    - `blueprint_set_property(blueprint_name, property_name, value)` - Set property
    - `blueprint_add_variable(blueprint_name, variable_name, type, sub_type)` - Add variable
    - `blueprint_remove_variable(blueprint_name, variable_name)` - Remove variable
    - `blueprint_set_variable_default(blueprint_name, variable_name, value)` - Set default
    - `blueprint_add_function(blueprint_name, function_name, inputs, outputs)` - Add function
    - `blueprint_remove_function(blueprint_name, function_name)` - Remove function
    - `blueprint_add_local_variable(blueprint_name, function_name, var_name, type)` - Add local var
    - `blueprint_add_event_dispatcher(blueprint_name, dispatcher_name)` - Add dispatcher
    - `blueprint_add_custom_event(blueprint_name, event_name)` - Add custom event
    - `blueprint_implement_interface(blueprint_name, interface_name)` - Implement interface
    - `blueprint_add_component(blueprint_name, component_class, name)` - Add component
    - `blueprint_remove_component(blueprint_name, component_name)` - Remove component
    - `blueprint_set_component_property(blueprint_name, component, prop, value)` - Set prop
    - `blueprint_set_static_mesh(blueprint_name, component, mesh)` - Set mesh
    - `blueprint_set_physics(blueprint_name, component, simulate, gravity, mass)` - Set physics
    - `blueprint_list_parent_classes(search_term, category)` - List parent classes
    
    ## Node Tools (node_*)
    - `graph_node_search_available(search_term, class_name)` - Search available nodes
    - `node_find(blueprint_name, node_type, event_type)` - Find nodes in graph
    - `node_get_info(blueprint_name, node_id, graph_name)` - Get node details
    - `node_get_graph_nodes(blueprint_name, graph_name)` - List all nodes
    - `node_add_event(blueprint_name, event_name, position)` - Add event node
    - `node_add_input_action(blueprint_name, action_name)` - Add input action
    - `node_add_function_call(blueprint_name, target, function_name, graph_name)` - Add function
    - `node_add_get_variable(blueprint_name, variable_name, graph_name)` - Add get node
    - `node_add_set_variable(blueprint_name, variable_name, graph_name)` - Add set node
    - `node_add_get_self(blueprint_name)` - Add self reference
    - `node_add_get_component(blueprint_name, component_name)` - Add component ref
    - `node_add_branch(blueprint_name, graph_name)` - Add branch node
    - `node_add_for_each(blueprint_name, graph_name)` - Add foreach node
    - `node_add_return(blueprint_name, graph_name)` - Add return node
    - `node_connect(blueprint_name, source_id, source_pin, target_id, target_pin)` - Connect
    - `node_set_pin_value(blueprint_name, node_id, pin_name, value)` - Set pin value
    - `node_auto_arrange(blueprint_name, graph_name)` - Auto-arrange nodes
    
    ## Widget Tools (widget_*)
    - `widget_create(name, path, parent_class)` - Create Widget Blueprint
    - `widget_get_info(widget_path)` - Get widget info
    - `widget_add_text_block(widget_name, name, text, position, size)` - Add text
    - `widget_add_button(widget_name, name, text, position, size)` - Add button
    - `widget_bind_event(widget_name, component, event, function)` - Bind event
    - `widget_add_to_viewport(widget_name, z_order)` - Add to viewport
    - `widget_set_text_binding(widget_name, text_block, property, type)` - Bind text
    
    ## Material Tools (material_*)
    - `material_create(name, path)` - Create Material
    - `material_create_instance(name, parent_material, path)` - Create instance
    - `material_get_info(material_path)` - Get material info
    - `material_set_parameter(material_path, param_name, value, type)` - Set parameter
    
    ## World Tools (world_*)
    - `world_get_actors()` - Get all actors in level
    - `world_find_actors_by_name(pattern)` - Find by name
    - `world_find_actors_by_tag(tag)` - Find by tag
    - `world_find_actors_in_radius(center, radius, class_filter)` - Find in radius
    - `world_get_actor_properties(name)` - Get actor properties
    - `world_spawn_actor(name, actor_type, location, rotation)` - Spawn actor
    - `world_spawn_blueprint_actor(blueprint_name, actor_name, location)` - Spawn BP
    - `world_delete_actor(name)` - Delete actor
    - `world_set_actor_transform(name, location, rotation, scale)` - Set transform
    - `world_set_actor_property(name, property, value)` - Set property
    - `world_duplicate_actor(actor_name, new_location, new_name)` - Duplicate
    - `world_select_actors(actor_names, add_to_selection)` - Select actors
    - `world_get_selected_actors()` - Get selection
    
    ## Level Tools (level_*)
    - `level_get_info()` - Get current level info
    - `level_open(level_path)` - Open level
    - `level_create(name, path, template)` - Create level
    - `level_save()` - Save current level
    - `level_get_streaming_levels()` - Get streaming levels
    - `level_load_streaming(level_name, make_visible)` - Load streaming level
    - `level_unload_streaming(level_name)` - Unload streaming level
    - `level_set_streaming_visibility(level_name, visible)` - Set visibility
    
    ## Light Tools (light_*)
    - `light_spawn(light_type, location, intensity, color, name)` - Spawn light
    - `light_set_property(actor_name, property_name, value)` - Set light property
    - `light_build(quality)` - Build lighting
    
    ## Viewport Tools (viewport_*)
    - `viewport_get_camera()` - Get camera transform
    - `viewport_set_camera(location, rotation)` - Set camera
    - `viewport_focus_on_actor(actor_name)` - Focus on actor
    - `viewport_screenshot(width, height, filename)` - Take screenshot
    - `viewport_trace_from_screen(screen_x, screen_y)` - Trace from screen
    
    ## Editor Tools (editor_*)
    - `editor_undo(steps)` - Undo actions
    - `editor_redo(steps)` - Redo actions
    - `editor_save_all()` - Save all
    
    ## Python Tools (python_*)
    - `python_execute(code, timeout)` - Execute Python code (use sparingly!)
    - `python_execute_file(file_path)` - Execute Python file
    - `python_list_modules(search_term)` - List available modules
    
    ## Project Tools (project_*)
    - `project_create_input_mapping(action_name, key, input_type)` - Create input
    
    ## Meshy 3D Generation Tools (meshy_*)
    - `meshy_text_to_3d_preview(prompt, art_style, ai_model)` - Generate 3D from text
    - `meshy_text_to_3d_refine(preview_task_id, texture_prompt)` - Add textures
    - `meshy_get_task(task_id)` - Check generation status
    - `meshy_list_tasks(limit)` - List recent generations
    - `meshy_download_model(task_id, format, save_path)` - Download GLB/FBX/OBJ
    - `meshy_delete_task(task_id)` - Delete a task
    - `meshy_rig_character(model_url, input_task_id)` - Auto-rig humanoid/quadruped
    - `meshy_get_rig_task(task_id)` - Check rigging status
    - `meshy_animate_character(rig_task_id, animation_type)` - Apply animation
    - `meshy_get_animation_task(task_id)` - Check animation status
    - `meshy_list_animations()` - List 500+ available animations
    
    Note: Meshy tools require MESHY_API_KEY environment variable.
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