/**
 * Types for Bakame.ai Chat Application
 *
 * This file contains all TypeScript interfaces and types used throughout
 * the application. Organized by feature area for easy navigation.
 */

// ============================================
// MESSAGE TYPES
// ============================================

// Message role types - who sent the message
export type MessageRole = 'user' | 'assistant' | 'system';

// Source citation for web search results
export interface SourceCitation {
  title: string;
  url: string;
  snippet?: string;
  date?: string;
}

// Directions data for map results
export interface DirectionsData {
  from: {
    name: string;
    full_name?: string;
  };
  to: {
    name: string;
    full_name?: string;
  };
  distance: string;
  duration: string;
  mode: string;
  steps: Array<{
    step: number;
    instruction: string;
    distance: string;
    duration: string;
    landmark?: string | null;
    area?: string | null;
  }>;
  google_maps_url?: string;
  map_url?: string;
}

// Weather data for weather results
export interface WeatherData {
  location: string;
  temperature: number;
  unit?: 'C' | 'F';
  condition: string;
  humidity?: number;
  wind_speed?: string;
  feels_like?: number;
  high?: number;
  low?: number;
  icon?: string;
}

// ============================================
// FILE ATTACHMENT TYPES
// ============================================

// File type categories
export type FileType = 'image' | 'document';

// Supported MIME types
export type ImageMimeType = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
export type DocumentMimeType =
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// File attachment for messages
export interface FileAttachment {
  id: string;
  name: string;
  type: FileType;
  mimeType: string;
  size: number; // bytes
  url: string; // Supabase Storage URL (signed)
  extractedText?: string; // For documents - extracted text content
  uploadedAt: Date;
}

// File upload limits and validation
export const FILE_LIMITS = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  maxFiles: 5, // Max files per message
  allowedImageTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const,
  allowedDocumentTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ] as const,
  // Human-readable file extensions for input accept attribute
  acceptString: 'image/png,image/jpeg,image/gif,image/webp,.pdf,.docx,.xlsx',
} as const;

// File upload response from API
export interface FileUploadResponse {
  success: boolean;
  file?: FileAttachment;
  error?: string;
}

// Individual chat message structure
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isStreaming?: boolean; // True while message is being streamed

  // Tool/Rich content support
  toolName?: string; // Name of tool being used (for loading indicator)
  sources?: SourceCitation[]; // Web search sources
  directionsData?: DirectionsData; // Directions/map data
  weatherData?: WeatherData; // Weather data
  generatedImage?: GeneratedImageData; // AI-generated image
  generatedVideo?: GeneratedVideoData; // AI-generated video
  codeOutput?: CodeOutputData; // Code execution output

  // File attachments (images, documents)
  attachments?: FileAttachment[];
}

// ============================================
// CHAT SESSION TYPES (Multi-chat support)
// ============================================

// Individual chat session
export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  agentId?: string; // Which specialist agent was used (if any)
}

// Serializable version for localStorage
export interface ChatSessionSerialized {
  id: string;
  title: string;
  messages: Array<{
    id: string;
    role: MessageRole;
    content: string;
    timestamp: string;
    isStreaming?: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
  agentId?: string;
}

// ============================================
// CHAT STORE TYPES
// ============================================

// Chat state for Zustand store with multi-session support
export interface ChatState {
  // Session management
  sessions: ChatSession[];
  activeSessionId: string | null;

  // Current session state
  isLoading: boolean;
  isStreaming: boolean;
  streamingMessageId: string | null;
  error: string | null;
  currentAgent: AgentType;

  // UI state
  sidebarOpen: boolean;
}

// Actions for the chat store
export interface ChatActions {
  // Session management
  createSession: (title?: string, agentId?: string) => string;
  deleteSession: (sessionId: string) => void;
  clearAllSessions: () => void;
  renameSession: (sessionId: string, newTitle: string) => void;
  setActiveSession: (sessionId: string) => void;

  // Message management (operates on active session)
  addMessage: (role: MessageRole, content: string, isStreaming?: boolean, attachments?: FileAttachment[]) => string;
  updateMessage: (id: string, content: string) => void;
  finalizeMessage: (id: string) => void;
  appendToMessage: (id: string, chunk: string) => void;
  flushStreamBuffer: (id: string) => void;
  clearMessages: () => void;

  // State setters
  setLoading: (loading: boolean) => void;
  setStreaming: (streaming: boolean, messageId?: string | null) => void;
  setError: (error: string | null) => void;
  setAgent: (agent: AgentType) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Main action
  sendMessage: (content: string, attachments?: FileAttachment[], skipAddUserMessage?: boolean) => Promise<void>;
  cancelRequest: () => void;

  // Edit and regenerate
  editMessageAndRegenerate: (messageId: string, newContent: string) => Promise<void>;

  // Persistence
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

// Combined store type
export type ChatStore = ChatState & ChatActions;

// ============================================
// API TYPES
// ============================================

// API request/response types
export interface ChatRequest {
  messages: Array<{
    role: MessageRole;
    content: string;
  }>;
  agent?: AgentType;
}

export interface ChatResponse {
  message: string;
  error?: string;
}

// Generated image data
export interface GeneratedImageData {
  url: string;
  prompt: string;
  width: number;
  height: number;
}

// Generated video data
export interface GeneratedVideoData {
  url: string;
  prompt: string;
  duration: number;
  aspectRatio: string;
}

// Code execution output data
export interface CodeOutputData {
  code: string;
  language: string;
  version?: string;
  output: string;
  error?: string | null;
  exitCode?: number;
}

// Streaming chunk from SSE
export interface StreamChunk {
  content?: string;
  error?: string;
  toolCall?: string; // Name of tool being called (for loading indicator)
  sources?: SourceCitation[]; // Web search sources
  directionsData?: DirectionsData; // Directions data
  weatherData?: WeatherData; // Weather data
  generatedImage?: GeneratedImageData; // AI-generated image
  generatedVideo?: GeneratedVideoData; // AI-generated video
  codeOutput?: CodeOutputData; // Code execution output
}

// ============================================
// THEME TYPES
// ============================================

export type Theme = 'light' | 'dark';

export interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

// ============================================
// AGENT TYPES (DEPRECATED - kept for backward compatibility)
// ============================================
// NOTE: The multi-agent system has been replaced by n8n workflows.
// Domain expertise is now handled automatically through workflow routing.
// These types are kept for database compatibility with existing sessions.

/**
 * @deprecated Use n8n workflows instead. This type is kept for backward compatibility.
 */
export type AgentType = 'default' | 'tax' | 'legal' | 'business' | 'creative';

/**
 * @deprecated Use n8n workflows instead.
 */
export interface AgentConfig {
  id: AgentType;
  name: string;
  description: string;
  icon: string;
  color: string;
}

/**
 * @deprecated Use n8n workflows instead.
 * Only 'default' is used now - Bakame handles all capabilities through n8n.
 */
export const AGENTS: Record<AgentType, AgentConfig> = {
  default: {
    id: 'default',
    name: 'Bakame',
    description: 'AI y\'Abanyarwanda - gufasha mu bintu byose',
    icon: '🐰',
    color: '#22C55E',
  },
  // Legacy entries kept for existing database sessions
  tax: { id: 'tax', name: 'Tax (Legacy)', description: '', icon: '📊', color: '#10B981' },
  legal: { id: 'legal', name: 'Legal (Legacy)', description: '', icon: '⚖️', color: '#8B5CF6' },
  business: { id: 'business', name: 'Business (Legacy)', description: '', icon: '💼', color: '#F59E0B' },
  creative: { id: 'creative', name: 'Creative (Legacy)', description: '', icon: '✨', color: '#EC4899' },
};
