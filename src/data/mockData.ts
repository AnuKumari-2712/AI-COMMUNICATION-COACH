import type {
  Achievement,
  AdminStudentRow,
  DayPlan,
  GrammarQuestion,
  InterviewCategory,
  SkillDistributionPoint,
  StudentProfile,
  Testimonial,
  TrendPoint,
  VocabWord,
  WeeklyActivityPoint,
} from '@/types';

export const currentStudent: StudentProfile = {
  id: 'stu_001',
  name: 'Ananya Sharma',
  email: 'ananya.sharma@example.edu',
  college: 'Vellore Institute of Technology',
  course: 'B.Tech Computer Science',
  year: '3rd Year',
  careerGoal: 'Software Engineer at a Product Company',
  currentLevel: 'Intermediate',
  targetLevel: 'Advanced',
  streakDays: 12,
  totalPracticeMinutes: 1840,
  joinedAt: '2026-06-02',
  scores: {
    overall: 74,
    grammar: 71,
    vocabulary: 78,
    fluency: 66,
    pronunciation: 80,
    confidence: 69,
    speakingPace: 62,
    fillerWords: 58,
    structure: 75,
  },
};

export const trendData: TrendPoint[] = [
  { label: 'Wk 1', overall: 52, grammar: 50, vocabulary: 55, fluency: 48, confidence: 46 },
  { label: 'Wk 2', overall: 57, grammar: 54, vocabulary: 59, fluency: 52, confidence: 51 },
  { label: 'Wk 3', overall: 61, grammar: 58, vocabulary: 63, fluency: 55, confidence: 55 },
  { label: 'Wk 4', overall: 65, grammar: 62, vocabulary: 68, fluency: 58, confidence: 59 },
  { label: 'Wk 5', overall: 68, grammar: 65, vocabulary: 71, fluency: 61, confidence: 62 },
  { label: 'Wk 6', overall: 71, grammar: 68, vocabulary: 74, fluency: 63, confidence: 65 },
  { label: 'Wk 7', overall: 74, grammar: 71, vocabulary: 78, fluency: 66, confidence: 69 },
];

export const weeklyActivity: WeeklyActivityPoint[] = [
  { day: 'Mon', minutes: 32, sessions: 3 },
  { day: 'Tue', minutes: 18, sessions: 2 },
  { day: 'Wed', minutes: 45, sessions: 4 },
  { day: 'Thu', minutes: 26, sessions: 2 },
  { day: 'Fri', minutes: 52, sessions: 5 },
  { day: 'Sat', minutes: 12, sessions: 1 },
  { day: 'Sun', minutes: 38, sessions: 3 },
];

export const skillDistribution: SkillDistributionPoint[] = [
  { skill: 'Grammar', value: 71, fullMark: 100 },
  { skill: 'Vocabulary', value: 78, fullMark: 100 },
  { skill: 'Fluency', value: 66, fullMark: 100 },
  { skill: 'Pronunciation', value: 80, fullMark: 100 },
  { skill: 'Confidence', value: 69, fullMark: 100 },
  { skill: 'Pace', value: 62, fullMark: 100 },
];

export const todaysPlan: DayPlan = {
  day: 'Today',
  date: new Date().toISOString(),
  focus: 'Fluency & Filler Words',
  tasks: [
    { id: 't1', title: 'Vocabulary Practice — Business English', type: 'vocabulary', minutes: 10, done: true },
    { id: 't2', title: 'Speaking Exercise — Describe a Challenge', type: 'speaking', minutes: 8, done: false },
    { id: 't3', title: 'Interview Question — Tell me about yourself', type: 'interview', minutes: 10, done: false },
    { id: 't4', title: 'Grammar Drill — Tense Consistency', type: 'grammar', minutes: 6, done: false },
  ],
};

export const weekPlan: DayPlan[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => ({
  day,
  date: new Date(Date.now() + i * 86400000).toISOString(),
  focus: ['Fluency', 'Grammar', 'Vocabulary', 'Interview Skills', 'Confidence', 'Review', 'Mock Interview'][i],
  tasks: [
    { id: `${day}-g`, title: 'Grammar Consistency Drill', type: 'grammar', minutes: 10, done: i < 2 },
    { id: `${day}-s`, title: 'Speaking Fluency Sprint', type: 'speaking', minutes: 15, done: i < 1 },
    { id: `${day}-v`, title: 'Vocabulary Builder', type: 'vocabulary', minutes: 10, done: i < 3 },
    { id: `${day}-i`, title: 'Interview Simulation', type: 'interview', minutes: 15, done: false },
  ],
}));

export const vocabWords: VocabWord[] = [
  { id: 'v1', word: 'Articulate', meaning: 'Able to express thoughts and ideas clearly and effectively.', example: 'She gave an articulate explanation of the project timeline.', difficulty: 'Medium', phonetic: '/ɑːrˈtɪkjəleɪt/', learned: true },
  { id: 'v2', word: 'Concise', meaning: 'Giving information clearly, in few words.', example: 'Keep your interview answers concise and relevant.', difficulty: 'Easy', phonetic: '/kənˈsaɪs/', learned: true },
  { id: 'v3', word: 'Ambiguous', meaning: 'Open to more than one interpretation; not clear.', example: 'The instructions were too ambiguous to follow.', difficulty: 'Medium', phonetic: '/æmˈbɪɡjuəs/', learned: false },
  { id: 'v4', word: 'Resilience', meaning: 'The capacity to recover quickly from difficulties.', example: 'Resilience helped her bounce back after a tough interview.', difficulty: 'Medium', phonetic: '/rɪˈzɪliəns/', learned: false },
  { id: 'v5', word: 'Meticulous', meaning: 'Showing great attention to detail; very careful.', example: 'He is meticulous about proofreading his reports.', difficulty: 'Difficult', phonetic: '/məˈtɪkjələs/', learned: false },
  { id: 'v6', word: 'Pragmatic', meaning: 'Dealing with things sensibly and realistically.', example: 'We need a pragmatic approach to solve this bug.', difficulty: 'Difficult', phonetic: '/præɡˈmætɪk/', learned: false },
  { id: 'v7', word: 'Collaborate', meaning: 'To work jointly with others on an activity.', example: 'Our team collaborates closely with the design department.', difficulty: 'Easy', phonetic: '/kəˈlæbəreɪt/', learned: true },
  { id: 'v8', word: 'Versatile', meaning: 'Able to adapt to many different functions.', example: 'A versatile communicator adjusts tone to the audience.', difficulty: 'Medium', phonetic: '/ˈvɜːrsətaɪl/', learned: false },
];

export const grammarQuestions: GrammarQuestion[] = [
  {
    id: 'g1',
    type: 'fill-blank',
    prompt: 'By the time I arrived, the meeting ____ already started.',
    answer: 'had',
    explanation: 'Use past perfect ("had started") for an action completed before another past action.',
    weakness: 'Tense Consistency',
  },
  {
    id: 'g2',
    type: 'multiple-choice',
    prompt: 'Choose the correct sentence:',
    options: [
      'Neither of the candidates were prepared.',
      'Neither of the candidates was prepared.',
      'Neither of the candidates being prepared.',
      'Neither of the candidate were prepared.',
    ],
    answer: 'Neither of the candidates was prepared.',
    explanation: '"Neither" is singular, so it takes a singular verb ("was").',
    weakness: 'Subject-Verb Agreement',
  },
  {
    id: 'g3',
    type: 'correct-sentence',
    prompt: 'Correct the sentence: "She don\'t have no experience in public speaking."',
    answer: "She doesn't have any experience in public speaking.",
    explanation: 'Avoid double negatives; use "doesn\'t" with third person singular and "any" instead of "no".',
    weakness: 'Negation Errors',
  },
  {
    id: 'g4',
    type: 'rewrite',
    prompt: 'Rewrite more formally: "The report was kinda late because we messed up the schedule."',
    answer: 'The report was delayed due to a scheduling error.',
    explanation: 'Formal writing avoids casual fillers like "kinda" and "messed up".',
    weakness: 'Formality & Tone',
  },
];

export const interviewCategories: InterviewCategory[] = [
  { id: 'hr', title: 'HR Interview', description: 'General fit, motivation and background questions.', questions: 8, duration: '15 min', difficulty: 'Easy' },
  { id: 'technical', title: 'Technical Interview', description: 'Role-specific technical and problem-solving questions.', questions: 6, duration: '25 min', difficulty: 'Hard' },
  { id: 'behavioral', title: 'Behavioral Interview', description: 'STAR-format questions about past experiences.', questions: 6, duration: '20 min', difficulty: 'Medium' },
  { id: 'resume', title: 'Resume-based Interview', description: 'Deep dive questions based on your resume.', questions: 5, duration: '15 min', difficulty: 'Medium' },
  { id: 'mock', title: 'Full Mock Interview', description: 'End-to-end simulation across all rounds.', questions: 15, duration: '40 min', difficulty: 'Hard' },
];

export const achievements: Achievement[] = [
  { id: 'a1', title: '7 Day Streak', description: 'Practiced for 7 consecutive days.', icon: 'flame', unlocked: true, progress: 7, target: 7, tier: 'bronze' },
  { id: 'a2', title: '100 Words Learned', description: 'Mastered 100 vocabulary words.', icon: 'book-open', unlocked: false, progress: 62, target: 100, tier: 'silver' },
  { id: 'a3', title: 'First Interview', description: 'Completed your first mock interview.', icon: 'briefcase', unlocked: true, progress: 1, target: 1, tier: 'bronze' },
  { id: 'a4', title: '10 Speaking Sessions', description: 'Completed 10 voice practice sessions.', icon: 'mic', unlocked: true, progress: 10, target: 10, tier: 'silver' },
  { id: 'a5', title: 'Grammar Master', description: 'Scored 90+ on grammar 5 times.', icon: 'graduation-cap', unlocked: false, progress: 2, target: 5, tier: 'gold' },
  { id: 'a6', title: 'Fluency Improvement', description: 'Improved fluency score by 20 points.', icon: 'trending-up', unlocked: false, progress: 14, target: 20, tier: 'gold' },
  { id: 'a7', title: '30 Day Streak', description: 'Practiced for 30 consecutive days.', icon: 'flame', unlocked: false, progress: 12, target: 30, tier: 'platinum' },
  { id: 'a8', title: 'Confidence Champion', description: 'Reached 85+ confidence score.', icon: 'shield', unlocked: false, progress: 69, target: 85, tier: 'gold' },
];

export const testimonials: Testimonial[] = [
  { id: 'te1', name: 'Rahul Verma', role: 'Final Year, NIT Trichy', quote: 'The adaptive exercises actually target what I struggle with. My filler words dropped massively in a month.', score: 92 },
  { id: 'te2', name: 'Priya Nair', role: 'MBA Candidate, IIM Bangalore', quote: 'The mock interview simulator feels shockingly real. I walked into my internship interview far more confident.', score: 88 },
  { id: 'te3', name: 'Devansh Gupta', role: 'B.Tech, VIT Vellore', quote: 'I love that no two days give me the same exercises — it always feels tailored to what I need to fix.', score: 85 },
  { id: 'te4', name: 'Sara Khan', role: 'Placement Cell, Delhi University', quote: 'We rolled this out to 400 students before placement season. Average communication scores rose by 22%.', score: 90 },
];

export const adminStudents: AdminStudentRow[] = [
  { id: 's1', name: 'Ananya Sharma', email: 'ananya.sharma@example.edu', score: 74, progress: 82, lastActive: '2 hours ago', status: 'Active' },
  { id: 's2', name: 'Rahul Verma', email: 'rahul.verma@example.edu', score: 92, progress: 95, lastActive: '1 day ago', status: 'Active' },
  { id: 's3', name: 'Priya Nair', email: 'priya.nair@example.edu', score: 88, progress: 90, lastActive: '3 hours ago', status: 'Active' },
  { id: 's4', name: 'Devansh Gupta', email: 'devansh.gupta@example.edu', score: 65, progress: 48, lastActive: '5 days ago', status: 'At Risk' },
  { id: 's5', name: 'Sara Khan', email: 'sara.khan@example.edu', score: 90, progress: 88, lastActive: '6 hours ago', status: 'Active' },
  { id: 's6', name: 'Karan Mehta', email: 'karan.mehta@example.edu', score: 40, progress: 20, lastActive: '2 weeks ago', status: 'Inactive' },
  { id: 's7', name: 'Neha Joshi', email: 'neha.joshi@example.edu', score: 77, progress: 70, lastActive: '1 hour ago', status: 'Active' },
  { id: 's8', name: 'Arjun Rao', email: 'arjun.rao@example.edu', score: 58, progress: 42, lastActive: '4 days ago', status: 'At Risk' },
];

export const adminGrowth = [
  { month: 'Apr', users: 420 }, { month: 'May', users: 610 }, { month: 'Jun', users: 890 },
  { month: 'Jul', users: 1240 }, { month: 'Aug', users: 1680 }, { month: 'Sep', users: 2140 },
];

export const adminActivity = [
  { day: 'Mon', sessions: 320 }, { day: 'Tue', sessions: 280 }, { day: 'Wed', sessions: 410 },
  { day: 'Thu', sessions: 390 }, { day: 'Fri', sessions: 460 }, { day: 'Sat', sessions: 210 }, { day: 'Sun', sessions: 260 },
];

export const strengths = ['Strong vocabulary usage in formal contexts', 'Clear sentence structure in written answers', 'Good pronunciation of technical terms'];
export const improvementAreas = ['Frequent filler words ("um", "like") during speaking', 'Speaking pace is slightly too fast under pressure', 'Grammar consistency in past/present tense switching'];
export const recommendations = [
  'Practice the "pause instead of filler" technique in 3 voice sessions this week',
  'Try the Fluency Practice pacing drill to slow down by ~15%',
  'Complete the Tense Consistency grammar module (12 questions)',
];
