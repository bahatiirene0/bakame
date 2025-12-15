/**
 * Weather Tool
 *
 * Get current weather for any location.
 * Uses OpenWeather API.
 *
 * TO ADD A NEW TOOL: Copy this file and modify!
 */

import { BakameTool } from '../types';
import { registerTool } from '../registry';

const weatherTool: BakameTool = {
  name: 'get_weather',
  category: 'information',
  enabled: true,
  requiredEnvVars: ['OPENWEATHER_API_KEY'],

  definition: {
    type: 'function',
    function: {
      name: 'get_weather',
      description:
        'Get current weather information for a location. Use this when users ask about weather, temperature, or climate conditions. Works great for Rwandan cities like Kigali, Butare, Gisenyi, etc.',
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

  async execute(args) {
    const { location, units = 'celsius' } = args as {
      location: string;
      units?: 'celsius' | 'fahrenheit';
    };

    try {
      const apiKey = process.env.OPENWEATHER_API_KEY;
      const unitParam = units === 'fahrenheit' ? 'imperial' : 'metric';

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&units=${unitParam}&appid=${apiKey}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            error: `Location "${location}" not found. Please check the spelling.`,
          };
        }
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: {
          location: data.name,
          country: data.sys.country,
          temperature: Math.round(data.main.temp),
          feels_like: Math.round(data.main.feels_like),
          humidity: data.main.humidity,
          description: data.weather[0].description,
          wind_speed: data.wind.speed,
          units: units,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get weather',
      };
    }
  },
};

// Auto-register when imported
registerTool(weatherTool);

export default weatherTool;
