import { useBlobUrl } from '../hooks/useBlobUrl.js';
import { initials } from '../utils/format.js';

export default function Avatar({ user, size = 'h-9 w-9', text = 'text-sm' }) {
  const { url } = useBlobUrl(user?.profileImage ? '/users/profile-image' : null, { v: user?.profileImage });
  return url
    ? <img src={url} alt={user.name} className={`${size} rounded-full object-cover`} />
    : <div className={`${size} ${text} grid place-items-center rounded-full bg-brand-600 font-bold text-white`} aria-hidden="true">{initials(user?.name)}</div>;
}
