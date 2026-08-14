# REELFORGE — Product Context

REELFORGE turns a single personal memory into a complete movie concept: cinematic title, tagline, cast, synopsis, a 5-scene trailer script, and one AI-generated poster.

Built for the AWS Weekend Creative Challenge (Aug 14–17, 2026). Full specification lives in `docs/`.

## The pitch

Not "an AI movie generator." That's generic.

> REELFORGE turns a single personal memory into an alternate cinematic universe.

The replay loop is the differentiator: the same memory reinterpreted as Comedy, Horror, Sci-Fi, or Thriller produces a completely different movie.

## User flow

```
Landing (/)  →  Studio (/studio)  →  Movie (/movie)
   CTA          memory + genre       poster + story
```

Three screens. No more.

## What the app generates

| # | Artifact | Notes |
| --- | --- | --- |
| 1 | Title | Uppercase, max 6 words |
| 2 | Genre label | May combine two genres |
| 3 | Tagline | One cinematic line |
| 4 | Characters | 3–5, each with a one-line role |
| 5 | Synopsis | 2–4 paragraphs |
| 6 | Trailer | Exactly 5 scenes |
| 7 | Poster | Exactly one image |

## Standing product decisions

Do not reopen these without a reason:

- **One poster, not ten.** Scope discipline. Ten images means 10x latency and cost for marginal gain.
- **The image model never renders text.** Title, tagline, and genre are CSS overlays on top of clean artwork. Image models are unreliable at typography.
- **Stateless.** No database. The movie lives in the response body and browser memory. The only persisted artifact is the poster in S3.
- **No auth in the MVP.** No user data to protect.

## Out of scope

Authentication · DynamoDB · movie history · profiles · sharing feeds · video generation · voice cloning · background music · multiple images per movie · agents · RAG · vector DB.

Each of these is a legitimate v2 idea. None are needed to ship.

## Tone of the UI

Reads like a streaming platform, not an AI dashboard. Dark, poster-forward, generous type scale, restrained motion. Confident and calm — never busy.
