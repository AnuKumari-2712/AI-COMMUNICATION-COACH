import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pencil, GraduationCap, Building2, Calendar, Target, Award } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, Button, Modal, Input, Select, Badge } from '@/components/ui';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { studentService } from '@/services/studentService';
import { useToast } from '@/hooks/useToast';
import { currentStudent } from '@/data/mockData';
import type { StudentProfile } from '@/types';

const yearOptions = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgraduate'].map((y) => ({ label: y, value: y }));

interface FormValues {
  name: string;
  college: string;
  course: string;
  year: string;
  careerGoal: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<StudentProfile>(currentStudent);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { name: profile.name, college: profile.college, course: profile.course, year: profile.year, careerGoal: profile.careerGoal },
  });

  const openEdit = () => {
    reset({ name: profile.name, college: profile.college, course: profile.course, year: profile.year, careerGoal: profile.careerGoal });
    setEditOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    const updated = await studentService.updateProfile(values);
    setProfile(updated);
    setSaving(false);
    setEditOpen(false);
    showToast({ title: 'Profile updated', variant: 'success' });
  };

  const skillRows: { label: string; value: number }[] = [
    { label: 'Grammar', value: profile.scores.grammar },
    { label: 'Vocabulary', value: profile.scores.vocabulary },
    { label: 'Fluency', value: profile.scores.fluency },
    { label: 'Pronunciation', value: profile.scores.pronunciation },
    { label: 'Confidence', value: profile.scores.confidence },
  ];

  return (
    <div>
      <PageHeader eyebrow="Account" title="Student Profile" description="Your details, communication level and skill progress." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <img
              src={`https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(profile.name)}`}
              alt=""
              className="size-24 rounded-full bg-base-700 shadow-soft-md"
            />
            <h2 className="mt-4 font-display text-xl font-semibold text-base-50">{profile.name}</h2>
            <p className="text-sm text-base-400">{profile.email}</p>
            <Badge variant="accent" className="mt-3">{profile.currentLevel}</Badge>

            <div className="mt-6 w-full space-y-3 text-left">
              <div className="flex items-center gap-3 text-sm text-base-300">
                <Building2 className="size-4 shrink-0 text-base-500" /> {profile.college}
              </div>
              <div className="flex items-center gap-3 text-sm text-base-300">
                <GraduationCap className="size-4 shrink-0 text-base-500" /> {profile.course}
              </div>
              <div className="flex items-center gap-3 text-sm text-base-300">
                <Calendar className="size-4 shrink-0 text-base-500" /> {profile.year}
              </div>
              <div className="flex items-center gap-3 text-sm text-base-300">
                <Target className="size-4 shrink-0 text-base-500" /> {profile.careerGoal}
              </div>
            </div>

            <Button variant="outline" className="mt-6 w-full" onClick={openEdit}>
              <Pencil className="size-4" /> Edit Profile
            </Button>
          </div>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Skill Progress</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {skillRows.map((r) => (
                <ProgressBar key={r.label} label={r.label} value={r.value} showValue tone="accent" />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Practice History</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Mock HR Interview', date: 'Today', score: 82 },
                { label: 'Voice Practice — Speaking Prompt', date: 'Yesterday', score: 74 },
                { label: 'Grammar Drill — Tense Consistency', date: '2 days ago', score: 68 },
                { label: 'Vocabulary Session', date: '3 days ago', score: 91 },
              ].map((h) => (
                <div key={h.label} className="flex items-center justify-between rounded-xl border border-white/5 bg-base-800/60 p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-accent-500/15 text-accent-400">
                      <Award className="size-4.5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-base-50">{h.label}</p>
                      <p className="text-xs text-base-400">{h.date}</p>
                    </div>
                  </div>
                  <Badge variant={h.score >= 80 ? 'success' : h.score >= 60 ? 'warning' : 'danger'} size="sm">{h.score}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Profile" description="Update your personal and academic details.">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Full Name" {...register('name')} />
          <Input label="College / University" {...register('college')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Course" {...register('course')} />
            <Select label="Year" options={yearOptions} {...register('year')} />
          </div>
          <Input label="Career Goal" {...register('careerGoal')} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
