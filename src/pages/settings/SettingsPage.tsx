import { useEffect, useState } from 'react';
import axios from 'axios';
import { User, Palette, Bell, Mic, Shield, Lock, Sun, Moon } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select, Switch } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useToast } from '@/hooks/useToast';
import { studentService } from '@/services/studentService';
import { authService } from '@/services/authService';
import { cn } from '@/lib/utils';

const sections = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'voice', label: 'Voice Settings', icon: Mic },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'security', label: 'Security', icon: Lock },
];

const languageOptions = ['English (US)', 'English (UK)', 'Hindi', 'Spanish'].map((l) => ({ label: l, value: l }));

export default function SettingsPage() {
  const [active, setActive] = useState('account');
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [language, setLanguage] = useLocalStorage('settings:language', 'English (US)');
  const [savingAccount, setSavingAccount] = useState(false);

  const [notifications, setNotifications] = useLocalStorage('settings:notifications', {
    dailyReminders: true, weeklySummary: true, achievementAlerts: true, productUpdates: false,
  });
  const [privacy, setPrivacy] = useLocalStorage('settings:privacy', { shareProgress: false, allowDataForImprovement: true });
  const [voiceSettings, setVoiceSettings] = useLocalStorage('settings:voice', { autoTranscribe: true, noiseReduction: true, sensitivity: 'Medium' });

  useEffect(() => {
    studentService.getProfile().then((p) => {
      setFullName(p.name);
      setEmail(p.email);
    });
  }, []);

  const saveAccount = async () => {
    setSavingAccount(true);
    await studentService.updateProfile({ name: fullName });
    setSavingAccount(false);
    showToast({ title: 'Settings saved', variant: 'success' });
  };

  const save = () => showToast({ title: 'Settings saved', description: 'Stored on this device.', variant: 'success' });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const updatePassword = async () => {
    if (newPassword.length < 8) {
      showToast({ title: 'Password too short', description: 'Use at least 8 characters.', variant: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast({ title: "Passwords don't match", variant: 'error' });
      return;
    }
    setChangingPassword(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      showToast({ title: 'Password updated', variant: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      const detail = axios.isAxiosError(error) ? (error.response?.data as { detail?: string } | undefined)?.detail : undefined;
      showToast({ title: "Couldn't update password", description: detail ?? 'Please try again.', variant: 'error' });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Account" title="Settings" description="Manage your account, appearance and privacy preferences." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={cn(
                'flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                active === s.id ? 'bg-accent-500/15 text-accent-300' : 'text-base-300 hover:bg-white/5',
              )}
            >
              <s.icon className="size-4.5" /> {s.label}
            </button>
          ))}
        </div>

        <div>
          {active === 'account' && (
            <Card>
              <CardHeader><CardTitle>Account Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  <Input label="Email" value={email} type="email" disabled />
                </div>
                <Select label="Preferred Language" options={languageOptions} value={language} onChange={(e) => setLanguage(e.target.value)} />
                <div className="flex justify-end"><Button onClick={saveAccount} loading={savingAccount}>Save Changes</Button></div>
              </CardContent>
            </Card>
          )}

          {active === 'appearance' && (
            <Card>
              <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setTheme('dark')}
                    className={cn('flex flex-col items-center gap-2 rounded-xl border p-5', theme === 'dark' ? 'border-accent-400 bg-accent-500/10' : 'border-base-600')}
                  >
                    <Moon className="size-5 text-base-100" />
                    <span className="text-sm font-medium text-base-100">Dark Mode</span>
                  </button>
                  <button
                    onClick={() => setTheme('light')}
                    className={cn('flex flex-col items-center gap-2 rounded-xl border p-5', theme === 'light' ? 'border-accent-400 bg-accent-500/10' : 'border-base-600')}
                  >
                    <Sun className="size-5 text-base-100" />
                    <span className="text-sm font-medium text-base-100">Light Mode</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {active === 'notifications' && (
            <Card>
              <CardHeader><CardTitle>Notification Preferences</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <Switch label="Daily practice reminders" description="Get a nudge if you haven't practiced today." checked={notifications.dailyReminders} onChange={(v) => setNotifications((p) => ({ ...p, dailyReminders: v }))} />
                <Switch label="Weekly progress summary" description="A recap of your improvement every Sunday." checked={notifications.weeklySummary} onChange={(v) => setNotifications((p) => ({ ...p, weeklySummary: v }))} />
                <Switch label="Achievement alerts" description="Notify me when I unlock a new achievement." checked={notifications.achievementAlerts} onChange={(v) => setNotifications((p) => ({ ...p, achievementAlerts: v }))} />
                <Switch label="Product updates" description="News about new features and improvements." checked={notifications.productUpdates} onChange={(v) => setNotifications((p) => ({ ...p, productUpdates: v }))} />
                <div className="flex justify-end"><Button onClick={save}>Save Changes</Button></div>
              </CardContent>
            </Card>
          )}

          {active === 'voice' && (
            <Card>
              <CardHeader><CardTitle>Voice Settings</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <Switch label="Auto-transcribe recordings" description="Automatically generate a transcript after recording." checked={voiceSettings.autoTranscribe} onChange={(v) => setVoiceSettings((p) => ({ ...p, autoTranscribe: v }))} />
                <Switch label="Background noise reduction" description="Reduce ambient noise during voice practice." checked={voiceSettings.noiseReduction} onChange={(v) => setVoiceSettings((p) => ({ ...p, noiseReduction: v }))} />
                <Select
                  label="Microphone Sensitivity"
                  options={['Low', 'Medium', 'High'].map((s) => ({ label: s, value: s }))}
                  value={voiceSettings.sensitivity}
                  onChange={(e) => setVoiceSettings((p) => ({ ...p, sensitivity: e.target.value }))}
                />
                <div className="flex justify-end"><Button onClick={save}>Save Changes</Button></div>
              </CardContent>
            </Card>
          )}

          {active === 'privacy' && (
            <Card>
              <CardHeader><CardTitle>Privacy</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <Switch label="Share progress with my institution" description="Allow your college placement cell to view your progress." checked={privacy.shareProgress} onChange={(v) => setPrivacy((p) => ({ ...p, shareProgress: v }))} />
                <Switch label="Help improve the AI model" description="Allow anonymized session data to improve personalization." checked={privacy.allowDataForImprovement} onChange={(v) => setPrivacy((p) => ({ ...p, allowDataForImprovement: v }))} />
                <div className="flex justify-end"><Button onClick={save}>Save Changes</Button></div>
              </CardContent>
            </Card>
          )}

          {active === 'security' && (
            <Card>
              <CardHeader><CardTitle>Security</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Input label="Current Password" type="password" placeholder="••••••••" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                <Input label="New Password" type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <Input label="Confirm New Password" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                <div className="flex justify-end">
                  <Button onClick={updatePassword} loading={changingPassword} disabled={!currentPassword || !newPassword}>
                    Update Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
