import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GenreSelector } from '../components/GenreSelector';
import { LoadingScreen } from '../components/LoadingScreen';
import { StoryInput } from '../components/StoryInput';
import { useMovie } from '../context/MovieContext';
import { generateMovie, isOfflineMode, validateMemory } from '../services/api';

const CHECKLIST = [
  'A cinematic title',
  'A one-line tagline',
  'Three to five characters',
  'A full synopsis',
  'A five-scene trailer script',
  'One AI-generated poster',
];

export function Dashboard() {
  const navigate = useNavigate();
  const { lastInput, saveMovie } = useMovie();

  const [memory, setMemory] = useState(lastInput.memory);
  const [genre, setGenre] = useState(lastInput.genre);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit = validateMemory(memory) === null && !isGenerating;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setIsGenerating(true);

    try {
      const movie = await generateMovie({ memory, genre });
      saveMovie(movie, { memory, genre });
      navigate('/movie');
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsGenerating(false);
    }
  }

  if (isGenerating) {
    return <LoadingScreen />;
  }

  return (
    <section className="rf-shell py-12 sm:py-16">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.22em] text-forge uppercase">The studio</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-chalk sm:text-5xl">
          Create your movie
        </h1>
        <p className="mt-4 text-mist">
          Give REELFORGE one memory. It handles the casting, the story, and the poster.
        </p>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-start">
        <form onSubmit={handleSubmit} className="rf-card p-6 sm:p-8">
          <StoryInput value={memory} onChange={setMemory} disabled={isGenerating} />

          <div className="mt-9 border-t border-line pt-8">
            <GenreSelector value={genre} onChange={setGenre} disabled={isGenerating} />
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-8 rounded-2xl border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-chalk"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rf-focus rounded-full bg-gradient-to-r from-forge to-ember px-7 py-3.5 text-sm font-semibold text-ink transition-all duration-200 hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Create movie
            </button>
            <span className="text-xs text-mist">Takes twenty to forty seconds.</span>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="rf-card p-6">
            <h2 className="text-sm font-semibold text-chalk">What you'll get back</h2>
            <ul className="mt-4 space-y-2.5">
              {CHECKLIST.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-mist">
                  <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-forge" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {isOfflineMode() ? (
            <div className="rounded-3xl border border-forge/30 bg-forge/5 p-6">
              <h2 className="text-sm font-semibold text-forge">Preview mode</h2>
              <p className="mt-2 text-sm leading-relaxed text-mist">
                No API is connected yet, so this returns the sample movie from{' '}
                <code className="text-chalk">src/data/sampleMovie.js</code>. Set{' '}
                <code className="text-chalk">VITE_API_URL</code> to generate for real.
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
