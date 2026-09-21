import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, CheckCircle2 } from 'lucide-react';
import { Button, Input, Select } from '@/components/ui';
import { AuthLayout } from './AuthLayout';
import { PasswordStrength } from '@/components/shared/PasswordStrength';
import { authService } from '@/services/authService';
import { useAuth } from '@/hooks/useAuth';

const schema = z
  .object({
    fullName: z.string().min(2, 'Enter your full name'),
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string(),
    college: z.string().min(2, 'College / university is required'),
    course: z.string().min(2, 'Course is required'),
    year: z.string().min(1, 'Select your year'),
    careerGoal: z.string().min(1, 'Select a career goal'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

const yearOptions = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgraduate'].map((y) => ({ label: y, value: y }));
const goalOptions = [
  'Software Engineer',
  'Data Analyst / Scientist',
  'Product Manager',
  'Consulting',
  'Government / Civil Services',
  'Higher Studies',
].map((g) => ({ label: g, value: g }));

export default function SignupPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const password = watch('password') ?? '';

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    await authService.signup(values);
    login();
    setSubmitting(false);
    setSuccess(true);
  };

  if (success) {
    return (
      <AuthLayout tagline="Your journey starts now.">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-success-500/15 text-success-400">
            <CheckCircle2 className="size-8" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-base-50">Account created!</h1>
          <p className="mt-2 text-sm text-base-300">Let's set up your personalized learning profile in a few quick steps.</p>
          <Button className="mt-8 w-full" onClick={() => navigate('/onboarding')}>
            Continue to Onboarding
          </Button>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout tagline="Join thousands building stronger communication.">
      <h1 className="font-display text-2xl font-semibold text-base-50">Create your account</h1>
      <p className="mt-1.5 text-sm text-base-300">Start with a free personalized assessment.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
        <Input label="Full Name" placeholder="Ananya Sharma" icon={<User className="size-4" />} error={errors.fullName?.message} {...register('fullName')} />
        <Input label="Email" type="email" placeholder="you@example.com" icon={<Mail className="size-4" />} error={errors.email?.message} {...register('email')} />
        <div>
          <Input label="Password" type="password" placeholder="••••••••" icon={<Lock className="size-4" />} error={errors.password?.message} {...register('password')} />
          <PasswordStrength password={password} />
        </div>
        <Input label="Confirm Password" type="password" placeholder="••••••••" icon={<Lock className="size-4" />} error={errors.confirmPassword?.message} {...register('confirmPassword')} />
        <Input label="College / University" placeholder="Vellore Institute of Technology" error={errors.college?.message} {...register('college')} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Course" placeholder="B.Tech CSE" error={errors.course?.message} {...register('course')} />
          <Select label="Year" placeholder="Select year" options={yearOptions} error={errors.year?.message} {...register('year')} />
        </div>
        <Select label="Career Goal" placeholder="Select a goal" options={goalOptions} error={errors.careerGoal?.message} {...register('careerGoal')} />

        <Button type="submit" className="w-full" loading={submitting}>
          Create Account
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-base-400">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-accent-400 hover:text-accent-300">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
