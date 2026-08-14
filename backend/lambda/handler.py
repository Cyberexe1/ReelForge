"""
HTTP entry point.

Owns everything protocol-shaped: routing, CORS, input validation, error mapping,
and response formatting. All creative work is delegated to bedrock.py,
poster.py, and s3.py. Contract lives in docs/03-ARCHITECTURE.md section 5.

Note the deliberate asymmetry: a text failure fails the request, an image
failure does not. A movie with a placeholder poster is still usable; a movie
with no story is nothing.
"""

import json
import logging
import os
import uuid

import bedrock
import poster as poster_service
import s3 as storage
from bedrock import ModelError
from s3 import StorageError

log = logging.getLogger()
log.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

MEMORY_MIN = 20
MEMORY_MAX = 2000

ALLOWED_GENRES = frozenset(
    {"Auto", "Comedy", "Drama", "Thriller", "Horror", "Romance", "Sci-Fi", "Fantasy"}
)

# Secure by default: only the local dev server unless the deployment sets this.
# Phase 4 must set ALLOWED_ORIGINS to the deployed frontend origin.
ALLOWED_ORIGINS = tuple(
    origin.strip()
    for origin in os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
)

STATUS_BY_CODE = {
    "MEMORY_TOO_SHORT": 400,
    "MEMORY_TOO_LONG": 400,
    "INVALID_GENRE": 400,
    "INVALID_BODY": 400,
    "MISSING_PROMPT": 400,
    "NOT_FOUND": 404,
    "RATE_LIMITED": 429,
    "GENERATION_FAILED": 502,
    "POSTER_FAILED": 502,
    "TIMEOUT": 504,
}

MESSAGE_BY_CODE = {
    "MEMORY_TOO_SHORT": f"Tell us a little more — at least {MEMORY_MIN} characters.",
    "MEMORY_TOO_LONG": f"That memory is too long. Keep it under {MEMORY_MAX} characters.",
    "INVALID_GENRE": "That genre is not one of the available options.",
    "INVALID_BODY": "Request body must be valid JSON.",
    "MISSING_PROMPT": "A poster prompt is required.",
    "NOT_FOUND": "No such route.",
    "RATE_LIMITED": "REELFORGE is busy right now. Try again in a moment.",
    "GENERATION_FAILED": "The model could not finish this one. Try again.",
    "POSTER_FAILED": "The poster could not be generated.",
    "TIMEOUT": "That took too long to generate. Try a shorter memory.",
}


class RequestError(Exception):
    """Client-side problem. `code` maps to a 4xx status."""

    def __init__(self, code):
        super().__init__(code)
        self.code = code


# --------------------------------------------------------------------------- #
# HTTP plumbing
# --------------------------------------------------------------------------- #


def _cors_headers(event):
    """Echo the request origin only when it is on the allowlist. Never '*'."""
    headers = {key.lower(): value for key, value in (event.get("headers") or {}).items()}
    origin = headers.get("origin", "")
    allowed = origin if origin in ALLOWED_ORIGINS else (ALLOWED_ORIGINS[0] if ALLOWED_ORIGINS else "")

    return {
        "Access-Control-Allow-Origin": allowed,
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Max-Age": "3600",
        "Vary": "Origin",
    }


def _respond(event, status, payload):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json", **_cors_headers(event)},
        "body": json.dumps(payload),
    }


def _error(event, code, detail=None):
    if detail:
        log.warning("Responding %s: %s", code, detail)
    return _respond(
        event,
        STATUS_BY_CODE.get(code, 502),
        {"error": code, "message": MESSAGE_BY_CODE.get(code, "Something went wrong.")},
    )


def _route(event):
    """Read method and path from either an HTTP API (v2) or REST API (v1) event."""
    http = (event.get("requestContext") or {}).get("http") or {}
    method = http.get("method") or event.get("httpMethod") or ""
    path = http.get("path") or event.get("rawPath") or event.get("path") or ""
    return method.upper(), path


def _parse_body(event):
    raw = event.get("body") or "{}"
    if event.get("isBase64Encoded"):
        import base64

        raw = base64.b64decode(raw).decode("utf-8")

    try:
        body = json.loads(raw)
    except (ValueError, UnicodeDecodeError) as error:
        raise RequestError("INVALID_BODY") from error

    if not isinstance(body, dict):
        raise RequestError("INVALID_BODY")
    return body


# --------------------------------------------------------------------------- #
# Validation
# --------------------------------------------------------------------------- #


def _validate_generate(body):
    """Server-side validation. Client-side checks are UX, not security."""
    unexpected = set(body) - {"memory", "genre"}
    if unexpected:
        raise RequestError("INVALID_BODY")

    memory = body.get("memory")
    if not isinstance(memory, str):
        raise RequestError("INVALID_BODY")

    memory = memory.strip()
    if len(memory) < MEMORY_MIN:
        raise RequestError("MEMORY_TOO_SHORT")
    if len(memory) > MEMORY_MAX:
        raise RequestError("MEMORY_TOO_LONG")

    genre = body.get("genre", "Auto")
    if not isinstance(genre, str) or genre not in ALLOWED_GENRES:
        raise RequestError("INVALID_GENRE")

    return memory, genre


# --------------------------------------------------------------------------- #
# Routes
# --------------------------------------------------------------------------- #


def _build_poster(prompt, movie_id):
    """
    Generate and store one poster.
    Returns a presigned URL, or None so the story can still ship without it.
    """
    try:
        image_bytes = poster_service.generate_poster(prompt)
        return storage.upload_poster(image_bytes, movie_id)
    except (ModelError, StorageError) as error:
        log.warning("Poster unavailable for %s, returning story only: %s", movie_id, error)
        return None


def _generate_movie(event):
    memory, genre = _validate_generate(_parse_body(event))
    log.info("Generating: genre=%s memory_length=%d", genre, len(memory))

    movie = bedrock.generate_movie(memory, genre)
    movie_id = uuid.uuid4().hex[:8]

    return _respond(
        event,
        200,
        {
            "movieId": movie_id,
            "title": movie["title"],
            "genre": movie["genre"],
            "tagline": movie["tagline"],
            "characters": movie["characters"],
            "synopsis": movie["synopsis"],
            "trailer": movie["trailer"],
            "posterUrl": _build_poster(movie["poster_prompt"], movie_id),
            "posterPrompt": movie["poster_prompt"],
        },
    )


def _regenerate_poster(event):
    """Same story, new seed. Here the poster IS the request, so failure is fatal."""
    body = _parse_body(event)

    prompt = body.get("posterPrompt")
    if not isinstance(prompt, str) or not prompt.strip():
        raise RequestError("MISSING_PROMPT")

    movie_id = body.get("movieId")
    if not isinstance(movie_id, str) or not movie_id.isalnum():
        movie_id = uuid.uuid4().hex[:8]

    image_bytes = poster_service.generate_poster(prompt)
    url = storage.upload_poster(image_bytes, f"{movie_id}-{uuid.uuid4().hex[:4]}")

    return _respond(event, 200, {"movieId": movie_id, "posterUrl": url})


ROUTES = {
    "generate-movie": _generate_movie,
    "regenerate-poster": _regenerate_poster,
}


def lambda_handler(event, context):
    method, path = _route(event)

    if method == "OPTIONS":
        return {"statusCode": 204, "headers": _cors_headers(event), "body": ""}

    route = ROUTES.get(path.rsplit("/", 1)[-1])
    if method != "POST" or route is None:
        return _error(event, "NOT_FOUND", f"{method} {path}")

    try:
        return route(event)
    except RequestError as error:
        return _error(event, error.code)
    except (ModelError, StorageError) as error:
        return _error(event, error.code, str(error))
    except Exception:
        log.exception("Unhandled error")
        return _error(event, "GENERATION_FAILED")
