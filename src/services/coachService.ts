import { apiClient } from './apiClient';
import { mockDelay } from './mockDelay';
import type { ChatMessage } from '@/types';

const responses = [
  "Great question. When answering behavioral questions, try the STAR method: Situation, Task, Action, Result. It keeps your answer structured and easy to follow.",
  "I noticed you tend to use filler words like \"um\" and \"like\" when thinking. Try pausing silently for a beat instead — it reads as more confident.",
  "For vocabulary, aim to replace generic words (\"good\", \"nice\") with more precise ones (\"effective\", \"well-structured\") in professional contexts.",
  "Your speaking pace tends to speed up under pressure. Practice reading a paragraph aloud while tapping a steady rhythm — it helps regulate pace.",
  "A strong interview closing line reinforces enthusiasm: mention one specific thing that excites you about the role or team.",
];

export const coachService = {
  /**
   * Calls the backend coach, which personalizes its reply using the
   * student's real learner profile (weaknesses, career goal). Falls back to
   * a canned response if the backend is unreachable.
   */
  sendMessage: async (_history: ChatMessage[], message: string): Promise<string> => {
    try {
      const { data } = await apiClient.post<{ reply: string }>('/coach/chat', { message });
      return data.reply;
    } catch {
      return mockDelay(responses[Math.floor(Math.random() * responses.length)], 1000);
    }
  },

  suggestedPrompts: async (): Promise<string[]> => {
    try {
      const { data } = await apiClient.get<string[]>('/coach/suggested-prompts');
      return data;
    } catch {
      return mockDelay(
        [
          'How do I reduce filler words while speaking?',
          'Give me tips to structure interview answers.',
          'Help me improve my vocabulary for interviews.',
          'How can I sound more confident?',
        ],
        200,
      );
    }
  },
};
