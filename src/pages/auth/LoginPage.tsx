import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
      await authService.login(values);
      login();
      showToast({ title: 'Welcome back!', description: 'Logged in successfully.', variant: 'success' });
      navigate('/app/dashboard');
    } catch {
      showToast({ title: 'Login failed', description: 'Please check your credentials.', variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setSubmitting(true);
    await authService.loginWithGoogle();
    login();
    showToast({ title: 'Welcome back!', variant: 'success' });
    navigate('/app/dashboard');
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
          <a href="#" className="text-sm font-medium text-accent-400 hover:text-accent-300">
            Forgot password?
          </a>
        </div>

        <Button type="submit" className="w-full" loading={submitting}>
          Log In
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-base-700" />
        <span className="text-xs text-base-500">OR</span>
        <div className="h-px flex-1 bg-base-700" />
      </div>

      <Button variant="secondary" className="w-full" onClick={handleGoogleLogin} disabled={submitting}>
        <svg className="size-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85A11 11 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.09V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Continue with Google
      </Button>

      <p className="mt-8 text-center text-sm text-base-400">
        Don't have an account?{' '}
        <Link to="/signup" className="font-medium text-accent-400 hover:text-accent-300">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
