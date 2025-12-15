/**
 * Tool System Type Definitions
 *
 * Every tool in Bakame AI implements these interfaces.
 */

import { ChatCompletionTool } from 'openai/resources/chat/completions';

/**
 * Result returned by every tool execution
 */
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Tool definition interface
 * Each tool file exports an object implementing this interface
 */
export interface BakameTool {
  /** Unique tool identifier */
  name: string;

  /** Tool category for organization */
  category: 'utility' | 'creative' | 'information' | 'rwanda' | 'developer' | 'workflow';

  /** Whether the tool is enabled */
  enabled: boolean;

  /** OpenAI function definition */
  definition: ChatCompletionTool;

  /** Execute the tool with given arguments */
  execute: (args: Record<string, unknown>) => Promise<ToolResult>;

  /** Optional: Required environment variables */
  requiredEnvVars?: string[];

  /** Optional: Required API keys */
  requiredApiKeys?: string[];
}

/**
 * Tool registry configuration
 */
export interface ToolConfig {
  /** Enable/disable individual tools */
  enabledTools?: string[];

  /** Disable specific tools */
  disabledTools?: string[];

  /** Enable entire categories */
  enabledCategories?: BakameTool['category'][];
}
