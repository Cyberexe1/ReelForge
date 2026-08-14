import { EXAMPLE_MEMORIES } from '../data/genres';
import { MEMORY_MAX, MEMORY_MIN } from '../services/api';

export function StoryInput({ value, onChange, disabled = false }) {
  const length = value.trim().length;
  const isTooLong = length > MEMORY_MAX;
  const remaining = MEMORY_MIN - length;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor="memory" className="text-sm font-semibold text-chalk">
          What's your story?
        </label>
        <span
          className={[
            'text-xs tabular-nums',
            isTooLong ? 'text-ember' : 'text-mist',
          ].join(' ')}
          aria-live="polite"
        >
          {length} / {MEMORY_MAX}
        </span>
      </div>

      <p className="mt-1 text-sm text-mist">
        A memory, an experience, or something entirely made up. Details help.
      </p>

      <textarea
        id="memory"
        name="memory"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        rows={7}
        maxLength={MEMORY_MAX + 200}
        aria-describedby="memory-hint"
        placeholder="Four college friends missed their train to Goa after their final semester. They had almost no money, but they decided to travel anyway..."
        className="rf-focus mt-3 w-full resize-y rounded-2xl border border-line bg-ink-soft px-4 py-3.5 text-[15px] leading-relaxed text-chalk placeholder:text-mist/50 transition-colors duration-200 hover:border-mist/40 focus:border-forge/60 disabled:opacity-50"
      />

      <p id="memory-hint" className="mt-2 text-xs text-mist">
        {remaining > 0
          ? `${remaining} more character${remaining === 1 ? '' : 's'} to go.`
          : 'Ready to forge.'}
      </p>

      <div className="mt-5">
        <p className="text-xs font-semibold tracking-wider text-mist uppercase">
          Or start from one of these
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {EXAMPLE_MEMORIES.map((example) => (
            <button
              key={example.label}
              type="button"
              disabled={disabled}
              onClick={() => onChange(example.text)}
              className="rf-focus rounded-full border border-line bg-surface/60 px-3.5 py-1.5 text-xs text-mist transition-colors duration-200 hover:border-forge/50 hover:text-chalk disabled:opacity-50"
            >
              {example.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
