/**
 * ========================================
 * TOOL TEMPLATE - Copy this to create new tools!
 * ========================================
 *
 * HOW TO ADD A NEW TOOL:
 *
 * 1. Copy this file: cp _template.ts your-tool-name.ts
 * 2. Update the tool definition below
 * 3. Implement the execute function
 * 4. Add import to ./index.ts: import './your-tool-name';
 * 5. Done! Your tool is now available to the AI
 */

import { BakameTool } from '../types';
import { registerTool } from '../registry';

const myNewTool: BakameTool = {
  // ========================================
  // STEP 1: Basic Info
  // ========================================
  name: 'my_tool_name', // Unique identifier (snake_case)
  category: 'utility', // 'utility' | 'creative' | 'information' | 'rwanda' | 'developer' | 'workflow'
  enabled: true, // Set to false to disable

  // Optional: Required environment variables (tool disabled if missing)
  // requiredEnvVars: ['MY_API_KEY'],

  // ========================================
  // STEP 2: OpenAI Function Definition
  // ========================================
  definition: {
    type: 'function',
    function: {
      name: 'my_tool_name', // Must match 'name' above
      description: `
        Describe what your tool does. Be specific!
        The AI uses this to decide when to call your tool.
        Include:
        - What the tool does
        - When to use it
        - Example use cases
      `,
      parameters: {
        type: 'object',
        properties: {
          // Define your parameters here
          param1: {
            type: 'string',
            description: 'Description of param1',
          },
          param2: {
            type: 'number',
            description: 'Description of param2 (optional)',
          },
        },
        required: ['param1'], // List required parameters
      },
    },
  },

  // ========================================
  // STEP 3: Execute Function
  // ========================================
  async execute(args) {
    // Extract and type your arguments
    const { param1, param2 = 10 } = args as {
      param1: string;
      param2?: number;
    };

    try {
      // Your tool logic here
      // - Call external APIs
      // - Process data
      // - Return results

      // Example: Call an API
      // const response = await fetch('https://api.example.com/...', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${process.env.MY_API_KEY}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ param1, param2 }),
      // });
      //
      // if (!response.ok) {
      //   throw new Error(`API error: ${response.status}`);
      // }
      //
      // const data = await response.json();

      // Return success with data
      return {
        success: true,
        data: {
          result: `Processed ${param1} with ${param2}`,
          // Include whatever data you want the AI to see
        },
      };
    } catch (error) {
      // Return error (AI will see this message)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed',
      };
    }
  },
};

// Auto-register when imported
registerTool(myNewTool);

export default myNewTool;
