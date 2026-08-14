import { Link } from 'react-router-dom';
import { PosterCard } from '../components/PosterCard';
import { SAMPLE_MOVIE } from '../data/sampleMovie';

const STEPS = [
  {
    step: '01',
    title: 'Tell it one memory',
    body: 'A trip that went wrong, a night that mattered, or something you invented on the spot. One paragraph is enough.',
  },
  {
    step: '02',
    title: 'Pick a genre',
    body: 'Comedy, horror, sci-fi, or let REELFORGE choose the genre your memory was always meant to be.',
  },
  {
    step: '03',
    title: 'Get the whole film',
    body: 'Title, tagline, cast, synopsis, a five-scene trailer script, and one cinematic poster.',
  },
];

const ARTIFACTS = [
  { label: 'Title', detail: 'A real movie name, not a summary' },
  { label: 'Tagline', detail: 'One line for the poster' },
  { label: 'Cast', detail: 'Three to five named characters' },
  { label: 'Synopsis', detail: 'The full story, start to end' },
  { label: 'Trailer', detail: 'Five scenes with narration' },
  { label: 'Poster', detail: 'One AI-generated cinematic image' },
];

const GENRE_TAKES = [
  { genre: 'Comedy', title: 'The Train We Missed' },
  { genre: 'Horror', title: 'The Last Train to Goa' },
  { genre: 'Sci-Fi', title: 'Goa 2099' },
  { genre: 'Thriller', title: 'Platform 13' },
];

function Hero() {
  return (
    <section className="rf-shell pt-12 pb-20 sm:pt-20">
      <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
        <div className="animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-3.5 py-1.5 text-xs text-mist">
            <span className="size-1.5 rounded-full bg-forge" />
            Built on Amazon Bedrock
          </span>

          <h1 className="mt-6 text-5xl leading-[1.02] font-bold tracking-tight text-balance text-chalk sm:text-6xl lg:text-7xl">
            Your memory.
            <br />
            <span className="bg-gradient-to-r from-forge to-ember bg-clip-text text-transparent">
              Your movie.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-mist">
            REELFORGE turns a single personal memory into an alternate cinematic universe — cast,
            story, trailer, and poster. One moment in, a whole film out.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              to="/studio"
              className="rf-focus rounded-full bg-gradient-to-r from-forge to-ember px-6 py-3.5 text-sm font-semibold text-ink transition-transform duration-200 hover:-translate-y-0.5"
            >
              Create your movie
            </Link>
            <a
              href="#how-it-works"
              className="rf-focus rounded-full border border-line bg-surface/60 px-6 py-3.5 text-sm font-semibold text-chalk transition-colors duration-200 hover:border-mist/50"
            >
              How it works
            </a>
          </div>

          <p className="mt-6 text-xs text-mist">
            No sign-up. Nothing stored. Your memory never leaves the request.
          </p>
        </div>

        <div className="relative animate-rise">
          <div
            aria-hidden="true"
            className="absolute -inset-8 animate-glow rounded-full bg-gradient-to-br from-forge/20 to-ember/10 blur-3xl"
          />
          <PosterCard
            title={SAMPLE_MOVIE.title}
            genre={SAMPLE_MOVIE.genre}
            tagline={SAMPLE_MOVIE.tagline}
            posterUrl={null}
            className="mx-auto max-w-sm rotate-1 transition-transform duration-500 hover:rotate-0"
          />
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="rf-shell scroll-mt-28 py-16">
      <h2 className="text-3xl font-bold tracking-tight text-chalk sm:text-4xl">
        Three steps to a film that never existed
      </h2>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {STEPS.map(({ step, title, body }) => (
          <article key={step} className="rf-card p-6">
            <p className="font-display text-3xl tracking-wider text-forge">{step}</p>
            <h3 className="mt-3 text-lg font-semibold text-chalk">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-mist">{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function WhatYouGet() {
  return (
    <section className="rf-shell py-16">
      <div className="rf-card p-7 sm:p-10">
        <h2 className="text-3xl font-bold tracking-tight text-chalk sm:text-4xl">
          Everything a pitch meeting would ask for
        </h2>
        <p className="mt-3 max-w-2xl text-mist">
          One request returns the complete package. No stitching four tools together.
        </p>

        <ul className="mt-9 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {ARTIFACTS.map(({ label, detail }) => (
            <li key={label} className="border-t border-line pt-4">
              <p className="text-sm font-semibold text-chalk">{label}</p>
              <p className="mt-1 text-sm text-mist">{detail}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function GenreReplay() {
  return (
    <section className="rf-shell py-16">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-chalk sm:text-4xl">
            One memory. Every genre.
          </h2>
          <p className="mt-4 leading-relaxed text-mist">
            Four friends miss a train. In comedy it's the best week of their lives. In horror they
            should never have boarded the next one. Change the genre and REELFORGE reinterprets the
            same moment from scratch.
          </p>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2">
          {GENRE_TAKES.map(({ genre, title }) => (
            <li
              key={genre}
              className="rf-card p-5 transition-colors duration-300 hover:border-forge/40"
            >
              <p className="text-[11px] font-semibold tracking-[0.2em] text-forge uppercase">
                {genre}
              </p>
              <p className="mt-2 font-display text-2xl tracking-wide text-chalk">{title}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="rf-shell py-16">
      <div className="relative isolate overflow-hidden rounded-3xl border border-line bg-surface/60 px-7 py-14 text-center sm:px-12">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 -top-24 -z-10 h-48 bg-gradient-to-b from-forge/20 to-transparent blur-2xl"
        />
        <h2 className="font-display text-4xl tracking-wide text-chalk sm:text-5xl">
          What's your movie?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-mist">
          Pick a memory you'd actually want to watch. It takes about a minute.
        </p>
        <Link
          to="/studio"
          className="rf-focus mt-8 inline-block rounded-full bg-chalk px-7 py-3.5 text-sm font-semibold text-ink transition-colors duration-200 hover:bg-forge"
        >
          Open the studio
        </Link>
      </div>
    </section>
  );
}

export function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <WhatYouGet />
      <GenreReplay />
      <ClosingCta />
    </>
  );
}
