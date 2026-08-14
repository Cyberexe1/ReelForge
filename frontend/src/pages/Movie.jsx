import { Link, Navigate } from 'react-router-dom';
import { PosterCard } from '../components/PosterCard';
import { useMovie } from '../context/MovieContext';

export function Movie() {
  const { movie } = useMovie();

  // Stateless by design: a refresh loses the movie, so send them back to make one.
  if (!movie) {
    return <Navigate to="/studio" replace />;
  }

  return (
    <article className="rf-shell py-12 sm:py-16">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div className="lg:sticky lg:top-28">
          <PosterCard
            title={movie.title}
            genre={movie.genre}
            tagline={movie.tagline}
            posterUrl={movie.posterUrl}
            className="mx-auto max-w-sm animate-rise"
          />

          <div className="mx-auto mt-5 flex max-w-sm flex-wrap gap-2">
            <Link
              to="/studio"
              className="rf-focus flex-1 rounded-full border border-line bg-surface/60 px-5 py-3 text-center text-sm font-semibold text-chalk transition-colors duration-200 hover:border-forge/50"
            >
              Change genre
            </Link>
            <Link
              to="/studio"
              className="rf-focus flex-1 rounded-full border border-line bg-surface/60 px-5 py-3 text-center text-sm font-semibold text-chalk transition-colors duration-200 hover:border-forge/50"
            >
              New memory
            </Link>
          </div>
        </div>

        <div className="space-y-12">
          <section>
            <h1 className="font-display text-5xl leading-none tracking-wide text-chalk sm:text-6xl">
              {movie.title}
            </h1>
            <p className="mt-3 text-sm font-semibold tracking-[0.2em] text-forge uppercase">
              {movie.genre}
            </p>
          </section>

          <section>
            <h2 className="text-xs font-semibold tracking-[0.22em] text-mist uppercase">
              The story
            </h2>
            <div className="mt-4 space-y-4">
              {movie.synopsis.split('\n\n').map((paragraph) => (
                <p key={paragraph.slice(0, 24)} className="leading-relaxed text-chalk/80">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold tracking-[0.22em] text-mist uppercase">
              The cast
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {movie.characters.map((character) => (
                <li key={character.name} className="rf-card p-5">
                  <p className="font-display text-2xl tracking-wide text-chalk">{character.name}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-mist">
                    {character.description}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xs font-semibold tracking-[0.22em] text-mist uppercase">Trailer</h2>
            <ol className="mt-4 space-y-3">
              {movie.trailer.map((scene, index) => (
                <li key={scene.scene_title} className="rf-card p-6">
                  <div className="flex items-baseline gap-4">
                    <span className="font-display text-2xl tracking-wider text-forge">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h3 className="font-display text-2xl tracking-wide text-chalk">
                      {scene.scene_title}
                    </h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-chalk/75">{scene.description}</p>
                  <p className="mt-3 border-l-2 border-forge/50 pl-4 text-sm text-mist italic">
                    {scene.narration}
                  </p>
                  <p className="mt-3 text-sm text-chalk/70">{scene.dialogue}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </article>
  );
}
