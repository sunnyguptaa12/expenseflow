import { RANGES } from '../utils/constants.js';
import { Select } from './ui.jsx';

export default function RangeFilter({ value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-44"><Select aria-label="Date range" value={value.range} options={RANGES} onChange={(e) => onChange({ ...value, range: e.target.value })} /></div>
      {value.range === 'custom' && (
        <>
          <input type="date" className="input w-40" aria-label="Start date" value={value.from || ''} max={value.to || undefined} onChange={(e) => onChange({ ...value, from: e.target.value })} />
          <input type="date" className="input w-40" aria-label="End date" value={value.to || ''} min={value.from || undefined} onChange={(e) => onChange({ ...value, to: e.target.value })} />
        </>
      )}
    </div>
  );
}

// Custom ranges are only sent once both dates exist.
export const rangeParams = (v) => (v.range === 'custom' ? (v.from && v.to ? { range: 'custom', from: v.from, to: v.to } : null) : { range: v.range });
