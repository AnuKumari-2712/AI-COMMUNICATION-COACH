import { useEffect, useRef, useState } from 'react';
import { Send, Mic, Sparkles, Bot, User } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui';
import { CommunicationOrb } from '@/components/three/CommunicationOrb';
import { coachService } from '@/services/coachService';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types';

const initialMessages: ChatMessage[] = [
  {
    id: 'm0',
    role: 'coach',
    content: "Hi Ananya! I'm your AI Communication Coach. I can help with grammar, vocabulary, fluency or interview prep — based on your recent sessions, want to work on reducing filler words today?",
    timestamp: new Date().toISOString(),
  },
];

export default function AICoachPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [prompts, setPrompts] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    coachService.suggestedPrompts().then(setPrompts);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { id: Math.random().toString(36), role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setThinking(true);
    const reply = await coachService.sendMessage(messages, text);
    setMessages((prev) => [...prev, { id: Math.random().toString(36), role: 'coach', content: reply, timestamp: new Date().toISOString() }]);
    setThinking(false);
  };

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col lg:h-[calc(100vh-7rem)]">
      <PageHeader eyebrow="Personal Coach" title="AI Coach" description="Ask anything about grammar, vocabulary, fluency or interview strategy." />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="hidden flex-col items-center justify-center p-6 lg:flex">
          <CommunicationOrb active={thinking} className="h-48 w-48" />
          <p className="mt-4 font-display text-sm font-semibold text-base-50">Coach Aria</p>
          <p className="mt-1 text-center text-xs text-base-400">Personalized using your learner profile — grammar 71, fluency 66, confidence 69.</p>
          <div className="mt-5 w-full space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-base-500">Suggested Prompts</p>
            {prompts.map((p) => (
              <button key={p} onClick={() => sendMessage(p)} className="w-full rounded-lg bg-base-800/60 px-3 py-2 text-left text-xs text-base-300 hover:bg-white/5">
                {p}
              </button>
            ))}
          </div>
        </Card>

        <Card className="flex min-h-0 flex-1 flex-col">
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.map((m) => (
              <div key={m.id} className={cn('flex items-start gap-3', m.role === 'user' && 'flex-row-reverse')}>
                <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', m.role === 'coach' ? 'bg-accent-500/15 text-accent-400' : 'bg-base-700 text-base-200')}>
                  {m.role === 'coach' ? <Bot className="size-4" /> : <User className="size-4" />}
                </div>
                <div className={cn('max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed', m.role === 'coach' ? 'bg-base-800 text-base-100' : 'bg-accent-500 text-white')}>
                  {m.content}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-500/15 text-accent-400"><Bot className="size-4" /></div>
                <div className="flex items-center gap-1 rounded-2xl bg-base-800 px-4 py-3">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="size-1.5 animate-bounce rounded-full bg-base-400" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex items-center gap-2 border-t border-white/5 p-4"
          >
            <button type="button" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-base-800 text-base-300 hover:bg-base-700 focus-ring" aria-label="Voice input">
              <Mic className="size-4.5" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your coach anything..."
              className="h-10 flex-1 rounded-xl border border-base-600 bg-base-800/70 px-4 text-sm text-base-50 placeholder:text-base-400 focus-ring focus:border-accent-400"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-500 text-white transition-colors hover:bg-accent-400 disabled:opacity-50 focus-ring"
              aria-label="Send message"
            >
              <Send className="size-4.5" />
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-base-500 lg:hidden">
        <Sparkles className="size-3" /> Personalized using your learner profile
      </div>
    </div>
  );
}
