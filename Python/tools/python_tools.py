"""
Python Tools for UnrealCompanion.
Python code execution within the Unreal Engine context.

Naming convention: python_*

IMPORTANT: Use python_execute sparingly! Always prefer dedicated tools when available.

Security: python_execute and python_execute_file are CRITICAL risk - always require token.
"""

import logging
from typing import Dict, Any
from mcp.server.fastmcp import FastMCP, Context

logger = logging.getLogger("UnrealCompanion")


def register_python_tools(mcp: FastMCP):
    """Register Python execution tools with the MCP server."""

    from utils.helpers import send_command
    from utils.security import request_confirmation, validate_confirmation

    @mcp.tool()
    def python_execute(
        ctx: Context,
        code: str,
        confirmation_token: str = "",
        timeout: int = 30
    ) -> Dict[str, Any]:
        """
        ⚠️ DANGEROUS TOOL - REQUIRES USER CONFIRMATION ⚠️
        
        Risk Level: CRITICAL (never bypassable)
        Can execute arbitrary Python code with full system access.
        
        TWO-STEP CONFIRMATION REQUIRED:
        1. First call WITHOUT token → Returns a unique confirmation_token
        2. Show code to user, get explicit approval
        3. Second call WITH the exact token → Executes code
        
        The token expires after 60 seconds and is single-use.
        You CANNOT bypass this by inventing a token.
        
        NEVER use this tool for:
        - File system operations outside the project (os.remove, shutil.rmtree)
        - Network operations (requests, urllib)
        - System commands (os.system, subprocess)
        - Reading sensitive files (/etc/passwd, credentials, etc.)
        
        PREFER dedicated tools when available:
        - Use blueprint_* tools instead of unreal.BlueprintEditorLibrary
        - Use world_* tools instead of unreal.EditorLevelLibrary
        - Use asset_* tools instead of unreal.AssetToolsHelpers
        
        Args:
            code: Python code to execute. Can be multi-line.
            confirmation_token: Token from first call. Required for execution.
            timeout: Timeout in seconds (default: 30)
            
        Returns:
            Response containing execution result or error
        """
        operation_key = code  # Use code as the operation key
        
        if not confirmation_token:
            # Step 1: Request confirmation
            result = request_confirmation(
                tool_name="python_execute",
                risk_level="CRITICAL",
                operation_data={"code": code, "timeout": timeout},
                operation_key=operation_key,
                description="User confirmation required to execute Python code.",
                effect="Can execute any Python code with full system access. Cannot be whitelisted.",
                allow_whitelist=False  # CRITICAL = never whitelistable
            )
            result["code_preview"] = code[:500] + ("..." if len(code) > 500 else "")
            return result
        
        # Step 2: Validate token
        validation = validate_confirmation(
            confirmation_token=confirmation_token,
            tool_name="python_execute",
            operation_data={"code": code, "timeout": timeout},
            operation_key=operation_key
        )
        
        if not validation.get("valid"):
            return validation
        
        # Token valid - execute
        logger.info("Executing confirmed Python code")
        return send_command("python_execute", {
            "code": code,
            "timeout": timeout
        })

    @mcp.tool()
    def python_execute_file(
        ctx: Context,
        file_path: str,
        confirmation_token: str = ""
    ) -> Dict[str, Any]:
        """
        ⚠️ DANGEROUS TOOL - REQUIRES USER CONFIRMATION ⚠️
        
        Risk Level: CRITICAL (never bypassable)
        Executes a Python file with full system access.
        
        TWO-STEP CONFIRMATION REQUIRED:
        1. First call WITHOUT token → Returns a unique confirmation_token
        2. Read the file, show contents to user, get explicit approval
        3. Second call WITH the exact token → Executes file
        
        The token expires after 60 seconds and is single-use.
        
        SECURITY RESTRICTIONS:
        - File must be within the project directory or /Game/
        - File must have .py extension
        - Absolute paths outside project are blocked
        
        Args:
            file_path: Path to the Python file to execute (must be in project)
            confirmation_token: Token from first call. Required for execution.
            
        Returns:
            Response containing execution result or error
        """
        # Security: Validate file path first (before token check)
        if '..' in file_path:
            return {"success": False, "error": "Path traversal not allowed (contains '..')", "blocked": True}
        
        if not file_path.endswith('.py'):
            return {"success": False, "error": "Only .py files can be executed", "blocked": True}
        
        # Block absolute paths that look suspicious
        suspicious_paths = ['/etc/', '/usr/', '/bin/', '/var/', '/tmp/', 'C:\\Windows', 'C:\\Program']
        for suspicious in suspicious_paths:
            if suspicious.lower() in file_path.lower():
                return {"success": False, "error": f"Blocked: Cannot execute files from {suspicious}", "blocked": True}
        
        operation_key = file_path
        
        if not confirmation_token:
            # Step 1: Request confirmation
            result = request_confirmation(
                tool_name="python_execute_file",
                risk_level="CRITICAL",
                operation_data={"file_path": file_path},
                operation_key=operation_key,
                description="User confirmation required to execute Python file.",
                effect="Can execute any Python file with full system access. Cannot be whitelisted.",
                allow_whitelist=False  # CRITICAL = never whitelistable
            )
            result["file_path"] = file_path
            return result
        
        # Step 2: Validate token
        validation = validate_confirmation(
            confirmation_token=confirmation_token,
            tool_name="python_execute_file",
            operation_data={"file_path": file_path},
            operation_key=operation_key
        )
        
        if not validation.get("valid"):
            return validation
        
        # Token valid - execute
        logger.info(f"Executing confirmed Python file: {file_path}")
        return send_command("python_execute_file", {
            "file_path": file_path
        })

    @mcp.tool()
    def python_list_modules(
        ctx: Context,
        search_term: str = None
    ) -> Dict[str, Any]:
        """
        List available Python modules in the Unreal environment.
        
        Args:
            search_term: Optional filter for module names
            
        Returns:
            Response containing list of available modules
        """
        params = {}
        if search_term:
            params["search_term"] = search_term
        return send_command("python_list_modules", params)

    logger.info("Python tools registered successfully (3 tools)")
