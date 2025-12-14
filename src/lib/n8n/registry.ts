/**
 * n8n Workflow Registry
 *
 * Simple registry of available n8n workflows.
 * GPT-4 decides which tools to use based on tool definitions in definitions.ts
 * No keyword matching needed - this is just for reference and documentation.
 */

export interface WorkflowDefinition {
  id: string;
  name: string;
  nameRw: string;
  description: string;
  category: 'knowledge' | 'action' | 'media' | 'research' | 'code';
  webhookPath: string;
  responseType: 'text' | 'image' | 'video' | 'audio' | 'file' | 'data';
  enabled: boolean;
}

/**
 * Workflow Registry - Available n8n workflows
 * Add new workflows here as they are created
 */
export const WORKFLOW_REGISTRY: WorkflowDefinition[] = [
  // ============================================
  // KNOWLEDGE WORKFLOWS
  // ============================================
  {
    id: 'bakame-tax',
    name: 'Rwanda Tax Info',
    nameRw: "Amakuru y'Imisoro",
    description: 'Rwanda tax information from RRA (VAT, income tax, TIN, filing)',
    category: 'knowledge',
    webhookPath: '/webhook/bakame-tax',
    responseType: 'text',
    enabled: true,
  },
  {
    id: 'bakame-gov-services',
    name: 'Government Services',
    nameRw: 'Serivisi za Leta',
    description: 'Irembo services, documents, registration procedures',
    category: 'knowledge',
    webhookPath: '/webhook/bakame-gov-services',
    responseType: 'text',
    enabled: true,
  },

  // ============================================
  // ACTION WORKFLOWS
  // ============================================
  {
    id: 'bakame-maps',
    name: 'Maps & Directions',
    nameRw: 'Ikarita na Inzira',
    description: 'Location search, maps, and turn-by-turn directions',
    category: 'action',
    webhookPath: '/webhook/bakame-maps',
    responseType: 'text',
    enabled: true,
  },
];

/**
 * Get workflow by ID
 */
export function getWorkflow(id: string): WorkflowDefinition | undefined {
  return WORKFLOW_REGISTRY.find((w) => w.id === id);
}

/**
 * Get workflows by category
 */
export function getWorkflowsByCategory(
  category: WorkflowDefinition['category']
): WorkflowDefinition[] {
  return WORKFLOW_REGISTRY.filter((w) => w.enabled && w.category === category);
}
