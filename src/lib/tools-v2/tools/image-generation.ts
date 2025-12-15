/**
 * Image Generation Tool
 *
 * Generate images using FAL.ai's fast FLUX model.
 * High quality, fast generation.
 */

import { BakameTool } from '../types';
import { registerTool } from '../registry';

const imageGenerationTool: BakameTool = {
  name: 'generate_image',
  category: 'creative',
  enabled: true,
  requiredEnvVars: ['FAL_KEY'],

  definition: {
    type: 'function',
    function: {
      name: 'generate_image',
      description: `Generate high-quality images using AI. IMPORTANT:
1. If user's request is vague, ASK for style/mood/details first
2. Create OPTIMIZED prompts with artistic details, lighting, composition
3. Never pass vague prompts - enhance them!

Example: "draw a cat" → Ask style → Generate: "A majestic fluffy orange cat, golden hour sunlight, photorealistic, bokeh background"`,
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'Detailed image description with style, lighting, colors, composition',
          },
          width: {
            type: 'number',
            description: 'Image width (default: 1024)',
          },
          height: {
            type: 'number',
            description: 'Image height (default: 1024)',
          },
        },
        required: ['prompt'],
      },
    },
  },

  async execute(args) {
    const { prompt, width = 1024, height = 1024 } = args as {
      prompt: string;
      width?: number;
      height?: number;
    };

    try {
      // Use FAL.ai's FLUX model
      const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Key ${process.env.FAL_KEY}`,
        },
        body: JSON.stringify({
          prompt,
          image_size: { width, height },
          num_images: 1,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Image generation failed: ${error}`);
      }

      const data = await response.json();
      const imageUrl = data.images?.[0]?.url;

      if (!imageUrl) {
        throw new Error('No image generated');
      }

      return {
        success: true,
        data: {
          image_url: imageUrl,
          prompt,
          width,
          height,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Image generation failed',
      };
    }
  },
};

registerTool(imageGenerationTool);
export default imageGenerationTool;
