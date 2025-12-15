/**
 * Web Search Tool
 *
 * Search the internet for current information.
 * Uses Tavily API for high-quality search results.
 */

import { BakameTool } from '../types';
import { registerTool } from '../registry';

const webSearchTool: BakameTool = {
  name: 'search_web',
  category: 'information',
  enabled: true,
  requiredEnvVars: ['TAVILY_API_KEY'],

  definition: {
    type: 'function',
    function: {
      name: 'search_web',
      description:
        'Search the internet for current information. Use this when users ask about recent events, news, current prices, or anything that requires up-to-date information.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query',
          },
          num_results: {
            type: 'number',
            description: 'Number of results to return (default: 5, max: 10)',
          },
        },
        required: ['query'],
      },
    },
  },

  async execute(args) {
    const { query, num_results = 5 } = args as {
      query: string;
      num_results?: number;
    };

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query,
          search_depth: 'basic',
          max_results: Math.min(num_results, 10),
          include_answer: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Search API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: {
          answer: data.answer,
          results: data.results?.map((r: { title: string; url: string; content: string }) => ({
            title: r.title,
            url: r.url,
            snippet: r.content,
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      };
    }
  },
};

registerTool(webSearchTool);
export default webSearchTool;
