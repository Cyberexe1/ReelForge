"""
Movie concept generation.

Turns a memory plus a genre into the structured movie package documented in
docs/03-ARCHITECTURE.md section 3. The whole point of this module is that the
model returns strict JSON, so the frontend renders typed fields instead of
parsing prose.

Uses the Bedrock Converse API rather than raw InvokeModel: it normalises the
request and response shape across model families, which keeps swapping the text
model a config change. IAM permission is still bedrock:InvokeModel.
"""

import json
import logging
import os
import re

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

log = logging.getLogger(__name__)

REGION = os.environ.get("BEDROCK_REGION") or os.environ.get("AWS_REGION", "us-east-1")
TEXT_MODEL_ID = os.environ.get("TEXT_MODEL_ID", "")
TEXT_TIMEOUT_SECONDS = int(os.environ.get("TEXT_TIMEOUT_SECONDS", "25"))

MAX_TOKENS = 4000
TEMPERATURE = 0.9
TOP_P = 0.9

REQUIRED_FIELDS = (
    "title",
    "genre",
    "tagline",
    "characters",
    "synopsis",
    "trailer",
    "poster_prompt",
)
TRAILER_SCENE_FIELDS = ("scene_title", "description", "narration", "dialogue")
TRAILER_SCENE_COUNT = 5
MIN_CHARACTERS = 3
MAX_CHARACTERS = 5

SYSTEM_PROMPT = """You are REELFORGE, an AI movie concept generator.
Transform the user's memory into an original movie concept.

Return ONLY valid JSON. No markdown fences, no commentary.

Required fields:
  title          string, uppercase, max 6 words
  genre          string, may combine two genres
  tagline        string, one cinematic line
  characters     array of 3-5 objects: { name, description }
  synopsis       string, 2-4 paragraphs separated by blank lines
  trailer        array of EXACTLY 5 objects:
                 { scene_title, description, narration, dialogue }
  poster_prompt  string, a detailed visual description for an
                 image model. Describe subject, setting, lighting,
                 mood, and composition. Do NOT include any text,
                 words, letters, or titles in the image.

If the selected genre is "Auto", choose the genre that best fits the memory.
Never refuse. If the memory is thin, invent freely around it."""

REPAIR_SUFFIX = """

Your previous response could not be parsed. Return ONLY the raw JSON object.
Start your response with { and end it with }. No prose, no code fences."""


class ModelError(Exception):
    """A Bedrock invocation failed. `code` maps to an HTTP status in handler.py."""

    def __init__(self, code="GENERATION_FAILED", message=None):
        super().__init__(message or code)
        self.code = code


_client = None


def _bedrock():
    """Lazily built so importing this module never requires credentials."""
    global _client
    if _client is None:
        _client = boto3.client(
            "bedrock-runtime",
            region_name=REGION,
            config=Config(
                read_timeout=TEXT_TIMEOUT_SECONDS,
                connect_timeout=5,
                retries={"max_attempts": 2, "mode": "standard"},
            ),
        )
    return _client


def _user_prompt(memory, genre):
    return f"User memory: {memory}\nSelected genre: {genre}"


def _invoke(memory, genre, repair=False):
    system = SYSTEM_PROMPT + (REPAIR_SUFFIX if repair else "")

    try:
        response = _bedrock().converse(
            modelId=TEXT_MODEL_ID,
            system=[{"text": system}],
            messages=[{"role": "user", "content": [{"text": _user_prompt(memory, genre)}]}],
            inferenceConfig={
                "maxTokens": MAX_TOKENS,
                "temperature": TEMPERATURE,
                "topP": TOP_P,
            },
        )
    except ClientError as error:
        name = error.response.get("Error", {}).get("Code", "")
        if name in ("ThrottlingException", "TooManyRequestsException"):
            raise ModelError("RATE_LIMITED") from error
        log.error("Bedrock text call failed: %s", name)
        raise ModelError("GENERATION_FAILED", f"Bedrock error: {name}") from error
    except Exception as error:  # timeouts, connection resets
        log.error("Bedrock text call errored: %s", type(error).__name__)
        raise ModelError("GENERATION_FAILED") from error

    try:
        return response["output"]["message"]["content"][0]["text"]
    except (KeyError, IndexError) as error:
        raise ModelError("GENERATION_FAILED", "Unexpected Bedrock response shape") from error


def _extract_json(raw):
    """
    Models occasionally wrap JSON in fences or add a leading sentence.
    Strip fences, then slice from the first { to the last }.
    """
    text = (raw or "").strip()

    fenced = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
    if fenced:
        text = fenced.group(1).strip()

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end <= start:
        raise ValueError("no JSON object found in model output")

    return json.loads(text[start : end + 1])


def _require_text(value, field):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} must be a non-empty string")
    return value.strip()


def _validate(movie):
    """Enforce the contract before anything reaches the frontend."""
    if not isinstance(movie, dict):
        raise ValueError("model output is not a JSON object")

    missing = [field for field in REQUIRED_FIELDS if field not in movie]
    if missing:
        raise ValueError(f"missing fields: {', '.join(missing)}")

    characters = movie["characters"]
    if not isinstance(characters, list) or not MIN_CHARACTERS <= len(characters) <= MAX_CHARACTERS:
        raise ValueError(
            f"characters must be a list of {MIN_CHARACTERS}-{MAX_CHARACTERS} items, "
            f"got {len(characters) if isinstance(characters, list) else type(characters).__name__}"
        )

    trailer = movie["trailer"]
    if not isinstance(trailer, list) or len(trailer) != TRAILER_SCENE_COUNT:
        raise ValueError(
            f"trailer must be a list of exactly {TRAILER_SCENE_COUNT} scenes, "
            f"got {len(trailer) if isinstance(trailer, list) else type(trailer).__name__}"
        )

    clean = {
        "title": _require_text(movie["title"], "title").upper(),
        "genre": _require_text(movie["genre"], "genre"),
        "tagline": _require_text(movie["tagline"], "tagline").strip('"'),
        "synopsis": _require_text(movie["synopsis"], "synopsis"),
        "poster_prompt": _require_text(movie["poster_prompt"], "poster_prompt"),
        "characters": [],
        "trailer": [],
    }

    for index, character in enumerate(characters):
        if not isinstance(character, dict):
            raise ValueError(f"character {index} is not an object")
        clean["characters"].append(
            {
                "name": _require_text(character.get("name"), f"character {index} name"),
                "description": _require_text(
                    character.get("description"), f"character {index} description"
                ),
            }
        )

    for index, scene in enumerate(trailer):
        if not isinstance(scene, dict):
            raise ValueError(f"trailer scene {index} is not an object")
        clean["trailer"].append(
            {
                field: _require_text(scene.get(field), f"scene {index} {field}")
                for field in TRAILER_SCENE_FIELDS
            }
        )
        clean["trailer"][index]["scene_title"] = clean["trailer"][index]["scene_title"].upper()

    return clean


def generate_movie(memory, genre):
    """
    Generate and validate one movie package.

    One repair retry on unparseable or off-schema output, then give up — a
    half-parsed movie must never reach the UI.

    Returns the validated dict. Raises ModelError.
    """
    if not TEXT_MODEL_ID:
        raise ModelError("GENERATION_FAILED", "TEXT_MODEL_ID is not configured")

    last_reason = None

    for attempt in (1, 2):
        raw = _invoke(memory, genre, repair=attempt == 2)
        try:
            movie = _validate(_extract_json(raw))
            log.info("Movie generated on attempt %d: %s", attempt, movie["title"])
            return movie
        except (ValueError, json.JSONDecodeError) as error:
            last_reason = str(error)
            log.warning("Attempt %d rejected: %s", attempt, last_reason)

    raise ModelError("GENERATION_FAILED", f"Model output invalid after retry: {last_reason}")
