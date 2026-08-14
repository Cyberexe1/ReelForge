# REELFORGE — Architecture

Serverless, single-region, stateless. One synchronous request produces one complete movie package.

---

## 1. System diagram

```
                    ┌─────────────────────┐
                    │        USER         │
                    │   Memory + Genre    │
                    └──────────┬──────────┘
                               │ HTTPS
                               ▼
                    ┌─────────────────────┐
                    │    React + Vite     │
                    │    Creative UI      │
                    └──────────┬──────────┘
                               │ POST /generate-movie
                               ▼
                    ┌─────────────────────┐
                    │  Amazon API Gateway │
                    │      HTTP API       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     AWS Lambda      │
                    │  Application Logic  │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┴──────────────┐
                 ▼                            ▼
      ┌──────────────────┐         ┌──────────────────┐
      │  Amazon Bedrock  │         │  Amazon Bedrock  │
      │  Text Generation │         │ Image Generation │
      │                  │         │   (Nova Canvas)  │
      │  • Title         │         │                  │
      │  • Tagline       │         │  • ONE poster    │
      │  • Characters    │         │                  │
      │  • Synopsis      │         │                  │
      │  • Trailer       │         │                  │
      │  • poster_prompt │         │                  │
      └────────┬─────────┘         └────────┬─────────┘
               │                            │
               │                            ▼
               │                   ┌─────────────────┐
               │                   │    Amazon S3    │
               │                   │ Poster Storage  │
               │                   │  (private)      │
               │                   └────────┬────────┘
               │                            │ presigned URL
               └─────────────┬──────────────┘
                             ▼
                    ┌─────────────────────┐
                    │  Lambda Response    │
                    │  Movie JSON + URL   │
                    └──────────┬──────────┘
                               ▼
                    ┌─────────────────────┐
                    │  React Result Page  │
                    │  🎬 🖼️ 👥 📖 🎞️      │
                    └─────────────────────┘
```

API Gateway is the front door; Lambda is the application tier. This is the standard AWS serverless web/API pattern — no EC2, no load balancer, no container orchestration.

---

## 2. Request flow, step by step

**Step 1** — User lands on the app and sees `YOUR MEMORY. YOUR MOVIE.`

**Step 2** — User types a memory, picks Comedy, clicks `🎬 Create My Movie`.

**Step 3** — React POSTs to API Gateway.

```json
{
  "memory": "Four friends missed their train to Goa after our final semester...",
  "genre": "Comedy"
}
```

**Step 4** — API Gateway terminates TLS, applies CORS, invokes Lambda.

**Step 5** — Lambda validates input, builds the structured prompt, invokes the Bedrock text model, and parses the returned JSON.

**Step 6** — Lambda extracts `poster_prompt` from that JSON and invokes the image model.

**Step 7** — Lambda decodes the base64 image and writes it to `s3://<bucket>/posters/<movie-id>.png`, then generates a presigned GET URL.

**Step 8** — Lambda returns the merged response.

**Step 9** — React renders the movie page.

### Lambda internal sequence

```
Receive request
      ↓
Validate input          → 400 on failure
      ↓
Build Bedrock prompt
      ↓
Invoke text model       → 502 on failure
      ↓
Parse + validate JSON   → one repair retry, then 502
      ↓
Extract poster_prompt
      ↓
Invoke image model      → degrade gracefully, posterUrl: null
      ↓
Upload to S3
      ↓
Presign URL
      ↓
Return 200
```

Note the asymmetry: a text failure kills the request, an image failure does not. A movie with a placeholder poster is still a usable result. A movie with no story is nothing.

---

## 3. Bedrock text generation

The core technique is forcing structured output so the frontend never parses prose.

**System prompt**

```
You are REELFORGE, an AI movie concept generator.
Transform the user's memory into an original movie concept.

Return ONLY valid JSON. No markdown fences, no commentary.

Required fields:
  title          string, uppercase, max 6 words
  genre          string, may combine two genres
  tagline        string, one cinematic line
  characters     array of 3-5 objects: { name, description }
  synopsis       string, 2-4 paragraphs
  trailer        array of EXACTLY 5 objects:
                 { scene_title, description, narration, dialogue }
  poster_prompt  string, a detailed visual description for an
                 image model. Describe subject, setting, lighting,
                 mood, and composition. Do NOT include any text,
                 words, letters, or titles in the image.

If the selected genre is "Auto", choose the genre that best fits
the memory.

User memory: {{memory}}
Selected genre: {{genre}}
```

**Expected shape**

```json
{
  "title": "THE TRAIN WE MISSED",
  "genre": "Coming-of-Age / Comedy",
  "tagline": "Sometimes the wrong train takes you to the right story.",
  "characters": [
    { "name": "Aarav", "description": "The planner who always has a backup plan." },
    { "name": "Rohan", "description": "The impulsive friend responsible for most disasters." },
    { "name": "Kabir", "description": "The relaxed one who believes it'll work out." },
    { "name": "Neha", "description": "The practical friend trying to keep everyone alive." }
  ],
  "synopsis": "...",
  "trailer": [
    { "scene_title": "THE DEPARTURE",     "description": "...", "narration": "...", "dialogue": "..." },
    { "scene_title": "THE MISSED TRAIN",  "description": "...", "narration": "...", "dialogue": "..." },
    { "scene_title": "THE DECISION",      "description": "...", "narration": "...", "dialogue": "..." },
    { "scene_title": "THE ADVENTURE",     "description": "...", "narration": "...", "dialogue": "..." },
    { "scene_title": "THE RETURN",        "description": "...", "narration": "...", "dialogue": "..." }
  ],
  "poster_prompt": "Cinematic movie poster artwork: four young Indian college friends with backpacks standing on an empty railway platform at sunset, warm golden light, emotional coming-of-age atmosphere, realistic photography, dramatic wide composition."
}
```

**Parsing defence.** Models occasionally wrap JSON in markdown fences or add a leading sentence. The parser should strip fences, slice from the first `{` to the last `}`, then `json.loads`. If that fails, retry once with a stricter instruction. If it fails again, return 502 — do not ship a half-parsed movie to the UI.

**Schema validation** after parsing: all seven keys present, `characters` length 3–5, `trailer` length exactly 5. Reject and retry once on violation.

---

## 4. Bedrock image generation

Lambda passes `poster_prompt` straight through to the image model with a `TEXT_IMAGE` task, requesting a single image at poster-friendly dimensions.

```
poster_prompt
      ↓
  Bedrock (Nova Canvas)
      ↓
  base64 image
      ↓
  decode → bytes
      ↓
  S3 putObject
      ↓
  presigned URL
```

**Key configuration**

| Parameter | Value | Reason |
| --- | --- | --- |
| Task type | `TEXT_IMAGE` | Plain text-to-image |
| Number of images | 1 | Scope decision — one poster |
| Dimensions | portrait, poster aspect | Matches the result page layout |
| Negative prompt | `text, words, letters, watermark, signature, logo` | Title comes from CSS, not the model |
| Seed | random per request | Enables Regenerate Poster to differ |

**The title is never rendered by the model.** Image models are unreliable at typography. The generated artwork is a clean plate; React overlays title, tagline, and genre with real fonts.

```
Nova Canvas → Cinematic Artwork → S3 → React Poster Card
                                          │
                                          ├── CSS: title
                                          ├── CSS: tagline
                                          └── CSS: genre
```

`Regenerate Poster` reuses the stored `poster_prompt` with a new seed. Story unchanged, visual different — and it costs one image call instead of a full regeneration.

---

## 5. API contract

### `POST /generate-movie`

**Request**

```json
{
  "memory": "string, 20-2000 characters, required",
  "genre":  "Comedy | Drama | Thriller | Horror | Romance | Sci-Fi | Fantasy | Auto"
}
```

**Response 200**

```json
{
  "movieId": "7f8a21",
  "title": "THE TRAIN WE MISSED",
  "genre": "Coming-of-Age / Comedy",
  "tagline": "Sometimes the wrong train takes you to the right story.",
  "characters": [ { "name": "...", "description": "..." } ],
  "synopsis": "...",
  "trailer": [ { "scene_title": "...", "description": "...", "narration": "...", "dialogue": "..." } ],
  "posterUrl": "https://<bucket>.s3.<region>.amazonaws.com/posters/7f8a21.png?X-Amz-...",
  "posterPrompt": "..."
}
```

`posterPrompt` is returned so the client can request a regeneration without re-running text generation.

### `POST /regenerate-poster` — stretch

```json
{ "movieId": "7f8a21", "posterPrompt": "..." }
```

Returns `{ "posterUrl": "..." }`.

### Error responses

| Status | Cause | Body |
| --- | --- | --- |
| 400 | Missing/short/long memory, invalid genre | `{ "error": "MEMORY_TOO_SHORT", "message": "..." }` |
| 429 | Bedrock throttling | `{ "error": "RATE_LIMITED", "message": "Try again in a moment." }` |
| 502 | Model failure or unparseable output | `{ "error": "GENERATION_FAILED", "message": "..." }` |
| 504 | Timeout | `{ "error": "TIMEOUT", "message": "..." }` |

Every error carries a machine code and a human message. The UI shows the message and a retry button — never a raw stack trace.

---

## 6. IAM and security

### Lambda execution role

```
Lambda
  ├── Allow: bedrock:InvokeModel     (scoped to two model ARNs)
  ├── Allow: s3:PutObject            (scoped to posters/* prefix)
  ├── Allow: s3:GetObject            (for presigning)
  └── Allow: logs:*                  (CloudWatch, via managed basic role)
```

**Policy**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "InvokeBedrockModels",
      "Effect": "Allow",
      "Action": "bedrock:InvokeModel",
      "Resource": [
        "arn:aws:bedrock:<region>::foundation-model/<TEXT_MODEL_ID>",
        "arn:aws:bedrock:<region>::foundation-model/<IMAGE_MODEL_ID>"
      ]
    },
    {
      "Sid": "WritePostersOnly",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::reelforge-<suffix>/posters/*"
    }
  ]
}
```

No wildcard on Bedrock models. No wildcard on the bucket. No `AdministratorAccess`. This is a small amount of extra work that demonstrates least-privilege thinking, and it is worth a paragraph in the article.

### Boundaries

| Layer | Trust | Control |
| --- | --- | --- |
| Browser | Untrusted | Knows only the API URL. Zero AWS credentials. |
| API Gateway | Edge | CORS restricted to the deployed origin, not `*` |
| Lambda | Trusted | Holds all permissions via execution role |
| S3 | Private | Block Public Access on; presigned URLs only |

### Input validation

Server-side, always — client-side checks are UX, not security.

- `memory` must be a string, 20–2000 characters after trimming
- `genre` must match the allowlist exactly
- Reject any unexpected top-level keys
- Cap the prompt sent to Bedrock so a long input can't inflate token cost

### Abuse considerations

The endpoint is public and each call costs real money. For a weekend demo this is acceptable, but it should be acknowledged rather than ignored:

- API Gateway throttling set to a low burst/rate limit
- Lambda reserved concurrency as a hard spend ceiling
- An AWS Budgets alert on the account
- Honest note in the article: production would need auth or a CAPTCHA

---

## 7. Data flow summary

```
USER INPUT
    │ Memory + Genre
    ▼
  REACT
    │ HTTPS POST
    ▼
API GATEWAY
    ▼
  LAMBDA
    │
    ├──────────────► BEDROCK (text)
    │                     │
    │                     ▼
    │                Movie JSON
    │                     │
    │                poster_prompt
    │                     │
    └──────────────► BEDROCK (image)
                          │
                          ▼
                        Image
                          │
                          ▼
                          S3
                          │
                          ▼
                     Poster URL
                          │
         ┌────────────────┘
         ▼
      LAMBDA (merge)
         ▼
    API GATEWAY
         ▼
       REACT
         ▼
   🎬 FINAL MOVIE
```

**Stateless by design.** Nothing is written to a database. The movie exists in the response body and in the browser's memory. The only persisted artifact is the poster image, and that expires in 7 days. This is why there's no DynamoDB in the diagram — adding one would be architecture for its own sake.

---

## 8. Known risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| API Gateway 30s integration cap | Request fails on slow generations | Measure in Phase 1; split into two endpoints if over budget |
| Nova Canvas legacy/EOL status | Image model unavailable in region | Verify in Phase 0; model ID is an env var |
| Model returns invalid JSON | Blank result page | Strip fences, slice braces, schema-validate, one repair retry |
| Bedrock throttling during demo | 429 mid-presentation | Pre-generate one saved result as a demo fallback |
| CORS misconfiguration | Frontend can't reach API | Test from the deployed origin, not just localhost |
| Cost overrun from public endpoint | Surprise bill | Throttling + reserved concurrency + budget alert |

---

**Related docs:** [Overview](01-PROJECT-OVERVIEW.md) · [Tech Stack](02-TECH-STACK.md) · [Build Phases](04-BUILD-PHASES.md)
