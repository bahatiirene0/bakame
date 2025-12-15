/**
 * Tools Module v2 - Plugin-based Architecture
 *
 * ADDING A NEW TOOL:
 * 1. Copy /tools/_template.ts to /tools/your-tool-name.ts
 * 2. Fill in the definition and execute function
 * 3. Add import to /tools/index.ts
 * 4. Done! Tool is automatically available to AI
 *
 * USAGE IN API:
 * ```ts
 * import { getToolDefinitions, executeTool } from '@/lib/tools-v2';
 *
 * // Get all enabled tools for OpenAI
 * const tools = getToolDefinitions();
 *
 * // Execute a tool
 * const result = await executeTool('get_weather', { location: 'Kigali' });
 * ```
 */

// Import all tools (they auto-register)
import './tools';

// Export registry functions
export {
  toolRegistry,
  registerTool,
  getToolDefinitions,
  executeTool,
  getToolNames,
} from './registry';

// Export types
export type { BakameTool, ToolResult, ToolConfig } from './types';

// Convenience aliases to match old API
export const BAKAME_TOOLS = () => {
  // Dynamic import to ensure tools are loaded
  const { getToolDefinitions } = require('./registry');
  return getToolDefinitions();
};
