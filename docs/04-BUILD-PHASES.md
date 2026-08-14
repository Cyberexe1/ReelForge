# REELFORGE — Build Phases

Challenge window: **Fri Aug 14 → Mon Aug 17, 2026.** The jacket goes to the first 50 qualifying submissions, so the schedule is built around submitting early with a working MVP, then improving.

**Guiding rule:** the app must be deployed and reachable by the end of Phase 4. Everything after that is optional.

```
PHASE 0  Verify           ~1 h    Fri
PHASE 1  Backend core     ~4 h    Fri
PHASE 2  Deploy backend   ~2 h    Fri/Sat
PHASE 3  Frontend         ~5 h    Sat
PHASE 4  Wire + deploy    ~3 h    Sat   ← SUBMITTABLE HERE
PHASE 5  Polish           ~4 h    Sun
PHASE 6  Stretch          ~3 h    Sun
PHASE 7  Article + submit ~3 h    Sun/Mon
```

---

## Phase 0 — Verify before you build

**Goal:** confirm the architecture is actually possible in your account before writing application code.

This phase exists because Nova Canvas is marked legacy in some regions with a Sept 30, 2026 EOL, and Nova 2 documents newer image capabilities. Discovering a model isn't available *after* building around it is the worst outcome of the weekend.

| # | Task | Done when |
| --- | --- | --- |
| 0.1 | Pick a region with Bedrock + Nova availability | Region chosen and written down |
| 0.2 | Open Bedrock console → Model access → request/confirm access to the text model | Status shows Access granted |
| 0.3 | Same for the image model (Nova Canvas or the current Nova image model) | Status shows Access granted |
| 0.4 | Note the exact model IDs and confirm EOL status for each | IDs recorded in `infrastructure/README.md` |
| 0.5 | Run one `invoke_model` text call from local CLI/script | Real completion returned |
| 0.6 | Run one `invoke_model` image call, save the PNG locally | Viewable image on disk |
| 0.7 | Time both calls | Combined latency recorded |
| 0.8 | Set an AWS Budgets alert | Alert active |
| 0.9 | Init repo, push skeleton + these docs | Public GitHub repo exists |

**Decision gate:** if 0.7 shows combined latency near or above 30 seconds, commit now to the two-endpoint split (`/generate-story` then `/generate-poster`) described in [Architecture §5](03-ARCHITECTURE.md#5-api-contract). Do not discover this in Phase 4.

**If the image model is unavailable:** fall back to any available Bedrock image model in the region. If none exists, the fallback is a CSS-generated gradient poster card with typography only — the app still qualifies on Bedrock text generation alone. Decide this in Phase 0, not Sunday night.

---

## Phase 1 — Backend core (local)

**Goal:** a Python function that takes `(memory, genre)` and returns the complete movie package. No AWS deployment yet — iterate locally where the feedback loop is fast.

| # | Task | Done when |
| --- | --- | --- |
| 1.1 | `backend/lambda/` skeleton: `handler.py`, `bedrock.py`, `poster.py`, `s3.py` | Files import cleanly |
| 1.2 | `bedrock.generate_movie()` with the structured system prompt | Returns a dict |
| 1.3 | JSON extraction: strip fences, slice first `{` to last `}` | Survives fenced output |
| 1.4 | Schema validation: 7 keys, 3–5 characters, exactly 5 trailer scenes | Raises on violation |
| 1.5 | One repair retry on parse/schema failure | Retry path tested |
| 1.6 | `poster.generate_poster()` with negative prompt and random seed | Returns image bytes |
| 1.7 | `s3.upload_poster()` + presigned URL generation | URL opens in browser |
| 1.8 | `handler.py`: parse event, validate input, orchestrate, format response | Returns full response dict |
| 1.9 | Error mapping to 400 / 429 / 502 / 504 with machine codes | Each path returns correct status |
| 1.10 | Image failure degrades to `posterUrl: null` instead of failing the request | Verified by forcing a failure |
| 1.11 | Test 5 different memories across 3 genres | 5/5 valid movie packages |

**Prompt iteration is the real work here.** Expect to spend most of this phase tuning the system prompt until output is consistently valid JSON with a good `poster_prompt`. Save every prompt version — the evolution is genuinely interesting article material.

**Save one good result** to `docs/sample-response.json`. It becomes your frontend fixture in Phase 3 and your demo fallback if Bedrock throttles during a presentation.

---

## Phase 2 — Deploy backend

**Goal:** a live HTTPS endpoint that returns a movie.

| # | Task | Done when |
| --- | --- | --- |
| 2.1 | Create S3 bucket, Block Public Access ON | Bucket exists, not public |
| 2.2 | Add lifecycle rule: expire `posters/` after 7 days | Rule active |
| 2.3 | Create Lambda execution role with the scoped policy from [Architecture §6](03-ARCHITECTURE.md#6-iam-and-security) | Role created, no wildcards |
| 2.4 | Create Lambda: Python 3.12, 1024 MB, 60 s timeout | Function exists |
| 2.5 | Set env vars: `TEXT_MODEL_ID`, `IMAGE_MODEL_ID`, `BEDROCK_REGION`, `POSTER_BUCKET` | All set |
| 2.6 | Upload code, test with a console event | Console test returns 200 |
| 2.7 | Create HTTP API, route `POST /generate-movie` → Lambda | Route deployed |
| 2.8 | Configure CORS (localhost:5173 for now) | Preflight passes |
| 2.9 | Set API throttling + Lambda reserved concurrency | Limits applied |
| 2.10 | `curl` the live endpoint | Full JSON + working poster URL |

**Checkpoint:** the backend is complete and independently demoable. If the weekend collapses from here, you still have something real.

---

## Phase 3 — Frontend

**Goal:** all three screens rendering correctly against the Phase 1 fixture, before touching the live API.

Build against `sample-response.json` first. Every render loop then costs zero seconds and zero cents instead of 30 seconds and a Bedrock call.

| # | Task | Done when |
| --- | --- | --- |
| 3.1 | `npm create vite@latest` + Tailwind + React Router | Dev server runs |
| 3.2 | Cinematic theme: dark palette, display font for titles, spacing scale | Applied globally |
| 3.3 | `Home.jsx` — brand, promise line, CTA | Route renders |
| 3.4 | `StoryInput.jsx` — textarea, char counter, 20–2000 validation | Blocks invalid input |
| 3.5 | `GenreSelector.jsx` — 8 chips, Auto default | Selection works |
| 3.6 | `Create.jsx` — composes input + selector + submit | Route renders |
| 3.7 | `LoadingScreen.jsx` — cinematic loader with rotating status lines | Doesn't look frozen |
| 3.8 | `MoviePoster.jsx` — image with CSS-overlaid title/tagline/genre | Overlay legible on any artwork |
| 3.9 | `CharacterCard.jsx` — name + role, grid layout | Renders 3–5 cards |
| 3.10 | `TrailerTimeline.jsx` — 5 numbered scenes with narration + dialogue | All 5 render |
| 3.11 | `Movie.jsx` — assembles poster, story, cast, trailer | Full page from fixture |
| 3.12 | `services/api.js` — fetch wrapper, env-based base URL, error handling | Handles all error codes |
| 3.13 | Error state component with retry | Shows message, not stack trace |
| 3.14 | Responsive check at 375 px and 1440 px | No overflow, no clipping |
| 3.15 | Accessibility pass: labels on inputs, alt text on poster, focus rings, contrast | Keyboard-navigable |

**On accessibility:** label the textarea properly, give the poster a real `alt` describing the generated artwork, keep visible focus states, and check contrast on text over dark backgrounds. Cheap to do now, awkward to retrofit. Note that full WCAG validation needs manual assistive-technology testing and expert review — this pass covers the obvious wins.

---

## Phase 4 — Wire up and deploy

**Goal:** live URL, end-to-end. **This is the submittable milestone.**

| # | Task | Done when |
| --- | --- | --- |
| 4.1 | Point `api.js` at the live API Gateway URL | Real call from localhost succeeds |
| 4.2 | Fix the CORS errors that will appear | No console CORS errors |
| 4.3 | `npm run build` | Clean `dist/` |
| 4.4 | Deploy frontend (S3 static hosting, or Amplify/Vercel if faster) | Public URL loads |
| 4.5 | Update API Gateway CORS to the deployed origin, remove `*` | Preflight passes from prod |
| 4.6 | Full flow test from the live URL | Movie renders with poster |
| 4.7 | Test 3 memories × 3 genres on production | 9/9 succeed |
| 4.8 | Test failure paths: empty input, 10-character input, throttle | Correct error UI each time |
| 4.9 | Screenshots: landing, create, loading, result, poster close-up | Saved to `screenshots/` |
| 4.10 | README: description, architecture diagram, live URL, setup steps | Reads well cold |
| 4.11 | `infrastructure/README.md`: exact deployment steps + IAM policy | Reproducible by a stranger |
| 4.12 | Commit and push everything | Repo current |

**Hard gate.** Do not start Phase 5 until 4.6 passes. If the schedule is slipping, cut Phase 5 and 6 entirely and go straight to Phase 7 — a deployed MVP with a good article beats a beautiful local build with no submission.

---

## Phase 5 — Polish

**Goal:** make the demo feel finished. Only after Phase 4 is green.

| # | Task | Priority |
| --- | --- | --- |
| 5.1 | Poster load transition (fade/skeleton, no layout jump) | High |
| 5.2 | Loading screen copy that reflects real stages | High |
| 5.3 | Scroll-in animations on the result page | Medium |
| 5.4 | Example memory prompts on the create page | High — solves blank-page paralysis |
| 5.5 | Trailer timeline visual treatment (numbered rail, scene cards) | Medium |
| 5.6 | Favicon, page title, OG meta tags | Medium |
| 5.7 | Mobile refinement pass | High |
| 5.8 | Empty/error illustrations | Low |

5.4 punches above its weight. A visitor with no memory in mind bounces; three clickable examples turn them into a user in one click.

---

## Phase 6 — Stretch features

Strict priority order. Stop when time runs out.

| # | Feature | Cost | Value |
| --- | --- | --- | --- |
| 6.1 | **Change Genre** — resubmit same memory, new genre | Low (endpoint already exists) | Highest — creates the replay loop |
| 6.2 | **Regenerate Poster** — same `posterPrompt`, new seed | Medium (new endpoint) | High — cheap visual variety |
| 6.3 | **Download poster card** — html2canvas on the poster component | Medium | Medium — shareable artifact |
| 6.4 | CloudFront in front of the frontend | Low | Low — one more service name |
| 6.5 | Share link | High (needs persistence + DynamoDB) | Low — breaks the stateless design |

6.1 is the one that changes how the project reads. Same memory as Comedy, Horror, and Sci-Fi side by side is the demo moment: it proves the app is a creative playground, not a single-shot generator.

6.5 is listed only to be explicitly rejected. It drags in a database and undoes the stateless architecture for a feature nobody is judging.

---

## Phase 7 — Article and submission

**Goal:** submit. Do not skip the article — it's a pass/fail criterion.

**Builder Center article outline (500+ words)**

| Section | ~Words | Content |
| --- | --- | --- |
| Hook | 80 | The Goa memory, then the movie it became |
| The problem | 80 | Four tools for one creative idea |
| What REELFORGE does | 100 | The seven generated artifacts |
| Architecture | 120 | Diagram + why serverless, why no database |
| The structured-output technique | 100 | Forcing JSON so the frontend renders typed fields |
| Why only one poster | 80 | Scope discipline as an engineering decision |
| Why CSS renders the title, not the model | 70 | Image models can't do typography |
| Security choices | 90 | Least-privilege IAM, private bucket, presigned URLs, no browser credentials |
| What I deliberately didn't build | 80 | The exclusion list and the reasoning |
| What broke | 90 | Real problems: JSON parsing, CORS, latency budget |
| What's next | 50 | IaC, auth, video |

Target ~900 words. The sections judges actually notice are the security choices, the exclusion list, and what broke — those are the ones that read as engineering judgment rather than a feature tour.

**Submission checklist**

| # | Item | Done |
| --- | --- | --- |
| 7.1 | Live URL loads and generates a movie | ☐ |
| 7.2 | Public GitHub repo with README + architecture diagram | ☐ |
| 7.3 | Article published, 500+ words | ☐ |
| 7.4 | Architecture diagram in both README and article | ☐ |
| 7.5 | Screenshots embedded | ☐ |
| 7.6 | AWS services named explicitly: Bedrock, Nova, Lambda, API Gateway, S3, IAM | ☐ |
| 7.7 | LICENSE file present | ☐ |
| 7.8 | No secrets, keys, or account IDs in the repo | ☐ |
| 7.9 | Tested in a fresh browser / incognito | ☐ |
| 7.10 | Submitted before the deadline | ☐ |

7.8 deserves a real check, not a glance. Grep the repo for `AKIA`, `secret`, `.env`, and your account ID before pushing.

---

## Time budget reality check

| Phase | Estimate | Cumulative |
| --- | --- | --- |
| 0 — Verify | 1 h | 1 h |
| 1 — Backend core | 4 h | 5 h |
| 2 — Deploy backend | 2 h | 7 h |
| 3 — Frontend | 5 h | 12 h |
| 4 — Wire + deploy | 3 h | **15 h ← submittable** |
| 5 — Polish | 4 h | 19 h |
| 6 — Stretch | 3 h | 22 h |
| 7 — Article + submit | 3 h | 25 h |

Roughly 15 hours to something submittable, 25 to something good. Across Fri evening, Sat, and Sun that's comfortable — provided Phase 0 doesn't surface a model access problem.

**The three things most likely to cost you the weekend:**

1. **Model access not granted.** Bedrock access requests aren't always instant. This is why Phase 0 is first.
2. **The 30-second API Gateway cap.** Two sequential model calls may not fit. Measure in Phase 0, decide immediately.
3. **Prompt tuning rabbit hole.** "Good enough and consistently valid" beats "perfect." Set a hard 90-minute cap on task 1.2 and move on.

---

**Related docs:** [Overview](01-PROJECT-OVERVIEW.md) · [Tech Stack](02-TECH-STACK.md) · [Architecture](03-ARCHITECTURE.md)
