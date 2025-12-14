/**
 * n8n Integration Module
 *
 * Provides workflow orchestration capabilities for Bakame AI.
 * GPT-4 decides which tools to use based on tool definitions - no keyword matching needed.
 */

// Workflow registry and definitions
export {
  WORKFLOW_REGISTRY,
  type WorkflowDefinition,
  getWorkflow,
  getWorkflowsByCategory,
} from './registry';

// Workflow client for webhook calls
export {
  type WorkflowResponse,
  type WorkflowInput,
  callWorkflow,
  checkN8nHealth,
  formatWorkflowResponse,
} from './client';
