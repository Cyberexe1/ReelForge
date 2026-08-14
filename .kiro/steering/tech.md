# REELFORGE — Tech Conventions

```
React + Vite + Tailwind  ->  API Gateway  ->  Lambda (Python)  ->  Bedrock (Nova)  ->  S3
```

## Pinned versions

| Package | Version | Note |
| --- | --- | --- |
| React | 19.2.8 | |
| Vite | 8.2.1 | requires Node 22.12+ |
| Tailwind CSS | 4.3.3 | **v4** — CSS-first config, no `tailwind.config.js` |
| `@tailwindcss/vite` | 4.3.3 | Tailwind is a Vite plugin, not a PostCSS step |
| react-router-dom | 7.18.2 | |
| Lambda runtime | Python 3.12 | Boto3 preinstalled, no dependency layer |

Dependencies are pinned exactly. No `^` ranges.

## Tailwind v4 rules

This project uses Tailwind **v4**, which differs from v3 in ways that break copied snippets:

- Entry is `@import "tailwindcss";` — **not** the three `@tailwind` directives
- Theme is defined in CSS inside `@theme { ... }` — **not** in `tailwind.config.js`
- Registered via `tailwindcss()` in `vite.config.js` — no `postcss.config.js`

Custom theme tokens (see `frontend/src/index.css`):

| Token | Class | Value |
| --- | --- | --- |
| `--color-ink` | `bg-ink` | `#08080b` page background |
| `--color-surface` | `bg-surface` | `#14141d` cards |
| `--color-surface-2` | `bg-surface-2` | `#1b1b26` raised |
| `--color-line` | `border-line` | `#262633` hairlines |
| `--color-chalk` | `text-chalk` | `#f4f4f7` primary text |
| `--color-mist` | `text-mist` | `#8b8b9e` muted text |
| `--color-forge` | `text-forge` | `#ffb23e` primary accent |
| `--color-ember` | `text-ember` | `#ff6b35` secondary accent |
| `--font-display` | `font-display` | Bebas Neue — poster titles only |
| `--font-sans` | `font-sans` | Inter — everything else |

Use tokens. Do not hard-code hex values in components.

## Frontend conventions

- Function components, named exports, `.jsx` extension
- Plain JavaScript, not TypeScript — the only complex shape is the movie JSON, validated server-side
- `useState` and context. No Redux, no Zustand
- All network calls go through `src/services/api.js`. Components never call `fetch` directly
- Tailwind utilities inline. No CSS modules, no styled-components
- Shared visual patterns (`.rf-card`, `.rf-focus`) live as `@utility` in `index.css`

## Backend conventions

One module per responsibility:

```
handler.py    # HTTP: parse, validate, respond, CORS, errors
bedrock.py    # generate_movie(memory, genre) -> dict
poster.py     # generate_poster(prompt) -> bytes
s3.py         # upload_poster(bytes, movie_id) -> presigned_url
```

Model IDs are **always** environment variables, never literals:

```python
TEXT_MODEL_ID  = os.environ["TEXT_MODEL_ID"]
IMAGE_MODEL_ID = os.environ["IMAGE_MODEL_ID"]
```

Nova Canvas is marked legacy in some regions with a Sept 30, 2026 EOL. Swapping image models must stay a config change, not a refactor.

## Hard constraints

- **No AWS credentials in the browser. Ever.** The frontend knows one thing: the API Gateway URL.
- **API Gateway HTTP API caps integrations at 30 seconds.** Two sequential model calls may not fit. If they don't, split into `/generate-story` and `/generate-poster`.
- **S3 stays private.** Block Public Access on, presigned GET URLs with 1-hour expiry.
- **IAM is least-privilege.** Bedrock scoped to specific model ARNs, S3 scoped to the `posters/*` prefix. No wildcards, no `AdministratorAccess`.
- **Text failure fails the request. Image failure does not.** Degrade to `posterUrl: null` — a movie with a placeholder poster is usable, a movie with no story is nothing.

## Local development

```
cd frontend
npm install
npm run dev        # http://localhost:5173
```

With no `VITE_API_URL` set, `api.js` serves the fixture in `src/data/sampleMovie.js` after a simulated delay. This is intentional: the UI is built and iterated against the fixture so render loops cost zero seconds and zero Bedrock calls. Point `VITE_API_URL` at the deployed API to switch to live generation.

Never run `npm run dev` in a blocking shell call — it does not exit.

## Accessibility baseline

Labels on every input, real `alt` text on the poster, visible focus rings via `.rf-focus`, contrast checked on text over dark surfaces. Full WCAG validation needs manual assistive-technology testing and expert review; this is the obvious-wins pass.
