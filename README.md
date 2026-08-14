# 🎬 REELFORGE

**Turn one memory into a movie.**

REELFORGE transforms a single personal memory into an alternate cinematic universe — a cinematic title, tagline, cast, synopsis, five-scene trailer script, and one AI-generated poster. Built for the AWS Weekend Creative Challenge.

> Four college friends missed their train to Goa after their final semester. They had almost no money, but they decided to travel anyway.

becomes

> **THE TRAIN WE MISSED** — *"Sometimes the wrong train takes you to the right story."*

The replay loop is the point: the same memory reinterpreted as Horror becomes *The Last Train to Goa*, as Sci-Fi *Goa 2099*, as Thriller *Platform 13*.

---

## Architecture

```
┌─────────────────────┐
│    React + Vite     │
└──────────┬──────────┘
           │ POST /generate-movie
           ▼
┌─────────────────────┐
│  Amazon API Gateway │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│     AWS Lambda      │
└──────────┬──────────┘
           │
     ┌─────┴─────────────────┐
     ▼                       ▼
┌─────────────┐      ┌─────────────┐
│   Bedrock   │      │   Bedrock   │
│    Text     │      │    Image    │
│ movie JSON  │      │  ONE poster │
└──────┬──────┘      └──────┬──────┘
       │                    ▼
       │            ┌──────────────┐
       │            │  Amazon S3   │
       │            │  (private)   │
       │            └──────┬───────┘
       └──────────┬────────┘
                  ▼
         React result page
```

Full detail, including the system prompt and API contract, is in [`docs/03-ARCHITECTURE.md`](docs/03-ARCHITECTURE.md).

## AWS services

| Service | Role |
| --- | --- |
| **Amazon Bedrock** | Movie concept generation (text) and poster generation (image) |
| **Amazon Nova** | The foundation models behind both calls |
| **AWS Lambda** | All application logic, Python 3.12 |
| **Amazon API Gateway** | HTTP API front door |
| **Amazon S3** | Poster storage, private with presigned URLs |
| **AWS IAM** | Least-privilege execution role, scoped to specific model ARNs |

## Tech stack

```
React 19 + Vite 8 + Tailwind 4  →  API Gateway  →  Lambda (Python 3.12)  →  Bedrock (Nova)  →  S3
```

## Running the frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

## Deploying the backend

Four Python modules, no dependencies — the Lambda runtime already includes boto3.

```bash
cd backend/lambda
zip -r ../reelforge-lambda.zip handler.py bedrock.py poster.py s3.py
```

Step-by-step deployment, environment variables, the IAM policy, and a troubleshooting table are in [`infrastructure/README.md`](infrastructure/README.md).

With no `VITE_API_URL` configured, the app serves the fixture in `src/data/sampleMovie.js` so the full flow works offline. Copy `.env.example` to `.env.local` and set `VITE_API_URL` to the deployed API to generate for real.

The browser only ever knows the API Gateway URL. AWS credentials stay in the Lambda execution role.

## Project status

| Phase | State |
| --- | --- |
| Specification (`docs/`) | ✅ Complete |
| Frontend — landing, studio, result | ✅ Running against fixture |
| Lambda backend | ✅ Written, verified against stubbed AWS clients |
| Bedrock model access verification | ⬜ Phase 0 — needs a real AWS account |
| Deployment | ⬜ Phase 2–4 |

Phase plan and timeline: [`docs/04-BUILD-PHASES.md`](docs/04-BUILD-PHASES.md)

## Documentation

| Doc | Contents |
| --- | --- |
| [01 — Overview](docs/01-PROJECT-OVERVIEW.md) | Problem, concept, scope boundaries |
| [02 — Tech Stack](docs/02-TECH-STACK.md) | Every technology and why it was chosen |
| [03 — Architecture](docs/03-ARCHITECTURE.md) | Diagrams, prompts, API contract, IAM policy |
| [04 — Build Phases](docs/04-BUILD-PHASES.md) | Phase plan, timeline, submission checklist |

## Design decisions

- **One poster, not ten.** Ten images means 10x latency and cost for marginal gain.
- **The image model never renders text.** Title and tagline are CSS overlays on clean artwork — image models are unreliable at typography.
- **Stateless.** No database. The movie lives in the response body; only the poster persists, and it expires in 7 days.
- **Private S3 bucket.** Block Public Access on, presigned GET URLs with 1-hour expiry.
- **Text failure fails the request; image failure does not.** A movie with a placeholder poster is usable. A movie with no story is nothing.

## License

MIT — see [LICENSE](LICENSE).
