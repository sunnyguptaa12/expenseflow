import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { endpoints } from '../services/api.js';
import { Field, Spinner } from '../components/ui.jsx';

const emailRules = { required: 'Email is required.', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address.' } };
const passwordRules = { required: 'Password is required.', minLength: { value: 8, message: 'Password must be at least 8 characters.' }, validate: (v) => (/[A-Za-z]/.test(v) && /\d/.test(v)) || 'Use at least one letter and one number.' };

function PasswordInput({ register, name = 'password', rules = passwordRules, autoComplete, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} className="input pr-11" autoComplete={autoComplete} placeholder={placeholder} {...register(name, rules)} />
      <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-400 hover:text-ink-700" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
    </div>
  );
}

const Submit = ({ busy, children }) => <button className="btn-primary w-full py-3" disabled={busy}>{busy && <Spinner className="h-4 w-4" />}{children}</button>;
const Heading = ({ title, sub }) => (<div className="mb-8"><h1 className="text-3xl font-extrabold tracking-tight">{title}</h1><p className="mt-2 text-ink-500 dark:text-ink-400">{sub}</p></div>);

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues: { remember: true } });
  const onSubmit = async (values) => {
    try { await login(values); navigate(location.state?.from || '/dashboard', { replace: true }); } catch (e) { toast.error(e.message); }
  };
  return (
    <>
      <Heading title="Welcome back" sub="Sign in to continue to ExpenseFlow." />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Field label="Email" error={errors.email?.message}><input type="email" className="input" autoComplete="email" placeholder="you@example.com" {...register('email', emailRules)} /></Field>
        <Field label="Password" error={errors.password?.message}><PasswordInput register={register} rules={{ required: 'Password is required.' }} autoComplete="current-password" /></Field>
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 font-medium"><input type="checkbox" className="h-4 w-4 rounded accent-brand-600" {...register('remember')} />Keep me signed in</label>
          <Link to="/forgot-password" className="font-semibold text-brand-600 hover:underline">Forgot password?</Link>
        </div>
        <Submit busy={isSubmitting}>Sign in</Submit>
        <p className="text-center text-sm text-ink-500">New to ExpenseFlow? <Link to="/register" className="font-semibold text-brand-600 hover:underline">Create an account</Link></p>
      </form>
    </>
  );
}

export function Register() {
  const { register: signUp } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();
  const onSubmit = async ({ name, email, password }) => {
    try { await signUp({ name, email, password }); toast.success('Account created. Welcome to ExpenseFlow!'); navigate('/dashboard', { replace: true }); } catch (e) { toast.error(e.message); }
  };
  return (
    <>
      <Heading title="Create your account" sub="Start tracking your money in under a minute." />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Field label="Full name" error={errors.name?.message}><input className="input" autoComplete="name" {...register('name', { required: 'Name is required.', minLength: { value: 2, message: 'Name must be at least 2 characters.' } })} /></Field>
        <Field label="Email" error={errors.email?.message}><input type="email" className="input" autoComplete="email" {...register('email', emailRules)} /></Field>
        <Field label="Password" error={errors.password?.message} hint="At least 8 characters with a letter and a number."><PasswordInput register={register} autoComplete="new-password" /></Field>
        <Field label="Confirm password" error={errors.confirm?.message}><PasswordInput register={register} name="confirm" autoComplete="new-password" rules={{ required: 'Confirm your password.', validate: (v) => v === watch('password') || 'Passwords do not match.' }} /></Field>
        <Submit busy={isSubmitting}>Create account</Submit>
        <p className="text-center text-sm text-ink-500">Already have an account? <Link to="/login" className="font-semibold text-brand-600 hover:underline">Sign in</Link></p>
      </form>
    </>
  );
}

export function ForgotPassword() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [result, setResult] = useState(null);
  const onSubmit = async (values) => {
    try { const res = await endpoints.auth.forgot(values); setResult(res); } catch (e) { toast.error(e.message); }
  };
  return (
    <>
      <Heading title="Reset your password" sub="Enter your email and we'll send you a reset link." />
      {result ? (
        <div className="space-y-4 rounded-2xl bg-brand-50 p-5 text-sm dark:bg-brand-900/20">
          <p className="font-semibold">{result.message}</p>
          {result.data?.devResetUrl && <p className="break-all text-ink-600 dark:text-ink-300">Development mode: <a className="font-semibold text-brand-600 underline" href={result.data.devResetUrl}>open reset link</a></p>}
          <Link to="/login" className="inline-block font-semibold text-brand-600 hover:underline">Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <Field label="Email" error={errors.email?.message}><input type="email" className="input" {...register('email', emailRules)} /></Field>
          <Submit busy={isSubmitting}>Send reset link</Submit>
          <p className="text-center text-sm"><Link to="/login" className="font-semibold text-brand-600 hover:underline">Back to sign in</Link></p>
        </form>
      )}
    </>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();
  const onSubmit = async ({ password }) => {
    try { await endpoints.auth.reset({ token: params.get('token'), password }); toast.success('Password reset. Please sign in.'); navigate('/login', { replace: true }); } catch (e) { toast.error(e.message); }
  };
  if (!params.get('token')) return <Heading title="Invalid link" sub="This reset link is missing its token. Request a new one from the sign-in page." />;
  return (
    <>
      <Heading title="Choose a new password" sub="You'll be signed out of all other devices." />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Field label="New password" error={errors.password?.message}><PasswordInput register={register} autoComplete="new-password" /></Field>
        <Field label="Confirm new password" error={errors.confirm?.message}><PasswordInput register={register} name="confirm" autoComplete="new-password" rules={{ required: 'Confirm your password.', validate: (v) => v === watch('password') || 'Passwords do not match.' }} /></Field>
        <Submit busy={isSubmitting}>Reset password</Submit>
      </form>
    </>
  );
}
