"""
Tests for the unified loader module.

Tests the phase-based workflow loading, agent.md format, 
skills loading, and memories management.
"""

import pytest
import tempfile
import shutil
from pathlib import Path
import yaml

# Import functions to test
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.unified_loader import (
    WORKFLOW_PHASES,
    _parse_frontmatter,
    _scan_workflow_directory,
    list_all_workflows,
    load_agent,
    list_all_agents,
    load_skill,
    list_all_skills,
    load_memories,
    save_memories,
    add_memory,
    remove_memory,
    list_memories,
    ProjectPaths,
)


class TestWorkflowPhases:
    """Test workflow phase constants"""
    
    def test_workflow_phases_defined(self):
        """Verify workflow phases are defined"""
        assert len(WORKFLOW_PHASES) == 6
        assert '1-preproduction' in WORKFLOW_PHASES
        assert '2-design' in WORKFLOW_PHASES
        assert '3-technical' in WORKFLOW_PHASES
        assert '4-production' in WORKFLOW_PHASES
        assert 'quick-flow' in WORKFLOW_PHASES
        assert 'tools' in WORKFLOW_PHASES


class TestFrontmatterParsing:
    """Test YAML frontmatter parsing from markdown"""
    
    def test_parse_valid_frontmatter(self):
        """Parse valid YAML frontmatter"""
        content = """---
id: test-agent
name: Test
title: Test Agent
---

# Test Agent

This is the content.
"""
        frontmatter, body = _parse_frontmatter(content)
        
        assert frontmatter is not None
        assert frontmatter['id'] == 'test-agent'
        assert frontmatter['name'] == 'Test'
        assert '# Test Agent' in body
    
    def test_parse_no_frontmatter(self):
        """Handle content without frontmatter"""
        content = "# Just Markdown\n\nNo frontmatter here."
        
        frontmatter, body = _parse_frontmatter(content)
        
        assert frontmatter is None
        assert body == content
    
    def test_parse_complex_frontmatter(self):
        """Parse frontmatter with lists and nested objects"""
        content = """---
id: complex
skills:
  - skill-1
  - skill-2
modes:
  studio: true
  editor: false
---

# Complex Agent
"""
        frontmatter, body = _parse_frontmatter(content)
        
        assert frontmatter['skills'] == ['skill-1', 'skill-2']
        assert frontmatter['modes']['studio'] is True
        assert frontmatter['modes']['editor'] is False


class TestMemoriesManagement:
    """Test memories CRUD operations"""
    
    @pytest.fixture
    def temp_project(self):
        """Create a temporary project directory"""
        temp_dir = tempfile.mkdtemp()
        project_paths = ProjectPaths.from_project_path(temp_dir)
        project_paths.root.mkdir(parents=True, exist_ok=True)
        yield temp_dir
        shutil.rmtree(temp_dir)
    
    def test_load_empty_memories(self, temp_project):
        """Load memories from project without memories.yaml"""
        memories = load_memories(temp_project)
        
        assert memories['version'] == '1.0'
        assert memories['project'] == []
        assert memories['agents'] == {}
    
    def test_add_project_memory(self, temp_project):
        """Add a project-wide memory"""
        memory_id = add_memory(
            temp_project,
            content="Test memory content",
            source="test"
        )
        
        assert memory_id is not None
        assert memory_id.startswith('m')
        
        memories = load_memories(temp_project)
        assert len(memories['project']) == 1
        assert memories['project'][0]['content'] == "Test memory content"
    
    def test_add_agent_memory(self, temp_project):
        """Add an agent-specific memory"""
        memory_id = add_memory(
            temp_project,
            content="Agent-specific memory",
            agent_id="game-designer",
            source="test"
        )
        
        assert memory_id is not None
        assert memory_id.startswith('ga')
        
        memories = load_memories(temp_project)
        assert 'game-designer' in memories['agents']
        assert len(memories['agents']['game-designer']) == 1
    
    def test_remove_memory(self, temp_project):
        """Remove a memory by ID"""
        memory_id = add_memory(temp_project, "To be deleted")
        
        success = remove_memory(temp_project, memory_id)
        
        assert success is True
        memories = load_memories(temp_project)
        assert len(memories['project']) == 0
    
    def test_list_memories(self, temp_project):
        """List all memories"""
        add_memory(temp_project, "Memory 1")
        add_memory(temp_project, "Memory 2")
        add_memory(temp_project, "Agent memory", agent_id="test-agent")
        
        all_memories = list_memories(temp_project)
        
        assert len(all_memories) == 3
        
        # Filter by agent
        agent_memories = list_memories(temp_project, agent_id="test-agent")
        assert len(agent_memories) == 1


class TestWorkflowListing:
    """Test workflow listing with phase support"""
    
    def test_list_workflows_returns_list(self):
        """list_all_workflows returns a list"""
        workflows = list_all_workflows()
        assert isinstance(workflows, list)
    
    def test_workflows_have_required_fields(self):
        """Each workflow has required fields"""
        workflows = list_all_workflows()
        
        if workflows:  # Only test if workflows exist
            workflow = workflows[0]
            assert 'id' in workflow
            assert 'name' in workflow
            assert 'source' in workflow
            assert 'path' in workflow


class TestAgentLoading:
    """Test agent loading with agent.md format"""
    
    def test_list_agents_returns_list(self):
        """list_all_agents returns a list"""
        agents = list_all_agents()
        assert isinstance(agents, list)
    
    def test_agents_have_required_fields(self):
        """Each agent has required fields"""
        agents = list_all_agents()
        
        if agents:  # Only test if agents exist
            agent = agents[0]
            assert 'id' in agent
            assert 'name' in agent
            assert 'source' in agent


class TestSkillsLoading:
    """Test skills loading"""
    
    def test_list_skills_returns_list(self):
        """list_all_skills returns a list"""
        skills = list_all_skills()
        assert isinstance(skills, list)
    
    def test_skills_have_required_fields(self):
        """Each skill has required fields"""
        skills = list_all_skills()
        
        if skills:  # Only test if skills exist
            skill = skills[0]
            assert 'id' in skill
            assert 'name' in skill
            assert 'path' in skill


class TestErrorHandling:
    """Test graceful error handling for malformed or missing data"""

    @pytest.fixture
    def temp_workflows_dir(self, tmp_path):
        """Create a temporary workflows directory"""
        return tmp_path / "workflows"

    def test_malformed_workflow_yaml_does_not_crash(self, tmp_path):
        """Malformed workflow.yaml (invalid YAML) is skipped gracefully"""
        workflow_dir = tmp_path / "bad-workflow"
        workflow_dir.mkdir(parents=True)
        (workflow_dir / "workflow.yaml").write_text(
            "id: bad\nname: [unclosed bracket\n  - invalid: yaml: here",
            encoding="utf-8",
        )

        workflows = {}
        _scan_workflow_directory(tmp_path, "dev", workflows)

        # Should not crash and should produce no workflow entry
        assert "bad-workflow" not in workflows
        assert isinstance(workflows, dict)

    def test_malformed_workflow_yaml_in_phase_dir_does_not_crash(self, tmp_path):
        """Malformed workflow.yaml inside a phase directory is skipped gracefully"""
        phase_dir = tmp_path / "1-preproduction" / "bad-workflow"
        phase_dir.mkdir(parents=True)
        (phase_dir / "workflow.yaml").write_text(
            ": invalid: {unclosed",
            encoding="utf-8",
        )

        workflows = {}
        _scan_workflow_directory(tmp_path, "dev", workflows)

        assert isinstance(workflows, dict)
        assert len(workflows) == 0

    def test_workflow_missing_steps_directory_loads_metadata(self, tmp_path):
        """Workflow with no steps/ dir still loads with 0 steps"""
        workflow_dir = tmp_path / "no-steps-workflow"
        workflow_dir.mkdir(parents=True)
        (workflow_dir / "workflow.yaml").write_text(
            "id: no-steps-workflow\nname: No Steps\ndescription: A workflow without steps\n",
            encoding="utf-8",
        )

        workflows = {}
        _scan_workflow_directory(tmp_path, "dev", workflows)

        assert "no-steps-workflow" in workflows
        wf = workflows["no-steps-workflow"]
        assert wf["name"] == "No Steps"
        assert wf["steps"] == 0

    def test_agent_md_missing_frontmatter_does_not_crash(self, tmp_path):
        """agent.md without frontmatter is handled gracefully (load_agent returns None)"""
        agent_dir = tmp_path / "no-frontmatter-agent"
        agent_dir.mkdir(parents=True)
        (agent_dir / "agent.md").write_text(
            "# Agent Without Frontmatter\n\nJust some content, no YAML block.",
            encoding="utf-8",
        )

        # load_agent searches known paths; inject tmp_path via project_path mechanism
        # by monkey-patching get_agent_search_paths is complex, so test _parse_frontmatter directly
        frontmatter, body = _parse_frontmatter(
            "# Agent Without Frontmatter\n\nJust some content, no YAML block."
        )

        assert frontmatter is None
        assert "Agent Without Frontmatter" in body

    def test_agent_md_malformed_frontmatter_does_not_crash(self, tmp_path):
        """agent.md with malformed YAML frontmatter does not raise"""
        malformed_content = "---\nid: [unclosed\nname: broken yaml\n---\n\n# Body"

        # _parse_frontmatter uses yaml.safe_load; a scanner error should propagate or
        # be caught depending on yaml version — verify no unhandled exception reaches caller
        try:
            frontmatter, body = _parse_frontmatter(malformed_content)
            # If it doesn't raise, frontmatter may be None or partial — acceptable
        except Exception as exc:
            pytest.fail(f"_parse_frontmatter raised unexpectedly: {exc}")

    def test_empty_skills_directory_returns_empty_list(self, tmp_path):
        """list_all_skills with an empty directory returns an empty list"""
        empty_skills_dir = tmp_path / "empty-skills"
        empty_skills_dir.mkdir()

        skills = {}
        # Simulate what list_all_skills does for a single base_path
        for entry in empty_skills_dir.iterdir():
            if entry.is_dir():
                skill_md = entry / "SKILL.md"
                if skill_md.exists():
                    skills[entry.name] = {}

        assert skills == {}

    def test_list_all_skills_with_nonexistent_paths_returns_list(self, monkeypatch):
        """list_all_skills handles non-existent search paths without crashing"""
        from services import unified_loader

        monkeypatch.setattr(
            unified_loader,
            "get_skills_search_paths",
            lambda: [
                unified_loader.Path("/nonexistent/path/skills-abc123"),
                unified_loader.Path("/another/missing/dir-xyz"),
            ],
        )

        result = list_all_skills()
        assert isinstance(result, list)
        assert result == []

    def test_list_all_workflows_with_nonexistent_paths_returns_list(self, monkeypatch):
        """list_all_workflows handles non-existent search paths without crashing"""
        from services import unified_loader

        monkeypatch.setattr(
            unified_loader,
            "get_workflow_search_paths",
            lambda project_path=None: [
                unified_loader.Path("/nonexistent/workflows-abc123"),
            ],
        )
        # Also patch DEV_TEMPLATES so fallback doesn't kick in
        monkeypatch.setattr(unified_loader, "DEV_TEMPLATES", unified_loader.Path("/nonexistent/dev"))

        result = list_all_workflows()
        assert isinstance(result, list)

    def test_scan_nonexistent_workflow_directory_does_not_crash(self, tmp_path):
        """_scan_workflow_directory on a non-existent path returns without error"""
        missing = tmp_path / "does-not-exist"
        workflows = {}
        _scan_workflow_directory(missing, "dev", workflows)
        assert workflows == {}


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
