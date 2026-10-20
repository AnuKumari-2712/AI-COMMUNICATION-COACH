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

function generateCoachReply(message: string): string {
  const lower = message.toLowerCase().trim();

  // 1. Greetings
  if (/^(hi|hello|hey|good morning|good evening|namaste)/i.test(lower) && lower.length < 25) {
    return "Hello! I'm your AI Communication Coach. What would you like to work on today? We can practice interview answers, reduce filler words, improve speaking pace, or refine your grammar and vocabulary.";
  }

  // 2. Filler words
  if (lower.includes('filler') || lower.includes('um') || lower.includes('uh') || lower.includes('like')) {
    return "To reduce filler words like 'um' and 'like', practice the **'silent pause' technique**: whenever your brain needs a moment to retrieve a thought, pause silently for 1 second instead of vocalizing a filler. To the interviewer, a pause reads as thoughtful and confident, while filler words can dilute your impact.";
  }

  // 3. Interview Structure & STAR Method
  if (lower.includes('star') || lower.includes('structure') || lower.includes('behavioral') || lower.includes('answer')) {
    return "For behavioral interview questions, use the **STAR method** to keep your answer tight and compelling:\n• **Situation**: Set the scene and background briefly (15-20% of time).\n• **Task**: What specific responsibility or goal did you own?\n• **Action**: What concrete steps did YOU take? (Focus on 'I', not just 'we').\n• **Result**: What was the measurable outcome or lesson learned?";
  }

  // 4. Speaking Pace
  if (lower.includes('pace') || lower.includes('speed') || lower.includes('fast') || lower.includes('slow') || lower.includes('wpm')) {
    return "The ideal speaking pace for professional interviews is **130 to 160 words per minute**. If you tend to speak too fast under pressure, practice reading a paragraph aloud while tapping a steady, calm rhythm. Pausing at comma and period boundaries also naturally regulates your cadence.";
  }

  // 5. Confidence & Nervousness
  if (lower.includes('confiden') || lower.includes('nervous') || lower.includes('anxiety') || lower.includes('sound')) {
    return "To project confidence during an interview:\n1. **Eliminate weak qualifiers**: Avoid 'I think maybe...' or 'I'm not completely sure, but...'. Lead directly with your perspective.\n2. **Downward vocal inflection**: End your statements with a steady, decisive tone rather than an upward question inflection.\n3. **Intentional breathing**: Take a deep, slow breath before you begin speaking to steady your heart rate and voice.";
  }

  // 6. Tell me about yourself / Self Introduction
  if (lower.includes('tell me about yourself') || lower.includes('intro') || lower.includes('introduce')) {
    return "Structure your self-introduction using the **Present-Past-Future** framework:\n1. **Present**: Your current expertise, domain focus, and key technical capabilities.\n2. **Past**: 1 or 2 standout achievements or projects that prove your impact.\n3. **Future**: Why you are excited about this specific role and how you can add immediate value.";
  }

  // 7. Vocabulary
  if (lower.includes('vocab') || lower.includes('word') || lower.includes('formal')) {
    return "To elevate your vocabulary without sounding robotic:\n• Swap generic verbs for active, precise verbs: say **'facilitated'** instead of 'helped with', **'orchestrated'** or **'spearheaded'** instead of 'started', and **'resolved'** instead of 'fixed'.\n• Use concrete metrics rather than vague words like 'a lot' or 'good progress'.";
  }

  // 8. Grammar & Tense
  if (lower.includes('grammar') || lower.includes('tense')) {
    return "The most common grammar error in interviews is switching between past and present tense mid-story. When narrating past projects, consistently use simple past tense ('I built', 'we released', 'I coordinated'). Only switch to present tense when stating things that remain true right now ('I enjoy full-stack development').";
  }

  // 9. Technical Questions
  if (lower.includes('technical') || lower.includes('coding') || lower.includes('system design')) {
    return "When tackling technical interview questions:\n1. **Clarify assumptions**: Never jump straight into code or design without clarifying constraints and requirements.\n2. **Think out loud**: Interviewers care more about your problem-solving thought process than getting to the final answer in silence.\n3. **Discuss trade-offs**: Always mention time/space complexity or alternative approaches.";
  }

  // Fallback
  return `That's a great question regarding "${message.slice(0, 40)}". A core principle in communication is clarity of intention: start with the conclusion or main point first (the BLUF method: Bottom Line Up Front), then support it with one solid example, and close cleanly. Would you like a specific drill for practicing this?`;
}

export const coachService = {
  /**
   * Calls the backend coach or provides intelligent topic-matched advice
   * directly from the AI Coach engine.
   */
  sendMessage: async (_history: ChatMessage[], message: string): Promise<string> => {
    try {
      const { data } = await apiClient.post<{ reply: string }>('/coach/chat', { message });
      return data.reply;
    } catch {
      return mockDelay(generateCoachReply(message), 400);
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
          'Give me tips to structure interview answers with STAR.',
          'How do I answer "Tell me about yourself"?',
          'How can I speak with more confidence and steady pace?',
        ],
        200,
      );
    }
  },
};
