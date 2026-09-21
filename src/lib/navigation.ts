import {
  LayoutDashboard,
  Mic,
  FileText,
  BookOpen,
  SpellCheck,
  Waves,
  Briefcase,
  CalendarDays,
  BarChart3,
  Trophy,
  Bot,
  User,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export const primaryNav: NavItem[] = [
  { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
  { label: 'Voice Practice', path: '/app/practice/voice', icon: Mic },
  { label: 'Text Practice', path: '/app/practice/text', icon: FileText },
  { label: 'Vocabulary', path: '/app/practice/vocabulary', icon: BookOpen },
  { label: 'Grammar', path: '/app/practice/grammar', icon: SpellCheck },
  { label: 'Fluency', path: '/app/practice/fluency', icon: Waves },
  { label: 'Interview', path: '/app/interview', icon: Briefcase },
  { label: 'Learning Plan', path: '/app/learning-plan', icon: CalendarDays },
  { label: 'Analytics', path: '/app/analytics', icon: BarChart3 },
  { label: 'Achievements', path: '/app/achievements', icon: Trophy },
  { label: 'AI Coach', path: '/app/coach', icon: Bot },
];

export const secondaryNav: NavItem[] = [
  { label: 'Profile', path: '/app/profile', icon: User },
  { label: 'Settings', path: '/app/settings', icon: Settings },
];

export const mobileNav: NavItem[] = [
  { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
  { label: 'Voice', path: '/app/practice/voice', icon: Mic },
  { label: 'Interview', path: '/app/interview', icon: Briefcase },
  { label: 'Analytics', path: '/app/analytics', icon: BarChart3 },
  { label: 'Profile', path: '/app/profile', icon: User },
];
