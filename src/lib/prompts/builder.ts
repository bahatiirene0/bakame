/**
 * Prompt Builder
 *
 * Assembles the final system prompt from:
 * 1. Base prompt (Bakame identity)
 * 2. User context (personalization)
 *
 * NOTE: Specialist prompts are deprecated - domain expertise
 * is now handled by n8n workflows automatically.
 *
 * Respects admin toggle via ENABLE_CUSTOM_PROMPTS env var.
 */

import { BASE_PROMPT, LEGACY_PROMPT } from './base';
import { getSpecialistPrompt, SpecialistType } from './specialists';
import { buildUserContext, UserAISettings } from './userContext';
import { Language } from '@/store/languageStore';

export interface PromptBuildOptions {
  /** @deprecated Specialist system is being removed - use n8n workflows instead */
  specialistId?: SpecialistType;
  userSettings?: Partial<UserAISettings> | null;
  /** User's location if they have granted permission */
  userLocation?: { latitude: number; longitude: number } | null;
  /** User's UI language preference - AI should respond in this language */
  uiLanguage?: Language;
}

/**
 * Check if custom prompts are enabled
 * Defaults to true if not set
 */
export function isCustomPromptsEnabled(): boolean {
  const envValue = process.env.ENABLE_CUSTOM_PROMPTS;
  // Default to true, only disable if explicitly set to 'false'
  return envValue !== 'false';
}

/**
 * Build the complete system prompt
 *
 * @param options - Specialist and user settings
 * @returns Complete system prompt string
 */
export function buildSystemPrompt(options: PromptBuildOptions = {}): string {
  // If custom prompts disabled, return legacy prompt
  if (!isCustomPromptsEnabled()) {
    return LEGACY_PROMPT;
  }

  const { specialistId = 'default', userSettings = null, userLocation = null, uiLanguage = 'rw' } = options;

  // Start with base prompt
  let prompt = BASE_PROMPT;

  // Add specialist context if not default
  const specialistPrompt = getSpecialistPrompt(specialistId);
  if (specialistPrompt) {
    prompt += `\n\n${specialistPrompt}`;
  }

  // Add user context if available
  const userContext = buildUserContext(userSettings);
  if (userContext) {
    prompt += userContext;
  }

  // Add location context if available
  if (userLocation) {
    prompt += `\n\n## User Location
The user has shared their current GPS location (latitude: ${userLocation.latitude.toFixed(4)}, longitude: ${userLocation.longitude.toFixed(4)}). When they ask for directions without specifying a starting point, use the get_location_and_directions tool - their coordinates will be automatically included. Do NOT ask them where they are - you already know their location.`;
  }

  // Add UI language instruction - this ensures AI responds in the user's chosen language
  const languageInstruction = uiLanguage === 'en'
    ? `\n\n## LANGUAGE REQUIREMENT (CRITICAL)
The user has set their interface to ENGLISH. You MUST respond ONLY in English. Do not use Kinyarwanda words or phrases unless the user explicitly writes in Kinyarwanda first. Keep all responses in clear, natural English.`
    : `\n\n## LANGUAGE REQUIREMENT (CRITICAL)
The user has set their interface to KINYARWANDA. You MUST respond ONLY in Kinyarwanda. Do not use English words or phrases unless absolutely necessary (like technical terms). Keep all responses in clear, natural Kinyarwanda.`;

  prompt += languageInstruction;

  return prompt;
}

/**
 * Estimate token count for a prompt
 * Rough estimate: 1 token ≈ 4 characters for English
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Get prompt stats for debugging/monitoring
 */
export function getPromptStats(options: PromptBuildOptions = {}): {
  prompt: string;
  estimatedTokens: number;
  breakdown: {
    base: number;
    specialist: number;
    user: number;
    total: number;
  };
} {
  const baseTokens = estimateTokens(BASE_PROMPT);

  const specialistPrompt = getSpecialistPrompt(options.specialistId || 'default');
  const specialistTokens = estimateTokens(specialistPrompt);

  const userContext = buildUserContext(options.userSettings || null);
  const userTokens = estimateTokens(userContext);

  const prompt = buildSystemPrompt(options);
  const totalTokens = estimateTokens(prompt);

  return {
    prompt,
    estimatedTokens: totalTokens,
    breakdown: {
      base: baseTokens,
      specialist: specialistTokens,
      user: userTokens,
      total: totalTokens,
    },
  };
}
