"""
Poster generation.

One image per movie. The prompt comes straight from the text model's
`poster_prompt`, and the model is explicitly steered away from rendering any
text — the title and tagline are CSS overlays in the frontend, because image
models are unreliable at typography. See docs/03-ARCHITECTURE.md section 4.

Nova Canvas has no Converse support, so this uses invoke_model directly.
The model ID is an environment variable so swapping image models stays a config
change: Nova Canvas is marked legacy in some regions with a 2026-09-30 EOL.
"""

import base64
import json
import logging
import os
import random

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from bedrock import ModelError

log = logging.getLogger(__name__)

REGION = os.environ.get("BEDROCK_REGION") or os.environ.get("AWS_REGION", "us-east-1")
IMAGE_MODEL_ID = os.environ.get("IMAGE_MODEL_ID", "")
IMAGE_TIMEOUT_SECONDS = int(os.environ.get("IMAGE_TIMEOUT_SECONDS", "25"))

# 2:3 portrait, matching the aspect-2/3 poster frame in the frontend.
POSTER_WIDTH = 768
POSTER_HEIGHT = 1152

CFG_SCALE = 7.0
MAX_PROMPT_CHARS = 1000
MAX_SEED = 858_993_459

# Keeps lettering out of the artwork. Phrased as things to avoid, without
# negation words, which is what Nova Canvas expects.
NEGATIVE_PROMPT = "text, words, letters, title, caption, watermark, signature, logo, border"


_client = None


def _bedrock():
    """Lazily built so importing this module never requires credentials."""
    global _client
    if _client is None:
        _client = boto3.client(
            "bedrock-runtime",
            region_name=REGION,
            config=Config(
                read_timeout=IMAGE_TIMEOUT_SECONDS,
                connect_timeout=5,
                retries={"max_attempts": 1, "mode": "standard"},
            ),
        )
    return _client


def generate_poster(prompt, seed=None):
    """
    Render one poster.

    `seed` is random per call, which is what makes Regenerate Poster produce a
    different image from the same stored prompt.

    Returns PNG bytes. Raises ModelError.
    """
    if not IMAGE_MODEL_ID:
        raise ModelError("POSTER_FAILED", "IMAGE_MODEL_ID is not configured")

    cleaned = (prompt or "").strip()
    if not cleaned:
        raise ModelError("POSTER_FAILED", "empty poster prompt")

    body = {
        "taskType": "TEXT_IMAGE",
        "textToImageParams": {
            "text": cleaned[:MAX_PROMPT_CHARS],
            "negativeText": NEGATIVE_PROMPT,
        },
        "imageGenerationConfig": {
            "numberOfImages": 1,
            "width": POSTER_WIDTH,
            "height": POSTER_HEIGHT,
            "cfgScale": CFG_SCALE,
            "seed": seed if seed is not None else random.randint(0, MAX_SEED),
        },
    }

    try:
        response = _bedrock().invoke_model(
            modelId=IMAGE_MODEL_ID,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(body),
        )
        payload = json.loads(response["body"].read())
    except ClientError as error:
        name = error.response.get("Error", {}).get("Code", "")
        if name in ("ThrottlingException", "TooManyRequestsException"):
            raise ModelError("RATE_LIMITED") from error
        log.error("Bedrock image call failed: %s", name)
        raise ModelError("POSTER_FAILED", f"Bedrock error: {name}") from error
    except Exception as error:
        log.error("Bedrock image call errored: %s", type(error).__name__)
        raise ModelError("POSTER_FAILED") from error

    if payload.get("error"):
        raise ModelError("POSTER_FAILED", str(payload["error"]))

    images = payload.get("images") or []
    if not images:
        raise ModelError("POSTER_FAILED", "model returned no images")

    try:
        image_bytes = base64.b64decode(images[0])
    except (ValueError, TypeError) as error:
        raise ModelError("POSTER_FAILED", "could not decode image data") from error

    log.info("Poster generated: %d bytes", len(image_bytes))
    return image_bytes
