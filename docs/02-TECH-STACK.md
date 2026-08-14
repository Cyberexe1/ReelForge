# REELFORGE — Technology Stack

Full stack in one line:

```
React + Vite + Tailwind  ->  API Gateway  ->  Lambda (Python)  ->  Bedrock (Nova)  ->  S3  ->  React
```

---

## 1. Frontend

| Technology | Version target | Purpose |
| --- | --- | --- |
| React | 18.x | UI layer, component model |
| Vite | 5.x | Dev server + production build |
| Tailwind CSS | 3.x | Cinematic styling, no custom CSS framework |
| React Router | 6.x | Three-route navigation |
| JavaScript (JSX) | ES2022 | Application logic |

**Why React:** already known. Introducing Next.js or Svelte would cost hours of learning for zero judging benefit, and SSR is pointless for an app whose only data comes from one POST request.

**Why Vite over CRA:** sub-second HMR matters when iterating on a visual-heavy result page, and `vite build` produces a static `dist/` that drops straight into S3.

**Why Tailwind:** the result page is the demo. Tailwind makes it fast to build something that reads like a streaming platform rather than an AI dashboard — dark backgrounds, poster-forward layout, generous type scale.

**Why plain JS, not TypeScript:** the only complex type in the system is the movie JSON, and it's validated server-side anyway. TypeScript here buys type safety on a weekend deadline at the cost of setup friction. Use TS only if it's already muscle memory.

### Frontend components

| Component | Responsibility |
| --- | --- |
| `Navbar.jsx` | Brand mark, minimal nav |
| `StoryInput.jsx` | Textarea, character counter, client-side length validation |
| `GenreSelector.jsx` | 8 selectable genre chips including Auto |
| `LoadingScreen.jsx` | Cinematic loader — this covers 20–40s of generation |
| `MoviePoster.jsx` | S3 image + CSS-overlaid title/tagline/genre |
| `CharacterCard.jsx` | Name + role line |
| `TrailerTimeline.jsx` | 5 numbered scenes, narration and dialogue |
| `ActionBar.jsx` | Change Genre / Regenerate Poster / Download |

`LoadingScreen` is not optional polish. Two sequential model invocations take real time, and a blank screen reads as a crash.

---

## 2. Backend

| Technology | Version target | Purpose |
| --- | --- | --- |
| AWS Lambda | Python 3.12 runtime | All application logic |
| Amazon API Gateway | HTTP API | Public HTTPS endpoint, CORS, request routing |
| Python | 3.12 | Lambda implementation |
| Boto3 | bundled in runtime | Bedrock + S3 SDK calls |

**Why Python + Boto3:** the Lambda does almost nothing except build prompts and call two AWS APIs. Boto3 is preinstalled in the Lambda Python runtime, which means no dependency layer and no packaging step for the MVP. Node.js with the AWS SDK v3 is equally valid — pick whichever is faster to debug under pressure.

**Why HTTP API over REST API:** cheaper, lower latency, and built-in CORS configuration. REST API's extra features (request validators, usage plans, API keys) aren't needed here.

**Lambda configuration**

| Setting | Value | Reason |
| --- | --- | --- |
| Memory | 1024 MB | Poster bytes held in memory during S3 upload |
| Timeout | 60 s | Two sequential model calls; API Gateway caps at 30 s, so see the note below |
| Runtime | Python 3.12 | Latest supported, Boto3 included |
| Concurrency | Default | No throttling needed at demo scale |

> **Latency constraint:** API Gateway HTTP API has a hard 30-second integration timeout. If text + image generation exceeds that, split into two endpoints — `POST /generate-story` returns text immediately, then `POST /generate-poster` fetches the image. This is the single most likely thing to break the MVP, so measure it in Phase 1.

### Backend module split

One file per responsibility. Not because the code is large, but because it makes the architecture explainable in the article.

```
handler.py            # HTTP concerns: parse, validate, respond, CORS, errors
  |
  +-- bedrock.py      # generate_movie(memory, genre) -> dict
  |
  +-- poster.py       # generate_poster(prompt) -> bytes
  |
  +-- s3.py           # upload_poster(bytes, movie_id) -> presigned_url
```

---

## 3. AI layer

| Technology | Purpose |
| --- | --- |
| Amazon Bedrock | Managed foundation model access; no model hosting |
| Amazon Nova (text model) | Movie concept: title, tagline, cast, synopsis, trailer, poster prompt |
| Amazon Nova Canvas (image model) | The single cinematic poster |

**Why Bedrock:** one API surface for both text and image, IAM-native auth (no third-party API keys to leak), and it is the AWS service the challenge is really asking about.

**Structured output is the key technique.** The text model is instructed to return only valid JSON with a fixed schema. This means the React app renders typed fields instead of parsing free-form prose. Prompt and schema details are in [Architecture §3](03-ARCHITECTURE.md#3-bedrock-text-generation).

**Model IDs are configuration, never hard-coded:**

```python
TEXT_MODEL_ID  = os.environ["TEXT_MODEL_ID"]
IMAGE_MODEL_ID = os.environ["IMAGE_MODEL_ID"]
AWS_REGION     = os.environ["BEDROCK_REGION"]
```

This matters specifically because Nova Canvas is marked legacy in some regions with a Sept 30, 2026 EOL, and Nova 2 offers newer image generation. Model availability must be verified in the target region before Phase 1 — see [Phase 0](04-BUILD-PHASES.md#phase-0--verify-before-you-build).

---

## 4. Storage

| Technology | Purpose |
| --- | --- |
| Amazon S3 | Generated poster storage |
| Amazon S3 (static hosting) | Built frontend assets — optional |
| Amazon CloudFront | CDN in front of the frontend — stretch only |

**Bucket layout**

```
reelforge-<account-id>-<region>/
  posters/
    7f8a21.png
    82bd12.png
    91ad42.png
```

**Access pattern:** the bucket stays private with Block Public Access on. Lambda returns a presigned GET URL with a 1-hour expiry. This is a deliberate choice worth calling out in the article — a public bucket would have been one line less code and a genuine security weakness.

**Lifecycle rule:** expire `posters/` objects after 7 days. Demo artifacts, not user data, and it keeps storage cost effectively zero.

---

## 5. Security

| Technology | Purpose |
| --- | --- |
| AWS IAM | Scoped Lambda execution role |
| API Gateway CORS | Restrict origins to the deployed frontend |
| Server-side input validation | Length caps, type checks, genre allowlist |
| Presigned S3 URLs | Time-limited object access without a public bucket |

**Non-negotiable rule:** no AWS credentials in the browser. Ever.

```javascript
// Never do this
const AWS_SECRET_KEY = "...";
```

The browser only knows one thing: the API Gateway URL. All credentials live in the Lambda execution role. Full IAM policy in [Architecture §6](03-ARCHITECTURE.md#6-iam-and-security).

---

## 6. Tooling and deployment

| Tool | Purpose |
| --- | --- |
| Git + GitHub | Version control, public repo for submission |
| AWS Console | Fastest path to deploy under a deadline |
| AWS CLI | Frontend sync to S3, log tailing |
| Amazon CloudWatch Logs | Lambda debugging — the only observability needed |
| `.env.local` / Lambda env vars | Configuration, never committed |

**On Infrastructure as Code:** SAM, CDK, or Terraform would be the right long-term answer. For a weekend build, console-first deployment is faster and less likely to burn an hour on a stack rollback. Document the setup steps in `infrastructure/README.md` so the deployment is reproducible, and note IaC as a v2 improvement in the article. Judges reward honest reasoning over unused config files.

---

## 7. Repository structure

```
REELFORGE/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── StoryInput.jsx
│   │   │   ├── GenreSelector.jsx
│   │   │   ├── LoadingScreen.jsx
│   │   │   ├── MoviePoster.jsx
│   │   │   ├── CharacterCard.jsx
│   │   │   ├── TrailerTimeline.jsx
│   │   │   └── ActionBar.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Create.jsx
│   │   │   └── Movie.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── lambda/
│   │   ├── handler.py
│   │   ├── bedrock.py
│   │   ├── poster.py
│   │   └── s3.py
│   └── requirements.txt
│
├── infrastructure/
│   └── README.md          # deployment steps + IAM policy
│
├── docs/                  # these four documents
├── screenshots/           # for the article and README
├── README.md
└── LICENSE                # MIT
```

---

## 8. What was deliberately left out

| Not used | Reason |
| --- | --- |
| EC2 / Docker / Nginx | Nothing here needs a persistent server |
| DynamoDB | No state survives a request in the MVP |
| Cognito | No accounts, no auth surface |
| Redux / Zustand | Two screens of state; props and `useState` are enough |
| Next.js | SSR solves a problem this app doesn't have |
| Step Functions | Two sequential calls fit in one Lambda |
| SQS / EventBridge | Request is synchronous by design |
| A test framework | Not in the judging criteria; verify manually and say so honestly |

Every exclusion here is a time budget decision, and each one is worth a sentence in the Builder Center article. Explaining what you chose *not* to build is a stronger signal of engineering judgment than a longer service list.

---

**Related docs:** [Overview](01-PROJECT-OVERVIEW.md) · [Architecture](03-ARCHITECTURE.md) · [Build Phases](04-BUILD-PHASES.md)
