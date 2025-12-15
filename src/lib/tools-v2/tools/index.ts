/**
 * Tool Loader
 *
 * Import all tools here to register them with the registry.
 * Simply add a new import line to enable a new tool!
 */

// Information Tools
import './weather';
import './web-search';

// Creative Tools
import './image-generation';

// Export for explicit imports if needed
export { default as weatherTool } from './weather';
export { default as webSearchTool } from './web-search';
export { default as imageGenerationTool } from './image-generation';
