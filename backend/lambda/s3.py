"""
Poster storage.

The bucket stays private with Block Public Access on. Lambda returns a
time-limited presigned GET URL instead, which costs one extra call and avoids
a publicly readable bucket. See docs/03-ARCHITECTURE.md section 6.
"""

import logging
import os

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

log = logging.getLogger(__name__)

REGION = os.environ.get("AWS_REGION", "us-east-1")
POSTER_BUCKET = os.environ.get("POSTER_BUCKET", "")
POSTER_PREFIX = "posters"
PRESIGN_TTL_SECONDS = int(os.environ.get("PRESIGN_TTL_SECONDS", "3600"))


class StorageError(Exception):
    """An S3 operation failed."""

    def __init__(self, message="storage failed"):
        super().__init__(message)
        self.code = "POSTER_FAILED"


_client = None


def _s3():
    """Lazily built so importing this module never requires credentials."""
    global _client
    if _client is None:
        _client = boto3.client(
            "s3",
            region_name=REGION,
            # SigV4 is required for presigned URLs to validate in every region.
            config=Config(signature_version="s3v4", retries={"max_attempts": 2}),
        )
    return _client


def upload_poster(image_bytes, movie_id):
    """
    Store one poster and return a presigned GET URL for it.

    Raises StorageError.
    """
    if not POSTER_BUCKET:
        raise StorageError("POSTER_BUCKET is not configured")

    key = f"{POSTER_PREFIX}/{movie_id}.png"

    try:
        _s3().put_object(
            Bucket=POSTER_BUCKET,
            Key=key,
            Body=image_bytes,
            ContentType="image/png",
            CacheControl="public, max-age=31536000, immutable",
        )
        url = _s3().generate_presigned_url(
            "get_object",
            Params={"Bucket": POSTER_BUCKET, "Key": key},
            ExpiresIn=PRESIGN_TTL_SECONDS,
        )
    except (ClientError, BotoCoreError) as error:
        log.error("S3 upload failed for %s: %s", key, type(error).__name__)
        raise StorageError(f"could not store poster: {type(error).__name__}") from error

    log.info("Poster stored at s3://%s/%s", POSTER_BUCKET, key)
    return url
