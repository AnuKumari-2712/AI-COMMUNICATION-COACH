export interface SkillScores {
  overall: number;
  grammar: number;
  vocabulary: number;
  fluency: number;
  pronunciation: number;
  confidence: number;
  speakingPace: number;
  fillerWords: number;
  structure: number;
}

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  college: string;
  course: string;
  year: string;
  careerGoal: string;
  currentLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  targetLevel: 'Intermediate' | 'Advanced' | 'Expert';
  streakDays: number;
  totalPracticeMinutes: number;
  joinedAt: string;
  scores: SkillScores;
}

export interface TrendPoint {
  label: string;
  overall: number;
  grammar: number;
  vocabulary: number;
  fluency: number;
  confidence: number;
}

export interface WeeklyActivityPoint {
  day: string;
  minutes: number;
  sessions: number;
}

export interface SkillDistributionPoint {
  skill: string;
  value: number;
  fullMark: number;
}

export interface PlanTask {
  id: string;
  title: string;
  type: 'grammar' | 'vocabulary' | 'speaking' | 'interview' | 'fluency' | 'text';
  minutes: number;
  done: boolean;
}

export interface DayPlan {
  day: string;
  date: string;
  focus: string;
  tasks: PlanTask[];
}

export interface VocabWord {
  id: string;
  word: string;
  meaning: string;
  example: string;
  difficulty: 'Easy' | 'Medium' | 'Difficult';
  phonetic: string;
  learned: boolean;
}

export interface GrammarQuestion {
  id: string;
  type: 'fill-blank' | 'correct-sentence' | 'multiple-choice' | 'rewrite';
  prompt: string;
  options?: string[];
  answer: string;
  explanation: string;
  weakness: string;
}

export interface InterviewCategory {
  id: string;
  title: string;
  description: string;
  questions: number;
  duration: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  target: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  score: number;
}

export interface AdminStudentRow {
  id: string;
  name: string;
  email: string;
  score: number;
  progress: number;
  lastActive: string;
  status: 'Active' | 'Inactive' | 'At Risk';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'coach';
  content: string;
  timestamp: string;
}

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: 'success' | 'error' | 'warning' | 'info';
}
