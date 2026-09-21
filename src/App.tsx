import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PublicShell } from '@/components/layout/PublicShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { PageLoader } from '@/components/shared/PageLoader';

const LandingPage = lazy(() => import('@/pages/landing/LandingPage'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const SignupPage = lazy(() => import('@/pages/auth/SignupPage'));
const OnboardingPage = lazy(() => import('@/pages/onboarding/OnboardingPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const CommunicationAnalysisPage = lazy(() => import('@/pages/analysis/CommunicationAnalysisPage'));
const VoicePracticePage = lazy(() => import('@/pages/practice/VoicePracticePage'));
const TextPracticePage = lazy(() => import('@/pages/practice/TextPracticePage'));
const VocabularyPracticePage = lazy(() => import('@/pages/practice/VocabularyPracticePage'));
const GrammarPracticePage = lazy(() => import('@/pages/practice/GrammarPracticePage'));
const FluencyPracticePage = lazy(() => import('@/pages/practice/FluencyPracticePage'));
const InterviewPracticePage = lazy(() => import('@/pages/interview/InterviewPracticePage'));
const InterviewResultPage = lazy(() => import('@/pages/interview/InterviewResultPage'));
const LearningPlanPage = lazy(() => import('@/pages/plan/LearningPlanPage'));
const AnalyticsPage = lazy(() => import('@/pages/analytics/AnalyticsPage'));
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const AICoachPage = lazy(() => import('@/pages/coach/AICoachPage'));
const AchievementsPage = lazy(() => import('@/pages/achievements/AchievementsPage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const PrivacyPolicyPage = lazy(() => import('@/pages/legal/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('@/pages/legal/TermsOfServicePage'));

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<PublicShell />}>
          <Route path="/" element={<LandingPage />} />
        </Route>

        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />

        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="analysis" element={<CommunicationAnalysisPage />} />
          <Route path="practice/voice" element={<VoicePracticePage />} />
          <Route path="practice/text" element={<TextPracticePage />} />
          <Route path="practice/vocabulary" element={<VocabularyPracticePage />} />
          <Route path="practice/grammar" element={<GrammarPracticePage />} />
          <Route path="practice/fluency" element={<FluencyPracticePage />} />
          <Route path="interview" element={<InterviewPracticePage />} />
          <Route path="interview/result" element={<InterviewResultPage />} />
          <Route path="learning-plan" element={<LearningPlanPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="coach" element={<AICoachPage />} />
          <Route path="achievements" element={<AchievementsPage />} />
          <Route path="admin" element={<AdminDashboardPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
