import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { AuthLayout } from './AuthLayout';
import { authService } from '@/services/authService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  remember: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { remember: true } });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const result = await authService.login(values);
      login(result.token);
      showToast({
        title: 'Welcome back!',
        description: 'Logged in successfully.',
        variant: 'success',
      });
      navigate('/app/dashboard');
    } catch (error) {
      const detail = axios.isAxiosError(error) ? (error.response?.data as { detail?: string } | undefined)?.detail : undefined;
      const msg = detail ?? (axios.isAxiosError(error) && !error.response
        ? 'Backend is unreachable. Please try again in a moment (it may be waking up).'
        : 'Please check your credentials.');
      showToast({ title: 'Login failed', description: msg, variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    showToast({
      title: 'Password reset not available in this demo',
      description: 'This is a portfolio project without an email service — sign up for a new account instead.',
      variant: 'info',
    });
  };

  return (
    <AuthLayout tagline="Practice smarter, not harder.">
      <h1 className="font-display text-2xl font-semibold text-base-50">Welcome back</h1>
      <p className="mt-1.5 text-sm text-base-300">Log in to continue your personalized practice.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
        <Input label="Email" type="email" placeholder="you@example.com" icon={<Mail className="size-4" />} error={errors.email?.message} {...register('email')} />
        <Input label="Password" type="password" placeholder="••••••••" icon={<Lock className="size-4" />} error={errors.password?.message} {...register('password')} />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-base-300">
            <input type="checkbox" className="size-4 rounded border-base-500 bg-base-800 accent-accent-500" {...register('remember')} />
            Remember me
          </label>
          <button type="button" onClick={handleForgotPassword} className="text-sm font-medium text-accent-400 hover:text-accent-300">
            Forgot password?
          </button>
        </div>

        <Button type="submit" className="w-full" loading={submitting}>
          Log In
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-base-400">
        Don't have an account?{' '}
        <Link to="/signup" className="font-medium text-accent-400 hover:text-accent-300">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
