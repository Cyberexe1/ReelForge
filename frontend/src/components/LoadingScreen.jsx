import { useEffect, useState } from 'react';

/**
 * Generation is two sequential model calls, so this covers real seconds of wait.
 * The stages are indicative, not a live progress feed from the backend.
 */
const STAGES = [
  'Reading your memory',
  'Casting the characters',
  'Writing the synopsis',
  'Cutting the trailer',
  'Painting the poster',
];

export function LoadingScreen() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStage((current) => Math.min(current + 1, STAGES.length - 1));
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center"
    >
      <div className="relative flex size-16 items-center justify-center">
        <span className="absolute inset-0 animate-glow rounded-full bg-gradient-to-br from-forge to-ember blur-xl" />
        <span className="size-16 animate-spin rounded-full border-2 border-line border-t-forge" />
      </div>

      <p className="mt-8 font-display text-3xl tracking-wide text-chalk">Forging your movie</p>

      <ul className="mt-6 space-y-2">
        {STAGES.map((label, index) => (
          <li
            key={label}
            className={[
              'text-sm transition-colors duration-500',
              index < stage ? 'text-mist/60' : index === stage ? 'text-forge' : 'text-mist/25',
            ].join(' ')}
          >
            {label}
          </li>
        ))}
      </ul>

      <p className="mt-8 max-w-xs text-xs text-mist">
        Two model calls, one poster. This usually takes twenty to forty seconds.
      </p>
    </div>
  );
}
