# REELFORGE — Repository Structure

```
REELFORGE/
├── .kiro/
│   └── steering/
│       ├── product.md          # what we're building, standing decisions
│       ├── tech.md             # stack, versions, conventions, constraints
│       └── structure.md        # this file
│
├── docs/
│   ├── 01-PROJECT-OVERVIEW.md  # problem, concept, scope boundaries
│   ├── 02-TECH-STACK.md        # every technology with a why
│   ├── 03-ARCHITECTURE.md      # diagrams, prompts, API contract, IAM
│   └── 04-BUILD-PHASES.md      # phase plan, timeline, submission checklist
│
├── frontend/
│   ├── src/
│   │   ├── components/         # presentational, no data fetching
│   │   │   ├── Header.jsx      # floating rounded header, shared by all routes
│   │   │   ├── Footer.jsx
│   │   │   ├── StoryInput.jsx
│   │   │   ├── GenreSelector.jsx
│   │   │   ├── PosterCard.jsx  # artwork + CSS title/tagline overlay
│   │   │   └── LoadingScreen.jsx
│   │   ├── pages/              # one per route
│   │   │   ├── Home.jsx        # /        landing
│   │   │   ├── Dashboard.jsx   # /studio  memory + genre input
│   │   │   └── Movie.jsx       # /movie   generated result
│   │   ├── context/
│   │   │   └── MovieContext.jsx  # holds the generated movie between routes
│   │   ├── services/
│   │   │   └── api.js         # the only place fetch is called
│   │   ├── data/
│   │   │   ├── genres.js      # the 8 genre options
│   │   │   └── sampleMovie.js # fixture for offline UI development
│   │   ├── App.jsx            # routes + layout shell
│   │   ├── main.jsx
│   │   └── index.css          # Tailwind entry + @theme tokens
│   ├── index.html
│   ├── vite.config.js
│   ├── .env.example
│   └── package.json
│
├── backend/                    # Phase 1 — not yet built
│   ├── lambda/
│   │   ├── handler.py
│   │   ├── bedrock.py
│   │   ├── poster.py
│   │   └── s3.py
│   └── requirements.txt
│
├── infrastructure/
│   └── README.md               # deployment steps + IAM policy
│
├── screenshots/                # for README and the Builder Center article
├── README.md
└── LICENSE
```

## Where things go

| Adding | Location |
| --- | --- |
| A new screen | `pages/`, plus a route in `App.jsx` |
| A reusable piece of UI | `components/` |
| An API call | `services/api.js` only |
| A design token | `@theme` in `index.css` |
| Static option lists | `data/` |
| State shared across routes | `context/` |

## Rules

- `components/` are presentational. They receive props and render. No `fetch`, no route knowledge.
- `pages/` own state and orchestration, and compose components.
- `Header` renders once in `App.jsx`, not per page.
- The fixture in `data/sampleMovie.js` must always match the response shape in `docs/03-ARCHITECTURE.md`. If the API contract changes, update both.

## Routes

| Path | Page | Guard |
| --- | --- | --- |
| `/` | `Home` | — |
| `/studio` | `Dashboard` | — |
| `/movie` | `Movie` | Redirects to `/studio` if no movie in context |
| `*` | `Home` | Catch-all |
