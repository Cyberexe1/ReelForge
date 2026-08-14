/**
 * The poster. Artwork comes from the image model; the title, tagline, and genre
 * are CSS overlays — image models are unreliable at typography, so they never
 * render text. See docs/03-ARCHITECTURE.md §4.
 *
 * With posterUrl null (image generation failed, or offline fixture) this falls
 * back to a typographic card so the movie still reads as a movie.
 */
export function PosterCard({ title, genre, tagline, posterUrl, className = '' }) {
  return (
    <figure
      className={[
        'relative isolate aspect-2/3 w-full overflow-hidden rounded-3xl border border-line bg-surface-2 shadow-2xl shadow-black/60',
        className,
      ].join(' ')}
    >
      {posterUrl ? (
        <img
          src={posterUrl}
          alt={`Generated cinematic poster artwork for the movie ${title}`}
          className="absolute inset-0 size-full object-cover"
          loading="eager"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_30%_15%,rgba(255,178,62,0.28),transparent_55%),radial-gradient(circle_at_75%_70%,rgba(255,107,53,0.22),transparent_55%)]"
        />
      )}

      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-transparent"
      />

      <figcaption className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
        {genre ? (
          <p className="text-[11px] font-semibold tracking-[0.22em] text-forge uppercase">
            {genre}
          </p>
        ) : null}

        <h2 className="mt-2 font-display text-4xl leading-[0.95] tracking-wide text-chalk sm:text-5xl">
          {title}
        </h2>

        {tagline ? (
          <p className="mt-3 text-sm leading-relaxed text-chalk/75 italic">"{tagline}"</p>
        ) : null}
      </figcaption>

      {!posterUrl ? (
        <span className="absolute top-4 right-4 rounded-full border border-line bg-ink/70 px-2.5 py-1 text-[10px] tracking-wider text-mist uppercase backdrop-blur-sm">
          Artwork pending
        </span>
      ) : null}
    </figure>
  );
}
