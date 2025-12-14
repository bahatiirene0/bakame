/**
 * Voice Store - Zustand store for voice assistant state
 *
 * Manages:
 * - Voice modal open/close state
 * - Voice conversation history (separate from text chat)
 */

import { create } from 'zustand';

interface VoiceMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface VoiceState {
  // Modal state
  isVoiceModalOpen: boolean;

  // Conversation history (for displaying in the modal)
  voiceMessages: VoiceMessage[];

  // Actions
  openVoiceModal: () => void;
  closeVoiceModal: () => void;
  toggleVoiceModal: () => void;
  addVoiceMessage: (role: 'user' | 'assistant', content: string) => void;
  clearVoiceMessages: () => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  isVoiceModalOpen: false,
  voiceMessages: [],

  openVoiceModal: () => set({ isVoiceModalOpen: true }),
  closeVoiceModal: () => set({ isVoiceModalOpen: false }),
  toggleVoiceModal: () => set((state) => ({ isVoiceModalOpen: !state.isVoiceModalOpen })),

  addVoiceMessage: (role, content) =>
    set((state) => ({
      voiceMessages: [
        ...state.voiceMessages,
        {
          id: `voice-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          role,
          content,
          timestamp: new Date(),
        },
      ],
    })),

  clearVoiceMessages: () => set({ voiceMessages: [] }),
}));
