import { useRef, useState } from 'react';
import { User, SlidersHorizontal, ShieldCheck, Palette, Sun, Moon, Monitor, Camera, LogOut } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { endpoints, tokenStore } from '../services/api.js';
import { CURRENCIES, DATE_FORMATS } from '../utils/constants.js';
import { PageHeader, Field, Select, Spinner, ConfirmDialog } from '../components/ui.jsx';
import Avatar from '../components/Avatar.jsx';

const TABS = [{ id: 'profile', label: 'Profile', icon: User }, { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal }, { id: 'security', label: 'Security', icon: ShieldCheck }, { id: 'appearance', label: 'Appearance', icon: Palette }];
const Section = ({ title, children }) => <div className="card max-w-2xl"><h2 className="mb-5 text-lg font-bold">{title}</h2>{children}</div>;

function Profile() {
  const { user, setUser } = useAuth();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm({ defaultValues: { name: user.name, email: user.email } });

  const save = async (v) => { try { const res = await endpoints.users.update(v); setUser(res.data.user); toast.success(res.message); } catch (e) { toast.error(e.message); } };
  const pick = async (e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    if (!/\.(jpe?g|png|webp)$/i.test(file.name)) return toast.error('Profile image must be a JPG, PNG or WebP file.');
    if (file.size > 2 * 1024 * 1024) return toast.error('File size exceeds the allowed limit.');
    setUploading(true);
    try { const res = await endpoints.users.uploadAvatar(file); setUser({ ...res.data.user }); toast.success(res.message); } catch (err) { toast.error(err.message); } finally { setUploading(false); }
  };
  const removeImage = async () => { try { const res = await endpoints.users.removeAvatar(); setUser(res.data.user); toast.success(res.message); } catch (e) { toast.error(e.message); } };

  return (
    <Section title="Profile">
      <div className="mb-6 flex items-center gap-4">
        <div className="relative"><Avatar user={user} size="h-20 w-20" text="text-2xl" />{uploading && <div className="absolute inset-0 grid place-items-center rounded-full bg-ink-950/50 text-white"><Spinner /></div>}</div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={pick} />
          <button className="btn-secondary" onClick={() => fileRef.current.click()} disabled={uploading}><Camera className="h-4 w-4" />Change photo</button>
          {user.profileImage && <button className="btn-ghost text-rose-600" onClick={removeImage}>Remove</button>}
        </div>
      </div>
      <form onSubmit={handleSubmit(save)} className="space-y-4" noValidate>
        <Field label="Full name" error={errors.name?.message}><input className="input" {...register('name', { required: 'Name is required.', minLength: { value: 2, message: 'Name must be at least 2 characters.' } })} /></Field>
        <Field label="Email" error={errors.email?.message}><input type="email" className="input" {...register('email', { required: 'Email is required.', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address.' } })} /></Field>
        <button className="btn-primary" disabled={isSubmitting || !isDirty}>{isSubmitting && <Spinner className="h-4 w-4" />}Save changes</button>
      </form>
    </Section>
  );
}

function Preferences() {
  const { user, setUser } = useAuth();
  const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['Asia/Kolkata', 'UTC'];
  const { register, handleSubmit, formState: { isSubmitting, isDirty } } = useForm({ defaultValues: { currency: user.currency, dateFormat: user.dateFormat, timezone: user.timezone } });
  const save = async (v) => { try { const res = await endpoints.users.update(v); setUser(res.data.user); toast.success('Preferences saved.'); } catch (e) { toast.error(e.message); } };
  return (
    <Section title="Preferences">
      <form onSubmit={handleSubmit(save)} className="space-y-4">
        <Field label="Currency"><Select options={CURRENCIES} {...register('currency')} /></Field>
        <Field label="Date format"><Select options={DATE_FORMATS} {...register('dateFormat')} /></Field>
        <Field label="Timezone"><Select options={zones.includes(user.timezone) ? zones : [user.timezone, ...zones]} {...register('timezone')} /></Field>
        <button className="btn-primary" disabled={isSubmitting || !isDirty}>{isSubmitting && <Spinner className="h-4 w-4" />}Save preferences</button>
      </form>
    </Section>
  );
}

function Security() {
  const { logout, clearSession } = useAuth();
  const [confirm, setConfirm] = useState(false);
  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm();
  const change = async ({ currentPassword, newPassword }) => {
    try {
      const res = await endpoints.auth.changePassword({ currentPassword, newPassword });
      const remembered = Boolean(localStorage.getItem('ef_token'));
      tokenStore.set(res.data.token, remembered);
      toast.success(res.message); reset();
    } catch (e) { toast.error(e.message); }
  };
  const logoutAll = async () => { try { await endpoints.users.logoutAll(); toast.success('Logged out from all devices.'); clearSession(); } catch (e) { toast.error(e.message); } };
  return (
    <div className="space-y-6">
      <Section title="Change password">
        <form onSubmit={handleSubmit(change)} className="space-y-4" noValidate>
          <Field label="Current password" error={errors.currentPassword?.message}><input type="password" autoComplete="current-password" className="input" {...register('currentPassword', { required: 'Current password is required.' })} /></Field>
          <Field label="New password" error={errors.newPassword?.message} hint="At least 8 characters with a letter and a number."><input type="password" autoComplete="new-password" className="input" {...register('newPassword', { required: 'New password is required.', minLength: { value: 8, message: 'Password must be at least 8 characters.' }, validate: (v) => (/[A-Za-z]/.test(v) && /\d/.test(v)) || 'Use at least one letter and one number.' })} /></Field>
          <Field label="Confirm new password" error={errors.confirm?.message}><input type="password" autoComplete="new-password" className="input" {...register('confirm', { validate: (v) => v === watch('newPassword') || 'Passwords do not match.' })} /></Field>
          <button className="btn-primary" disabled={isSubmitting}>{isSubmitting && <Spinner className="h-4 w-4" />}Update password</button>
        </form>
      </Section>
      <Section title="Sessions">
        <p className="mb-4 text-sm text-ink-600 dark:text-ink-300">Signed in somewhere you don't recognise, or on a shared device? Log out everywhere, including this browser.</p>
        <div className="flex flex-wrap gap-3"><button className="btn-secondary" onClick={logout}><LogOut className="h-4 w-4" />Logout</button><button className="btn-danger" onClick={() => setConfirm(true)}>Logout from all devices</button></div>
      </Section>
      <ConfirmDialog open={confirm} title="Logout from all devices?" message="Every session, including this one, will be signed out. You'll need to sign in again." confirmLabel="Logout everywhere" onConfirm={logoutAll} onCancel={() => setConfirm(false)} />
    </div>
  );
}

function Appearance() {
  const { theme, setTheme } = useTheme();
  const options = [['light', 'Light', Sun], ['dark', 'Dark', Moon], ['system', 'System', Monitor]];
  return (
    <Section title="Appearance">
      <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Theme">
        {options.map(([id, label, Icon]) => (
          <button key={id} role="radio" aria-checked={theme === id} onClick={() => setTheme(id)} className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-5 font-semibold transition ${theme === id ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300' : 'border-ink-200 hover:border-ink-300 dark:border-ink-700'}`}><Icon className="h-6 w-6" />{label}</button>))}
      </div>
      <p className="mt-4 text-sm text-ink-500">System follows your device's light or dark setting automatically.</p>
    </Section>
  );
}

export default function Settings() {
  const [tab, setTab] = useState('profile');
  const View = { profile: Profile, preferences: Preferences, security: Security, appearance: Appearance }[tab];
  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your account and preferences." />
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-ink-100 dark:border-ink-800" role="tablist">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${tab === id ? 'border-brand-600 text-brand-700 dark:text-brand-300' : 'border-transparent text-ink-500'}`}><Icon className="h-4 w-4" />{label}</button>))}
      </div>
      <View />
    </>
  );
}
