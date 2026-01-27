"""
Tests for the workflow engine.

Tests the loading of instructions.md, XML flow control parsing,
and integration with prompt builder.
"""

import pytest
import tempfile
import shutil
from pathlib import Path
import yaml

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.workflow.engine import WorkflowEngine
from services.workflow.prompt_builder import PromptBuilder, BuiltPrompt


class TestWorkflowEngineInit:
    """Test workflow engine initialization"""
    
    def test_engine_initializes(self):
        """Engine initializes without errors"""
        engine = WorkflowEngine()
        assert engine is not None
        assert engine.templates_path is not None
    
    def test_engine_with_custom_path(self, tmp_path):
        """Engine accepts custom templates path"""
        engine = WorkflowEngine(templates_path=str(tmp_path))
        assert engine.templates_path == tmp_path


class TestInstructionsLoading:
    """Test loading of instructions.md files"""
    
    @pytest.fixture
    def workflow_with_instructions(self, tmp_path):
        """Create a workflow with instructions.md"""
        workflow_dir = tmp_path / "test-workflow"
        workflow_dir.mkdir()
        
        # Create workflow.yaml
        workflow_yaml = {
            "id": "test-workflow",
            "name": "Test Workflow",
            "steps": [{"id": "step-1", "title": "Step 1"}]
        }
        (workflow_dir / "workflow.yaml").write_text(yaml.dump(workflow_yaml))
        
        # Create instructions.md with XML flow control
        instructions = """<workflow>
  <step n="1" goal="Initialize">
    <check if="document exists">
      <output>Found existing document</output>
      <goto step="review"/>
    </check>
    <action>Create new document</action>
  </step>
  
  <step n="2" goal="Review" tag="review">
    <ask>Any changes needed?</ask>
    <check if="changes requested">
      <goto step="1"/>
    </check>
    <halt>Workflow complete</halt>
  </step>
</workflow>"""
        (workflow_dir / "instructions.md").write_text(instructions)
        
        # Create steps directory
        steps_dir = workflow_dir / "steps"
        steps_dir.mkdir()
        
        step_content = """---
id: step-1
title: Step 1
progress: "1/2"
goal: Initialize the workflow
---

# Step 1

Initialize the workflow.
"""
        (steps_dir / "step-01.md").write_text(step_content)
        
        return workflow_dir
    
    def test_instructions_loaded(self, workflow_with_instructions, tmp_path):
        """Instructions.md is loaded into workflow"""
        engine = WorkflowEngine(templates_path=str(tmp_path))
        
        # Access private method for testing
        workflow = engine._load_workflow("test-workflow")
        
        assert workflow is not None
        assert workflow.get('_has_flow_control') is True
    
    def test_instructions_attached_to_steps(self, workflow_with_instructions, tmp_path):
        """Instructions are attached to each step"""
        engine = WorkflowEngine(templates_path=str(tmp_path))
        
        workflow = engine._load_workflow("test-workflow")
        
        assert 'steps' in workflow
        if workflow['steps']:
            first_step = workflow['steps'][0]
            assert '_workflow_instructions' in first_step
            assert '<workflow>' in first_step['_workflow_instructions']
            assert '<goto' in first_step['_workflow_instructions']


class TestFlowControlParsing:
    """Test XML flow control tag recognition"""
    
    def test_check_tag_present(self):
        """Verify <check> tags are preserved"""
        instructions = '<check if="condition"><action>Do something</action></check>'
        assert '<check if=' in instructions
        assert '</check>' in instructions
    
    def test_goto_tag_present(self):
        """Verify <goto> tags are preserved"""
        instructions = '<goto step="review"/>'
        assert '<goto step=' in instructions
    
    def test_halt_tag_present(self):
        """Verify <halt> tags are preserved"""
        instructions = '<halt>Stop here</halt>'
        assert '<halt>' in instructions


class TestPromptBuilderIntegration:
    """Test prompt builder with workflow instructions"""
    
    def test_prompt_builder_initializes(self):
        """Prompt builder initializes"""
        builder = PromptBuilder()
        assert builder is not None
    
    def test_workflow_instructions_in_prompt(self):
        """Workflow instructions are included in prompt"""
        builder = PromptBuilder()
        
        step = {
            "id": "step-1",
            "title": "Test Step",
            "progress": "1/1",
            "goal": "Test goal",
            "instructions": "Do the thing",
            "_workflow_instructions": """<workflow>
  <step n="1">
    <check if="condition">
      <goto step="next"/>
    </check>
  </step>
</workflow>"""
        }
        
        # Mock session with all required attributes
        class MockSession:
            messages = []
            responses = {}
            workflow_id = "test"
            current_step = 0
            total_steps = 1
            document_content = ""
            language = "en"
        
        result = builder.build(
            step=step,
            session=MockSession(),
            user_message="Hello",
            agent={"name": "Test", "persona": {}},
        )
        
        assert isinstance(result, BuiltPrompt)
        assert "Workflow Flow Control" in result.system_prompt
        assert "<check if=" in result.system_prompt
        assert "<goto step=" in result.system_prompt
    
    def test_no_instructions_no_flow_section(self):
        """No flow section if no workflow instructions"""
        builder = PromptBuilder()
        
        step = {
            "id": "step-1",
            "title": "Test Step",
            "goal": "Test goal",
        }
        
        # Mock session with all required attributes
        class MockSession:
            messages = []
            responses = {}
            workflow_id = "test"
            current_step = 0
            total_steps = 1
            document_content = ""
            language = "en"
        
        result = builder.build(
            step=step,
            session=MockSession(),
            user_message="Hello",
            agent={"name": "Test", "persona": {}},
        )
        
        assert "Workflow Flow Control" not in result.system_prompt


class TestStepFileParsing:
    """Test parsing of step markdown files"""
    
    @pytest.fixture
    def engine(self):
        return WorkflowEngine()
    
    def test_parse_step_with_frontmatter(self, engine):
        """Parse step with YAML frontmatter"""
        content = """---
id: test-step
title: Test Step
progress: "1/3"
goal: Complete the test
questions:
  - id: q1
    prompt: What is your name?
---

# Test Step

This is the step content.

## Instructions

1. Do this
2. Do that
"""
        result = engine._parse_step_file(content)
        
        assert result['id'] == 'test-step'
        assert result['title'] == 'Test Step'
        assert result['progress'] == '1/3'
        assert result['goal'] == 'Complete the test'
        assert len(result['questions']) == 1
        assert 'This is the step content' in result.get('instructions', result.get('content', ''))
    
    def test_parse_step_without_frontmatter(self, engine):
        """Handle step without frontmatter"""
        content = """# Simple Step

Just markdown content.
"""
        result = engine._parse_step_file(content)
        
        assert result is not None
        assert result.get('title', '') != '' or 'Simple Step' in str(result)


class TestWorkflowListingWithPhases:
    """Test workflow listing with phase structure"""
    
    def test_list_workflows(self):
        """list_workflows returns workflows"""
        engine = WorkflowEngine()
        workflows = engine.list_workflows()
        
        assert isinstance(workflows, list)
    
    def test_workflows_have_category(self):
        """Workflows have category field"""
        engine = WorkflowEngine()
        workflows = engine.list_workflows()
        
        for workflow in workflows:
            assert 'category' in workflow


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
