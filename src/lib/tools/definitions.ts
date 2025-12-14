/**
 * OpenAI Function Calling Tool Definitions
 *
 * These tools extend Bakame AI's capabilities with real-time data access.
 * Each tool is defined with its name, description, and parameters.
 */

import { ChatCompletionTool } from 'openai/resources/chat/completions';

export const BAKAME_TOOLS: ChatCompletionTool[] = [
  // 1. Weather Tool
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get current weather information for a location. Use this when users ask about weather, temperature, or climate conditions. Works great for Rwandan cities like Kigali, Butare, Gisenyi, etc.',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city name, e.g., "Kigali", "Butare", "Gisenyi", "London"',
          },
          units: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
            description: 'Temperature unit (default: celsius)',
          },
        },
        required: ['location'],
      },
    },
  },

  // 2. Calculator Tool
  {
    type: 'function',
    function: {
      name: 'calculate',
      description: 'Perform mathematical calculations. Use this for any math operations including basic arithmetic, percentages, square roots, powers, etc.',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'The mathematical expression to evaluate, e.g., "2 + 2", "15% of 200", "sqrt(144)", "2^10"',
          },
        },
        required: ['expression'],
      },
    },
  },

  // 3. Currency Converter Tool
  {
    type: 'function',
    function: {
      name: 'convert_currency',
      description: 'Convert between currencies. Supports RWF (Rwandan Franc), USD, EUR, GBP, KES, UGX, TZS, and more. Great for checking exchange rates.',
      parameters: {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            description: 'The amount to convert',
          },
          from_currency: {
            type: 'string',
            description: 'Source currency code, e.g., "RWF", "USD", "EUR"',
          },
          to_currency: {
            type: 'string',
            description: 'Target currency code, e.g., "RWF", "USD", "EUR"',
          },
        },
        required: ['amount', 'from_currency', 'to_currency'],
      },
    },
  },

  // 4. Web Search Tool
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: 'Search the internet for current information. Use this when users ask about recent events, news, current prices, or anything that requires up-to-date information.',
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

  // 5. Translation Tool
  {
    type: 'function',
    function: {
      name: 'translate_text',
      description: 'Translate text between languages. Supports Kinyarwanda, English, French, Swahili, and many other languages.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The text to translate',
          },
          from_language: {
            type: 'string',
            description: 'Source language code: "rw" (Kinyarwanda), "en" (English), "fr" (French), "sw" (Swahili), etc.',
          },
          to_language: {
            type: 'string',
            description: 'Target language code: "rw" (Kinyarwanda), "en" (English), "fr" (French), "sw" (Swahili), etc.',
          },
        },
        required: ['text', 'to_language'],
      },
    },
  },

  // 6. Current Time Tool
  {
    type: 'function',
    function: {
      name: 'get_current_time',
      description: 'Get the current date and time. Default timezone is Africa/Kigali (CAT - Central Africa Time). Use when users ask what time or date it is.',
      parameters: {
        type: 'object',
        properties: {
          timezone: {
            type: 'string',
            description: 'Timezone name, e.g., "Africa/Kigali", "UTC", "America/New_York"',
          },
          format: {
            type: 'string',
            enum: ['full', 'date', 'time'],
            description: 'Output format: full (date and time), date only, or time only',
          },
        },
        required: [],
      },
    },
  },

  // 7. News Fetcher Tool
  {
    type: 'function',
    function: {
      name: 'get_news',
      description: 'Get latest news articles. Can filter by country (Rwanda, East Africa, World) or topic (technology, business, sports, etc.)',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'News topic: "general", "technology", "business", "sports", "entertainment", "health", "science"',
          },
          country: {
            type: 'string',
            description: 'Country code: "rw" (Rwanda), "ke" (Kenya), "ug" (Uganda), "tz" (Tanzania), "us", "gb", etc.',
          },
          num_articles: {
            type: 'number',
            description: 'Number of articles to return (default: 5, max: 10)',
          },
        },
        required: [],
      },
    },
  },

  // 8. Location/Maps Tool
  {
    type: 'function',
    function: {
      name: 'search_places',
      description: 'Search for places, businesses, restaurants, hotels, hospitals, etc. Great for finding locations in Rwanda and around the world.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'What to search for, e.g., "restaurants in Kigali", "hospitals near Nyamirambo", "hotels in Gisenyi"',
          },
          location: {
            type: 'string',
            description: 'Location to search around, e.g., "Kigali, Rwanda"',
          },
        },
        required: ['query'],
      },
    },
  },

  // 9. Rwanda Tax Information Tool (n8n workflow)
  {
    type: 'function',
    function: {
      name: 'get_rwanda_tax_info',
      description: 'Get Rwanda tax information including VAT rates, income tax brackets, corporate tax, customs duties, RRA procedures, TIN registration, and tax filing requirements. Use this for ANY question about taxes in Rwanda.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The tax-related question or topic, e.g., "VAT rate", "income tax brackets", "corporate tax", "TIN registration"',
          },
        },
        required: ['query'],
      },
    },
  },

  // 10. Rwanda Government Services Tool (n8n workflow)
  {
    type: 'function',
    function: {
      name: 'get_gov_services_info',
      description: 'Get information about Rwanda government services through Irembo - passport applications, ID cards, birth certificates, business registration, permits, licenses, and other government procedures.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The government service question, e.g., "passport application", "business registration", "driving license"',
          },
        },
        required: ['query'],
      },
    },
  },

  // 11. Maps & Directions Tool (n8n workflow)
  {
    type: 'function',
    function: {
      name: 'get_location_and_directions',
      description: 'Get location information, maps, and directions. Use when users ask about places, locations, how to get somewhere, directions, distance, travel time, or navigation. Works for any location in Rwanda or worldwide. When the user asks for directions without specifying "from", use their current location if available (user_latitude/user_longitude will be provided).',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['search', 'directions'],
            description: '"search" to find a location/place, "directions" to get route between two places',
          },
          query: {
            type: 'string',
            description: 'Place name to search for (when action is "search"), e.g., "Kigali Convention Centre", "BK Arena"',
          },
          from: {
            type: 'string',
            description: 'Starting point (when action is "directions"). Can be omitted if user_latitude/user_longitude are available (use current location). e.g., "Kimironko", "Kigali"',
          },
          to: {
            type: 'string',
            description: 'Destination (when action is "directions"), e.g., "Nyabugogo", "Musanze"',
          },
          mode: {
            type: 'string',
            enum: ['driving', 'walking', 'cycling'],
            description: 'Transportation mode for directions (default: driving)',
          },
          user_latitude: {
            type: 'number',
            description: 'User\'s current latitude (auto-provided if browser location is available)',
          },
          user_longitude: {
            type: 'number',
            description: 'User\'s current longitude (auto-provided if browser location is available)',
          },
        },
        required: ['action'],
      },
    },
  },

  // 12. Image Generation Tool (OpenAI DALL-E 3)
  {
    type: 'function',
    function: {
      name: 'generate_image',
      description: `Generate high-quality images using DALL-E 3. IMPORTANT INSTRUCTIONS:
1. Before calling this tool, if the user's request is vague (e.g., "draw something cool", "make an image"), ASK CLARIFYING QUESTIONS first:
   - What style? (realistic, cartoon, anime, oil painting, digital art, etc.)
   - What mood? (happy, dark, peaceful, dramatic, etc.)
   - Any specific details they want?
2. Once you have enough details, create an OPTIMIZED prompt that is detailed and descriptive.
3. NEVER pass vague prompts - always enhance them with artistic details, lighting, composition, style.

Example: User says "draw a cat" → You ask about style/mood → Then generate with optimized prompt like "A majestic fluffy orange cat sitting on a windowsill, golden hour sunlight streaming through, photorealistic style, bokeh background, warm colors, professional photography"`,
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'The OPTIMIZED, detailed image description. Include style, lighting, colors, composition, mood. The more detailed, the better the result.',
          },
          width: {
            type: 'number',
            description: 'Desired width. DALL-E 3 supports: 1024 (square/portrait) or 1792 (landscape). Default: 1024',
          },
          height: {
            type: 'number',
            description: 'Desired height. DALL-E 3 supports: 1024 (square/landscape) or 1792 (portrait). Default: 1024',
          },
        },
        required: ['prompt'],
      },
    },
  },

  // 13. Video Generation Tool (Kling AI)
  {
    type: 'function',
    function: {
      name: 'generate_video',
      description: `Generate AI videos using Kling AI. IMPORTANT INSTRUCTIONS:
1. Before calling this tool, if the user's request is vague (e.g., "make a video", "create something cool"), ASK CLARIFYING QUESTIONS first:
   - What scene/action do you want to see?
   - What style? (realistic, cinematic, animated, artistic, etc.)
   - What mood? (happy, dramatic, peaceful, action-packed, etc.)
   - Portrait (9:16) or landscape (16:9) or square (1:1)?
2. Once you have enough details, create an OPTIMIZED prompt that is detailed and descriptive.
3. NEVER pass vague prompts - always enhance them with action details, camera movements, lighting, atmosphere.
4. Video generation takes 1-3 minutes, so inform the user to wait.

Example: User says "make a video of a bird" → You ask about style/mood → Then generate with optimized prompt like "A majestic eagle soaring through mountain peaks at golden hour, cinematic drone shot following the bird, dramatic clouds in background, photorealistic style, epic atmosphere"`,
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'The OPTIMIZED, detailed video description. Include action, camera movement, lighting, style, atmosphere. Max 2500 characters.',
          },
          duration: {
            type: 'number',
            description: 'Video duration in seconds. Options: 5 (default, faster) or 10 (longer, slower generation)',
            enum: [5, 10],
          },
          aspect_ratio: {
            type: 'string',
            description: 'Video aspect ratio. Options: "16:9" (landscape, default), "9:16" (portrait/mobile), "1:1" (square)',
            enum: ['16:9', '9:16', '1:1'],
          },
        },
        required: ['prompt'],
      },
    },
  },

  // 14. Code Execution Tool (Piston API)
  {
    type: 'function',
    function: {
      name: 'run_code',
      description: `Execute code and return the output. Supports Python, JavaScript, TypeScript, and many other languages. Use this when:
1. User asks to run/execute code
2. User wants to test a code snippet
3. User wants to see the output of their code
4. User asks you to demonstrate code with actual output

The code runs in a secure sandboxed environment. You can use common libraries like numpy, pandas, requests in Python.
Always show the user both the code and the output.`,
      parameters: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'The code to execute',
          },
          language: {
            type: 'string',
            description: 'Programming language: "python" (default), "javascript", "typescript", "java", "c", "cpp", "go", "rust", "ruby", "php"',
            enum: ['python', 'javascript', 'typescript', 'java', 'c', 'cpp', 'go', 'rust', 'ruby', 'php'],
          },
        },
        required: ['code'],
      },
    },
  },
];

// Tool names for easy reference
export const TOOL_NAMES = {
  WEATHER: 'get_weather',
  CALCULATOR: 'calculate',
  CURRENCY: 'convert_currency',
  WEB_SEARCH: 'search_web',
  TRANSLATE: 'translate_text',
  TIME: 'get_current_time',
  NEWS: 'get_news',
  PLACES: 'search_places',
  // n8n workflow tools
  RWANDA_TAX: 'get_rwanda_tax_info',
  GOV_SERVICES: 'get_gov_services_info',
  MAPS: 'get_location_and_directions',
  // Creative tools
  IMAGE_GENERATION: 'generate_image',
  VIDEO_GENERATION: 'generate_video',
  // Developer tools
  RUN_CODE: 'run_code',
} as const;
