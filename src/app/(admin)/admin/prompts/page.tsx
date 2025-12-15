'use client';

/**
 * Admin AI Prompts Page
 *
 * Edit and manage system prompts for Bakame AI.
 * Features:
 * - Edit main system prompt
 * - Toggle prompt active/inactive
 * - View prompt history
 * - Preview prompt in real-time
 */

import { useState, useEffect } from 'react';
import {
  Save,
  RefreshCw,
  Sparkles,
  Eye,
  EyeOff,
  History,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { PageHeader } from '../_components';
import { getSystemPrompts, updateSystemPrompt, getPromptHistory } from '../_lib/actions';

// Default base prompt from the codebase
const DEFAULT_PROMPT = `You are Bakame, a friendly AI assistant created by Bahati Irene for Rwandans.

IDENTITY:
- Name: Bakame (Rabbit in Kinyarwanda)
- Creator: Bahati Irene - CEO & Founder of Kigali AI Labs
- Home: Kigali, Rwanda
- Personality: Warm, helpful, knowledgeable about Rwanda & East Africa

LANGUAGE:
- Respond in the user's language (Kinyarwanda or English)
- Code-switch naturally if user mixes languages
- Use Rwandan cultural references when appropriate

CAPABILITIES:
You have powerful tools and workflows for:
- Rwanda knowledge (tax/RRA, business/RDB, government/Irembo, health, education, police)
- Real-time data (weather, news, currency rates)
- Actions (web search, translation, calculations)
- Creative (image generation with DALL-E 3 - you can create stunning images!)
- Creative (video generation with Kling AI - you can create amazing 5-10 second AI videos!)
- Code (execute Python/JS, data analysis)
- File analysis: You can SEE and ANALYZE images and documents (PDF, Word, Excel) that users upload.

BEHAVIOR:
- Be concise but thorough
- Use tools proactively when they help
- Adapt expertise naturally based on the topic
- When asked about your creator, speak proudly of Bahati Irene
- Never say "I can't" - always try to help`;

interface PromptConfig {
  key: string;
  label: string;
  description: string;
  value: string;
  isActive: boolean;
}

interface HistoryEntry {
  id: string;
  value: string;
  updated_by: string;
  updated_at: string;
}

const PROMPT_CONFIGS: Omit<PromptConfig, 'value' | 'isActive'>[] = [
  {
    key: 'system_prompt_main',
    label: 'Main System Prompt',
    description: 'The core identity and behavior instructions for Bakame AI',
  },
];

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<PromptConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activePromptKey, setActivePromptKey] = useState<string>('system_prompt_main');

  // Load prompts on mount
  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSystemPrompts();

      // Map database data to our format
      const loadedPrompts = PROMPT_CONFIGS.map((config) => {
        const dbPrompt = data.find((d: { key: string }) => d.key === config.key);
        const promptData = dbPrompt?.value as { value?: string; isActive?: boolean } | null;

        return {
          ...config,
          value: promptData?.value || DEFAULT_PROMPT,
          isActive: promptData?.isActive ?? false,
        };
      });

      setPrompts(loadedPrompts);
    } catch (err) {
      setError('Failed to load prompts. Using defaults.');
      // Use defaults on error
      setPrompts(
        PROMPT_CONFIGS.map((config) => ({
          ...config,
          value: DEFAULT_PROMPT,
          isActive: false,
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (key: string) => {
    setLoadingHistory(true);
    try {
      const data = await getPromptHistory(key);
      setHistory(data);
      setShowHistory(true);
    } catch (err) {
      setError('Failed to load history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const updatePrompt = (key: string, field: 'value' | 'isActive', newValue: string | boolean) => {
    setPrompts((prev) =>
      prev.map((prompt) => {
        if (prompt.key !== key) return prompt;
        return { ...prompt, [field]: newValue };
      })
    );
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Save all prompts
      await Promise.all(
        prompts.map((prompt) =>
          updateSystemPrompt(prompt.key, {
            value: prompt.value,
            isActive: prompt.isActive,
          })
        )
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError('Failed to save prompts');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPrompts((prev) =>
      prev.map((prompt) => ({
        ...prompt,
        value: DEFAULT_PROMPT,
      }))
    );
    setSaved(false);
  };

  const restoreFromHistory = (entry: HistoryEntry) => {
    setPrompts((prev) =>
      prev.map((prompt) => {
        if (prompt.key !== activePromptKey) return prompt;
        return { ...prompt, value: entry.value };
      })
    );
    setShowHistory(false);
    setSaved(false);
  };

  const copyPrompt = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activePrompt = prompts.find((p) => p.key === activePromptKey);
  const estimatedTokens = activePrompt ? Math.ceil(activePrompt.value.length / 4) : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="AI Prompts" description="Manage Bakame's system prompts" />
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-green-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Prompts"
        description="Manage Bakame's system prompts and personality"
        actions={
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Default
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        }
      />

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800/50 p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Main Editor */}
      <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  {activePrompt?.label || 'System Prompt'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {activePrompt?.description}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Token count */}
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ~{estimatedTokens.toLocaleString()} tokens
              </span>

              {/* Copy button */}
              <button
                onClick={() => activePrompt && copyPrompt(activePrompt.value)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title="Copy prompt"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>

              {/* Preview toggle */}
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`p-2 rounded-lg ${
                  showPreview
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                title={showPreview ? 'Hide preview' : 'Show preview'}
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>

              {/* History button */}
              <button
                onClick={() => loadHistory(activePromptKey)}
                disabled={loadingHistory}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title="View history"
              >
                <History className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
              </button>

              {/* Active toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {activePrompt?.isActive ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() =>
                    activePrompt && updatePrompt(activePrompt.key, 'isActive', !activePrompt.isActive)
                  }
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    activePrompt?.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      activePrompt?.isActive ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Editor Area */}
        <div className={`grid ${showPreview ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {/* Text Editor */}
          <div className="p-4">
            <textarea
              value={activePrompt?.value || ''}
              onChange={(e) => activePrompt && updatePrompt(activePrompt.key, 'value', e.target.value)}
              className="w-full h-[500px] p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter system prompt..."
            />
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="p-4 border-l border-gray-200 dark:border-gray-800">
              <div className="h-[500px] p-4 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-auto">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                    {activePrompt?.value}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800/50 p-4">
        <div className="flex items-start gap-3">
          {activePrompt?.isActive ? (
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
          )}
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {activePrompt?.isActive ? 'Custom prompt is active' : 'Using default prompt'}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              {activePrompt?.isActive
                ? 'Bakame is using your custom system prompt. Changes take effect immediately for new conversations.'
                : 'Toggle "Active" to enable your custom prompt. When inactive, Bakame uses the hardcoded default.'}
            </p>
          </div>
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Prompt History</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                &times;
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-auto">
              {history.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No history available yet
                </p>
              ) : (
                <div className="space-y-4">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(entry.updated_at).toLocaleString()}
                        </span>
                        <button
                          onClick={() => restoreFromHistory(entry)}
                          className="text-sm text-green-600 dark:text-green-400 hover:underline"
                        >
                          Restore
                        </button>
                      </div>
                      <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap line-clamp-4">
                        {entry.value}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
