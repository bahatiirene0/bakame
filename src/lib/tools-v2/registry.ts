/**
 * Tool Registry
 *
 * Central registry that manages all tools.
 * Tools auto-register when imported.
 *
 * USAGE:
 * - Import tools from /tools folder
 * - They automatically register themselves
 * - Use getTools() to get all enabled tools
 * - Use executeTool() to run a tool
 */

import { ChatCompletionTool } from 'openai/resources/chat/completions';
import { BakameTool, ToolResult, ToolConfig } from './types';
import { logger } from '@/lib/logger';

class ToolRegistry {
  private tools: Map<string, BakameTool> = new Map();
  private config: ToolConfig = {};

  /**
   * Register a tool
   */
  register(tool: BakameTool): void {
    // Check required env vars
    if (tool.requiredEnvVars) {
      const missing = tool.requiredEnvVars.filter(v => !process.env[v]);
      if (missing.length > 0) {
        logger.warn(`Tool "${tool.name}" disabled: missing env vars: ${missing.join(', ')}`);
        return;
      }
    }

    this.tools.set(tool.name, tool);
    logger.debug(`Tool registered: ${tool.name} [${tool.category}]`);
  }

  /**
   * Configure tool availability
   */
  configure(config: ToolConfig): void {
    this.config = config;
  }

  /**
   * Get all enabled tool definitions for OpenAI
   */
  getDefinitions(): ChatCompletionTool[] {
    const definitions: ChatCompletionTool[] = [];

    for (const tool of this.tools.values()) {
      if (this.isToolEnabled(tool)) {
        definitions.push(tool.definition);
      }
    }

    return definitions;
  }

  /**
   * Get all enabled tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.values())
      .filter(tool => this.isToolEnabled(tool))
      .map(tool => tool.name);
  }

  /**
   * Execute a tool by name
   */
  async execute(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name);

    if (!tool) {
      logger.error(`Tool not found: ${name}`);
      return {
        success: false,
        error: `Unknown tool: ${name}`,
      };
    }

    if (!this.isToolEnabled(tool)) {
      logger.warn(`Tool is disabled: ${name}`);
      return {
        success: false,
        error: `Tool "${name}" is currently disabled`,
      };
    }

    try {
      logger.info(`Executing tool: ${name}`, { args: Object.keys(args) });
      const startTime = Date.now();

      const result = await tool.execute(args);

      const duration = Date.now() - startTime;
      logger.info(`Tool completed: ${name}`, {
        success: result.success,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error) {
      logger.error(`Tool execution failed: ${name}`, {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed',
      };
    }
  }

  /**
   * Check if a tool is enabled based on config
   */
  private isToolEnabled(tool: BakameTool): boolean {
    // Tool itself is disabled
    if (!tool.enabled) return false;

    // Explicitly disabled
    if (this.config.disabledTools?.includes(tool.name)) return false;

    // If enabledTools specified, only those are enabled
    if (this.config.enabledTools && !this.config.enabledTools.includes(tool.name)) {
      return false;
    }

    // If enabledCategories specified, check category
    if (this.config.enabledCategories && !this.config.enabledCategories.includes(tool.category)) {
      return false;
    }

    return true;
  }

  /**
   * Get tool by name
   */
  getTool(name: string): BakameTool | undefined {
    return this.tools.get(name);
  }

  /**
   * List all registered tools (for debugging)
   */
  listTools(): Array<{ name: string; category: string; enabled: boolean }> {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      category: tool.category,
      enabled: this.isToolEnabled(tool),
    }));
  }
}

// Singleton instance
export const toolRegistry = new ToolRegistry();

// Helper functions for easy access
export const registerTool = (tool: BakameTool) => toolRegistry.register(tool);
export const getToolDefinitions = () => toolRegistry.getDefinitions();
export const executeTool = (name: string, args: Record<string, unknown>) =>
  toolRegistry.execute(name, args);
export const getToolNames = () => toolRegistry.getToolNames();
