import { GENRES } from '../data/genres';

/**
 * Genre chips as a real radio group so keyboard and screen-reader users
 * get arrow-key navigation for free.
 */
export function GenreSelector({ value, onChange, disabled = false }) {
  return (
    <fieldset disabled={disabled} className="disabled:opacity-50">
      <legend className="text-sm font-semibold text-chalk">Choose your genre</legend>
      <p className="mt-1 text-sm text-mist">
        The same memory becomes a different movie in every genre.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {GENRES.map((genre) => {
          const isSelected = value === genre.value;
          return (
            <label
              key={genre.value}
              title={genre.hint}
              className={[
                'cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200',
                'has-focus-visible:outline has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-forge',
                isSelected
                  ? 'border-forge bg-forge/15 text-forge'
                  : 'border-line bg-surface/60 text-mist hover:border-mist/50 hover:text-chalk',
              ].join(' ')}
            >
              <input
                type="radio"
                name="genre"
                value={genre.value}
                checked={isSelected}
                onChange={() => onChange(genre.value)}
                className="sr-only"
              />
              {genre.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
