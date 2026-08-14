# REELFORGE — Project Overview

> **One line:** REELFORGE turns a single personal memory into an alternate cinematic universe — title, tagline, cast, synopsis, a 5-scene trailer script, and one AI-generated poster.

| Field | Value |
| --- | --- |
| Project name | REELFORGE |
| Category | AI creative web application |
| Event | AWS Weekend Creative Challenge |
| Window | Aug 14–17, 2026 |
| Primary AWS service | Amazon Bedrock (text + image) |
| Supporting AWS services | AWS Lambda, Amazon API Gateway, Amazon S3, AWS IAM |
| Deliverables | Working app + public repo + 500+ word Builder Center article |

---

## 1. The problem

People carry thousands of small, vivid experiences. Turning one of them into something creative today means stitching together four different tools: one to write the story, one to shape it into a movie concept, one to generate artwork, one to lay out a poster. Each has its own account, its own prompt style, its own output format.

REELFORGE collapses that into a single input box.

```
USER MEMORY
     |
     v
 REELFORGE
     |
  +--+---------------+---------------+
  v                  v               v
STORY            TRAILER          POSTER
```

## 2. Core concept

The user supplies a memory (or a fictional scenario) and optionally picks a genre. REELFORGE returns a complete movie package built from that memory.

**Input**

```
Four college friends missed their train to Goa after their final semester.
They had very little money, so they decided to travel anyway.
```

**Genre options:** Comedy · Drama · Thriller · Horror · Romance · Sci-Fi · Fantasy · Auto

**Output**

| # | Artifact | Detail |
| --- | --- | --- |
| 1 | Movie title | `THE TRAIN WE MISSED` |
| 2 | Genre label | Coming-of-Age / Comedy |
| 3 | Tagline | *"Sometimes the wrong train takes you to the right story."* |
| 4 | Characters | 3–5 named characters, each with a one-line role description |
| 5 | Synopsis | 2–4 paragraphs of complete story |
| 6 | Trailer | Exactly 5 scenes: title, description, narration, dialogue |
| 7 | Poster | One AI-generated cinematic image |

## 3. Why only ONE poster

This is a deliberate scope decision, not a limitation.

Generating ten images, a video, a voiceover, and a soundtrack would eat the entire weekend and produce a demo that loads slowly and fails unpredictably. One poster gives the project a strong visual identity at a fraction of the latency and cost.

```
ONE MEMORY
     |
 AI STORY WORLD
     |
  +--+-----------+
  v              v
Text Content   ONE POSTER
  |              |
  +------+-------+
         v
   MOVIE PACKAGE
```

**Related decision:** the image model is *not* asked to render the movie title. Text rendering inside generated images is unreliable. Instead the model produces clean cinematic artwork, and React/CSS overlays the title, tagline, and genre. Better typography, consistent every time.

```
+---------------------+
| THE TRAIN WE MISSED |
|                     |
|     AI ARTWORK      |
|                     |
| "Sometimes the..."  |
+---------------------+
```

## 4. The differentiator

Do not pitch this as "an AI movie generator." That's generic and forgettable.

Pitch the transformation:

```
REALITY -> MEMORY -> AI INTERPRETATION -> MOVIE -> VISUAL IDENTITY
```

And pitch the replay loop. The same memory, reinterpreted:

| Genre | Resulting title |
| --- | --- |
| Comedy | The Train We Missed |
| Horror | The Last Train to Goa |
| Sci-Fi | Goa 2099 |
| Thriller | Platform 13 |

That "change genre" loop is what turns a one-shot generator into a creative playground worth demoing twice.

## 5. Screens

Three screens, no more.

**Landing** — brand, one-line promise, single CTA.

```
REELFORGE
Your memory. Your movie.
Turn one moment into a movie that never existed.
        [ Create Movie ]
```

**Create** — textarea + genre selector + submit.

**Movie** — the money screen. Large poster card, then title, tagline, genre, synopsis, cast, trailer timeline, and three actions: `Change Genre`, `Regenerate Poster`, `Download`.

## 6. Scope boundaries

### In scope (MVP)

- Memory input + genre selection
- One `POST /generate-movie` call returning the full package
- Poster stored in S3, served to the browser via a presigned URL
- Result page rendering all seven artifacts
- Error and loading states that don't look broken

### Stretch (only if MVP is done and deployed)

- Change Genre (highest value — do this first)
- Regenerate Poster (same story, new seed)
- Download poster card as PNG
- CloudFront in front of the frontend

### Explicitly NOT building

| Excluded | Why |
| --- | --- |
| User authentication | No user data to protect in MVP |
| DynamoDB / any database | Nothing needs to persist between requests |
| Movie history, profiles, sharing feeds | Social features are a different product |
| Video generation | Minutes of latency, high cost, high failure rate |
| Voice cloning / background music | Adds no points against the judging criteria |
| 10 images per movie | 10x cost and latency for marginal gain |
| Agents, RAG, vector DB | Nothing here needs retrieval |

Every one of these is a legitimate v2 idea. None are needed to submit.

## 7. Challenge fit

The challenge judges on three pass/fail categories.

**Completeness** — working app, Builder Center article, public repo, live URL, architecture diagram, written explanation of design decisions.

**Relevance & functionality** — REELFORGE is unambiguously creative output: stories, characters, movie concepts, trailer scripts, and artwork. It works end to end from one input.

**AWS service usage** — Bedrock (two model invocations, text and image), Lambda, API Gateway, S3, IAM with least-privilege scoping. Well past the one-service minimum.

The jacket goes to the first 50 qualifying submissions, so *finishing and submitting* beats *polishing*. Ship the MVP, then improve.

## 8. Open item to resolve before coding

AWS documentation marks Amazon Nova Canvas as legacy in some regions with an end-of-life date of September 30, 2026, and the newer Nova 2 family documents its own image-generation capabilities. The challenge date (Aug 14, 2026) is before that EOL, so Canvas is likely still usable — but this must be confirmed against the actual deployment region and account model access before the architecture is locked.

Mitigation: the image model ID lives in a single environment variable and is called through one function (`poster.py`). Swapping models is a config change, not a refactor. See Phase 0 in `04-BUILD-PHASES.md`.

---

**Related docs:** [Tech Stack](02-TECH-STACK.md) · [Architecture](03-ARCHITECTURE.md) · [Build Phases](04-BUILD-PHASES.md)
