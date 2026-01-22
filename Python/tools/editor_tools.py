"""
Editor Tools for UnrealCompanion.
General editor utilities: undo, redo, play control, console commands.

Naming convention: editor_* (except play and console)

Security levels for console commands:
- HIGH: quit, exit, open (close editor, change level) - never whitelistable
- MEDIUM: slomo, killall, destroyall (gameplay changes) - whitelistable after first approval
- BLOCKED: rm, del, shutdown - always rejected
"""

import logging
from typing import Dict, Any
from mcp.server.fastmcp import FastMCP, Context

logger = logging.getLogger("UnrealCompanion")


def register_editor_tools(mcp: FastMCP):
    """Register general editor utility tools with the MCP server."""

    from utils.helpers import send_command

    # ===========================================
    # UNDO / REDO
    # ===========================================

    @mcp.tool()
    def editor_undo(
        ctx: Context,
        steps: int = 1
    ) -> Dict[str, Any]:
        """
        Undo the last action(s) in the editor.
        
        Args:
            steps: Number of actions to undo (default: 1)
            
        Returns:
            Response indicating success with undone count
        """
        return send_command("editor_undo", {"steps": steps})

    @mcp.tool()
    def editor_redo(
        ctx: Context,
        steps: int = 1
    ) -> Dict[str, Any]:
        """
        Redo the last undone action(s) in the editor.
        
        Args:
            steps: Number of actions to redo (default: 1)
            
        Returns:
            Response indicating success with redone count
        """
        return send_command("editor_redo", {"steps": steps})

    # ===========================================
    # PLAY IN EDITOR (PIE) CONTROL
    # ===========================================

    @mcp.tool()
    def play(
        ctx: Context,
        action: str = "start",
        mode: str = "PIE"
    ) -> Dict[str, Any]:
        """
        Control Play In Editor (PIE) for testing.
        
        Args:
            action: "start", "stop", "pause", "resume", or "is_playing"
            mode: For start action: "PIE" (default), "simulate"
            
        Actions:
            - start: Start playing the game
            - stop: Stop the game
            - pause: Pause the game
            - resume: Resume the game
            - is_playing: Check if game is running (returns is_playing, is_paused)
            
        Returns:
            Success status and play state info
            
        Examples:
            play(action="start")              # Start PIE
            play(action="start", mode="simulate")  # Start simulation
            play(action="stop")               # Stop game
            play(action="is_playing")         # Check status
        """
        return send_command("editor_play", {"action": action, "mode": mode})

    # ===========================================
    # CONSOLE COMMANDS
    # ===========================================

    from utils.security import request_confirmation, validate_confirmation, is_whitelisted

    # HIGH risk commands - never whitelistable (can close editor/lose work)
    HIGH_RISK_COMMANDS = [
        'quit', 'exit', 'open ', 'servertravel',
        'ce ', 'exec ', 'run ', 'py ', 'python '
    ]
    
    # MEDIUM risk commands - whitelistable after first approval (gameplay changes)
    MEDIUM_RISK_COMMANDS = [
        'restartlevel', 'disconnect', 'reconnect', 
        'killall', 'destroyall', 'slomo '
    ]
    
    # Commands that are completely blocked
    BLOCKED_COMMANDS = [
        'rm ', 'del ', 'delete ', 'format ', 'shutdown',
        'restart', 'reboot'
    ]

    @mcp.tool()
    def console(
        ctx: Context,
        action: str = "execute",
        command: str = "",
        category: str = "",
        level: str = "All",
        limit: int = 100,
        confirmation_token: str = "",
        whitelist_for_session: bool = False
    ) -> Dict[str, Any]:
        """
        Execute console commands or get logs.
        
        ⚠️ CAUTION: Some commands can affect editor state or close the application.
        
        Risk Levels:
        - SAFE: stat, show, r., t. commands - no confirmation needed
        - MEDIUM: slomo, killall, destroyall - confirmation once, then can whitelist
        - HIGH: quit, exit, open - always requires confirmation (never whitelistable)
        - BLOCKED: rm, del, shutdown - always rejected
        
        For MEDIUM risk commands:
        - First time: requires confirmation_token
        - With whitelist_for_session=True: skips future confirmations this session
        
        Args:
            action: "execute", "get_log", or "clear_log"
            command: For "execute" - console command to run
            category: For "get_log" - filter by log category
            level: For "get_log" - "All", "Warning", "Error"
            limit: For "get_log" - max number of lines
            confirmation_token: For risky commands - token from first call
            whitelist_for_session: For MEDIUM risk - skip future confirmations
            
        Safe Commands (no confirmation needed):
            - stat fps: Show FPS counter
            - stat unit: Show detailed frame stats
            - show collision: Toggle collision visualization
            - r.ScreenPercentage 50: Resolution scale
            - t.MaxFPS 60: Cap FPS
            
        MEDIUM Risk (whitelistable):
            - slomo 0.5: Change game speed
            - killall [class]: Remove actors
            
        HIGH Risk (never whitelistable):
            - quit: Closes the editor
            - open [map]: Changes level (may lose unsaved work)
            
        Returns:
            Command output or log entries
        """
        if action == "execute" and command:
            cmd_lower = command.lower().strip()
            
            # Block dangerous system commands - NEVER allowed
            for blocked in BLOCKED_COMMANDS:
                if cmd_lower.startswith(blocked):
                    return {
                        "success": False, 
                        "error": f"BLOCKED: Command '{blocked.strip()}' is not allowed for security reasons.",
                        "blocked": True
                    }
            
            # Check risk level
            risk_level = None
            allow_whitelist = False
            
            for high_cmd in HIGH_RISK_COMMANDS:
                if cmd_lower.startswith(high_cmd):
                    risk_level = "HIGH"
                    allow_whitelist = False
                    break
            
            if not risk_level:
                for med_cmd in MEDIUM_RISK_COMMANDS:
                    if cmd_lower.startswith(med_cmd):
                        risk_level = "MEDIUM"
                        allow_whitelist = True
                        break
            
            if risk_level:
                operation_key = cmd_lower.split()[0]  # Use command prefix as key
                
                # For MEDIUM, check if whitelisted
                if risk_level == "MEDIUM" and is_whitelisted("console", operation_key):
                    logger.info(f"Console command whitelisted, executing: {command}")
                    # Fall through to execute
                elif not confirmation_token:
                    # Request confirmation
                    result = request_confirmation(
                        tool_name="console",
                        risk_level=risk_level,
                        operation_data={"command": command},
                        operation_key=operation_key,
                        description=f"Command '{command}' requires user confirmation.",
                        effect="May affect editor state, gameplay, or close application.",
                        allow_whitelist=allow_whitelist
                    )
                    return result
                else:
                    # Validate token
                    validation = validate_confirmation(
                        confirmation_token=confirmation_token,
                        tool_name="console",
                        operation_data={"command": command},
                        operation_key=operation_key,
                        whitelist_for_session=whitelist_for_session and allow_whitelist
                    )
                    
                    if not validation.get("valid"):
                        return validation
                    
                    logger.info(f"Executing confirmed console command: {command}")
        
        return send_command("editor_console", {
            "action": action,
            "command": command,
            "category": category,
            "level": level,
            "limit": limit
        })

    @mcp.tool()
    def plugin_execute_command(
        ctx: Context,
        command: str,
        args: str = ""
    ) -> Dict[str, Any]:
        """
        Execute a console command from a plugin.
        Uses GEditor->Exec() for better plugin command compatibility.
        
        ⚠️ CAUTION: Plugin commands may have significant effects.
        Always explain to the user what the command does before executing.
        
        Args:
            command: The plugin command to execute (e.g., "BlueprintAssist.FormatNodes")
            args: Optional additional arguments to append to the command
            
        Returns:
            Success status and execution info
            
        Safe Examples:
            # Blueprint Assist plugin (if installed)
            plugin_execute_command(command="BlueprintAssist.FormatNodes")
            
        Potentially Slow Commands (warn user):
            # Building lighting can take minutes
            plugin_execute_command(command="BUILDLIGHTING")
            
        Note:
            Not all plugins expose console commands. Check the plugin documentation
            or use the console "help" command to list available commands.
        """
        # Block obviously dangerous patterns
        cmd_lower = command.lower()
        for blocked in BLOCKED_COMMANDS:
            if blocked in cmd_lower:
                return {
                    "success": False,
                    "error": f"BLOCKED: Command pattern '{blocked.strip()}' is not allowed.",
                    "blocked": True
                }
        
        return send_command("editor_console", {
            "action": "plugin",
            "command": command,
            "args": args
        })

    # ===========================================
    # FOCUS MANAGEMENT
    # ===========================================
    # The focus system tracks which asset/graph you're working on.
    # When you switch to a different asset, the previous one is auto-saved and closed.
    # This provides a smooth "follow along" experience in the editor.

    @mcp.tool()
    def editor_focus_close(
        ctx: Context
    ) -> Dict[str, Any]:
        """
        Close the currently focused asset (save first).
        
        Use this when you're done working on an asset and want to clean up.
        The asset is saved before closing.
        
        Note: This is called automatically when you switch to a different asset.
        You only need to call it explicitly when you're completely done.
        
        Returns:
            Success status and name of closed asset
        """
        return send_command("editor_focus_close", {})

    @mcp.tool()
    def editor_focus_level(
        ctx: Context
    ) -> Dict[str, Any]:
        """
        Focus on the Level Editor / Viewport.
        
        Closes any currently open asset editor (saves first) and switches
        focus to the main level editor viewport.
        
        Use this when switching from asset editing to level manipulation.
        
        Returns:
            Success status and previous/current focus info
        """
        return send_command("editor_focus_level", {})

    # ===========================================
    # SECURITY MANAGEMENT
    # ===========================================

    from utils.security import get_whitelist_status, clear_whitelist

    @mcp.tool()
    def security_whitelist_status(
        ctx: Context
    ) -> Dict[str, Any]:
        """
        Get the current security whitelist status.
        
        Shows which MEDIUM/LOW risk operations have been whitelisted
        for this session (skipping future confirmations).
        
        Returns:
            Whitelist status with count and operation list
        """
        status = get_whitelist_status()
        return {
            "success": True,
            "whitelisted_operations": status["whitelisted_count"],
            "operations": status["operations"],
            "note": "CRITICAL and HIGH risk operations are never whitelisted."
        }

    @mcp.tool()
    def security_clear_whitelist(
        ctx: Context
    ) -> Dict[str, Any]:
        """
        Clear all whitelisted operations.
        
        After clearing, all MEDIUM/LOW risk operations will require
        confirmation again.
        
        Use this if you want to reset security confirmations.
        
        Returns:
            Success status
        """
        clear_whitelist()
        return {
            "success": True,
            "message": "Session whitelist cleared. All operations now require confirmation."
        }

    logger.info("Editor tools registered successfully (9 tools)")
