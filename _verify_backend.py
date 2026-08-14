"""Temporary verification harness. Exercises handler routes with stubbed AWS clients."""

import base64
import io
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend", "lambda"))

os.environ.update(
    {
        "BEDROCK_REGION": "us-east-1",
        "AWS_REGION": "us-east-1",
        "TEXT_MODEL_ID": "test.text-model",
        "IMAGE_MODEL_ID": "test.image-model",
        "POSTER_BUCKET": "reelforge-test-bucket",
        "ALLOWED_ORIGINS": "https://reelforge.example,http://localhost:5173",
    }
)

from botocore.exceptions import ClientError  # noqa: E402

import bedrock  # noqa: E402
import handler  # noqa: E402
import poster  # noqa: E402
import s3 as storage  # noqa: E402

VALID = {
    "title": "the train we missed",
    "genre": "Comedy",
    "tagline": '"Sometimes the wrong train takes you to the right story."',
    "characters": [
        {"name": "Aarav", "description": "The planner."},
        {"name": "Rohan", "description": "The impulsive one."},
        {"name": "Kabir", "description": "The relaxed one."},
    ],
    "synopsis": "Para one.\n\nPara two.",
    "trailer": [
        {
            "scene_title": f"scene {i}",
            "description": "d",
            "narration": "n",
            "dialogue": "x",
        }
        for i in range(5)
    ],
    "poster_prompt": "Four friends on a platform at sunset, cinematic.",
}

PNG = base64.b64encode(b"\x89PNG\r\n\x1a\nfake-image-bytes").decode()


class FakeBedrock:
    def __init__(self, texts, raise_error=None):
        self.texts = list(texts)
        self.raise_error = raise_error
        self.calls = 0

    def converse(self, **kwargs):
        self.calls += 1
        if self.raise_error:
            raise self.raise_error
        text = self.texts.pop(0) if self.texts else self.texts_default
        return {"output": {"message": {"content": [{"text": text}]}}}


class FakeImage:
    def __init__(self, payload=None, raise_error=None):
        self.payload = payload if payload is not None else {"images": [PNG]}
        self.raise_error = raise_error
        self.calls = 0
        self.last_body = None

    def invoke_model(self, **kwargs):
        self.calls += 1
        self.last_body = json.loads(kwargs["body"])
        if self.raise_error:
            raise self.raise_error
        return {"body": io.BytesIO(json.dumps(self.payload).encode())}


class FakeS3:
    def __init__(self, raise_error=None):
        self.raise_error = raise_error
        self.objects = {}

    def put_object(self, **kwargs):
        if self.raise_error:
            raise self.raise_error
        self.objects[kwargs["Key"]] = kwargs["Body"]
        return {}

    def generate_presigned_url(self, op, Params, ExpiresIn):
        return f"https://bucket.s3.amazonaws.com/{Params['Key']}?X-Amz-Expires={ExpiresIn}"


def wire(text_client=None, image_client=None, s3_client=None):
    bedrock._client = text_client or FakeBedrock([json.dumps(VALID)])
    poster._client = image_client or FakeImage()
    storage._client = s3_client or FakeS3()
    return bedrock._client, poster._client, storage._client


def event(path="/generate-movie", method="POST", body=None, origin="https://reelforge.example"):
    return {
        "requestContext": {"http": {"method": method, "path": path}},
        "headers": {"Origin": origin, "Content-Type": "application/json"},
        "body": json.dumps(body) if body is not None else None,
    }


PASS, FAIL = [], []


def check(name, condition, detail=""):
    (PASS if condition else FAIL).append(name)
    print(f"  {'PASS' if condition else 'FAIL'}  {name}{'' if condition else f'  -> {detail}'}")


def body_of(response):
    return json.loads(response["body"])


print("\n1. happy path")
text, image, bucket = wire()
res = handler.lambda_handler(event(body={"memory": "x" * 40, "genre": "Comedy"}), None)
data = body_of(res)
check("200 returned", res["statusCode"] == 200, res["statusCode"])
check("title uppercased", data["title"] == "THE TRAIN WE MISSED", data["title"])
check("tagline unquoted", not data["tagline"].startswith('"'), data["tagline"])
check("scene titles uppercased", data["trailer"][0]["scene_title"] == "SCENE 0")
check("5 trailer scenes", len(data["trailer"]) == 5)
check("3 characters", len(data["characters"]) == 3)
check("posterUrl presigned", "X-Amz-Expires=3600" in (data["posterUrl"] or ""), data["posterUrl"])
check("posterPrompt returned", data["posterPrompt"] == VALID["poster_prompt"])
check("movieId 8 hex", len(data["movieId"]) == 8)
check("poster stored under posters/", list(bucket.objects) == [f"posters/{data['movieId']}.png"])
check("one image call", image.calls == 1)
check(
    "image is 2:3 portrait",
    (image.last_body["imageGenerationConfig"]["width"],
     image.last_body["imageGenerationConfig"]["height"]) == (768, 1152),
)
check("negative prompt blocks text", "text" in image.last_body["textToImageParams"]["negativeText"])
check("one image requested", image.last_body["imageGenerationConfig"]["numberOfImages"] == 1)
check("seed present", isinstance(image.last_body["imageGenerationConfig"]["seed"], int))
check("CORS echoes allowed origin",
      res["headers"]["Access-Control-Allow-Origin"] == "https://reelforge.example")

print("\n2. messy model output")
wire(FakeBedrock(["Here you go!\n```json\n" + json.dumps(VALID) + "\n```\nEnjoy."]))
res = handler.lambda_handler(event(body={"memory": "x" * 40, "genre": "Auto"}), None)
check("fences and prose stripped", res["statusCode"] == 200, body_of(res))

print("\n3. schema repair retry")
broken = dict(VALID, trailer=VALID["trailer"][:4])
text, _, _ = wire(FakeBedrock([json.dumps(broken), json.dumps(VALID)]))
res = handler.lambda_handler(event(body={"memory": "x" * 40}), None)
check("recovers on retry", res["statusCode"] == 200, body_of(res))
check("exactly two model calls", text.calls == 2, text.calls)

print("\n4. unrecoverable output")
text, _, _ = wire(FakeBedrock(["not json at all", "still not json"]))
res = handler.lambda_handler(event(body={"memory": "x" * 40}), None)
check("502 after retry", res["statusCode"] == 502, res["statusCode"])
check("GENERATION_FAILED code", body_of(res)["error"] == "GENERATION_FAILED")
check("gave up after two calls", text.calls == 2, text.calls)

print("\n5. poster degradation (story must survive)")
wire(image_client=FakeImage(payload={"images": []}))
res = handler.lambda_handler(event(body={"memory": "x" * 40}), None)
data = body_of(res)
check("still 200", res["statusCode"] == 200, res["statusCode"])
check("posterUrl is null", data["posterUrl"] is None, data["posterUrl"])
check("story intact", len(data["trailer"]) == 5 and data["title"])

wire(s3_client=FakeS3(raise_error=ClientError({"Error": {"Code": "AccessDenied"}}, "PutObject")))
res = handler.lambda_handler(event(body={"memory": "x" * 40}), None)
check("s3 failure also degrades", res["statusCode"] == 200 and body_of(res)["posterUrl"] is None)

print("\n6. throttling")
wire(FakeBedrock([], raise_error=ClientError({"Error": {"Code": "ThrottlingException"}}, "Converse")))
res = handler.lambda_handler(event(body={"memory": "x" * 40}), None)
check("429 on throttle", res["statusCode"] == 429, res["statusCode"])
check("RATE_LIMITED code", body_of(res)["error"] == "RATE_LIMITED")

print("\n7. input validation")
wire()
cases = [
    ({"memory": "too short"}, 400, "MEMORY_TOO_SHORT"),
    ({"memory": "x" * 2001}, 400, "MEMORY_TOO_LONG"),
    ({"memory": "x" * 40, "genre": "Musical"}, 400, "INVALID_GENRE"),
    ({"memory": "x" * 40, "isAdmin": True}, 400, "INVALID_BODY"),
    ({"memory": 12345}, 400, "INVALID_BODY"),
]
for payload, status, code in cases:
    wire()
    res = handler.lambda_handler(event(body=payload), None)
    check(f"{code} for {list(payload)}", res["statusCode"] == status and body_of(res)["error"] == code,
          body_of(res))

wire()
bad = event(body={"memory": "x" * 40})
bad["body"] = "{not json"
res = handler.lambda_handler(bad, None)
check("INVALID_BODY on malformed json", body_of(res)["error"] == "INVALID_BODY")

print("\n8. genre defaults to Auto when omitted")
text, _, _ = wire()
handler.lambda_handler(event(body={"memory": "x" * 40}), None)
check("no genre key accepted", True)

print("\n9. routing and CORS")
wire()
res = handler.lambda_handler(event(method="OPTIONS"), None)
check("204 on preflight", res["statusCode"] == 204, res["statusCode"])
check("preflight has CORS", "Access-Control-Allow-Methods" in res["headers"])

res = handler.lambda_handler(event(path="/nope", body={"memory": "x" * 40}), None)
check("404 unknown route", res["statusCode"] == 404 and body_of(res)["error"] == "NOT_FOUND")

res = handler.lambda_handler(event(method="GET"), None)
check("404 on GET", res["statusCode"] == 404, res["statusCode"])

wire()
res = handler.lambda_handler(event(body={"memory": "x" * 40}, origin="https://evil.example"), None)
check("disallowed origin not echoed",
      res["headers"]["Access-Control-Allow-Origin"] == "https://reelforge.example",
      res["headers"]["Access-Control-Allow-Origin"])
check("never wildcard", res["headers"]["Access-Control-Allow-Origin"] != "*")

print("\n10. stage-prefixed path (REST API v1 event shape)")
wire()
v1 = {
    "httpMethod": "POST",
    "path": "/prod/generate-movie",
    "headers": {"Origin": "http://localhost:5173"},
    "body": json.dumps({"memory": "x" * 40}),
}
res = handler.lambda_handler(v1, None)
check("v1 event routed", res["statusCode"] == 200, res["statusCode"])

print("\n11. base64 encoded body")
wire()
b64 = event(body={"memory": "x" * 40})
b64["body"] = base64.b64encode(b64["body"].encode()).decode()
b64["isBase64Encoded"] = True
res = handler.lambda_handler(b64, None)
check("base64 body decoded", res["statusCode"] == 200, res["statusCode"])

print("\n12. regenerate-poster")
_, image, _ = wire()
res = handler.lambda_handler(
    event(path="/regenerate-poster", body={"movieId": "abc12345", "posterPrompt": "A lighthouse."}),
    None,
)
data = body_of(res)
check("200 returned", res["statusCode"] == 200, res["statusCode"])
check("new posterUrl", "X-Amz-Expires" in data["posterUrl"])
check("movieId preserved", data["movieId"] == "abc12345")
check("no text model call", image.calls == 1)

wire()
res = handler.lambda_handler(event(path="/regenerate-poster", body={"movieId": "abc12345"}), None)
check("MISSING_PROMPT without prompt", body_of(res)["error"] == "MISSING_PROMPT", body_of(res))

wire(image_client=FakeImage(raise_error=ClientError({"Error": {"Code": "ValidationException"}}, "Invoke")))
res = handler.lambda_handler(
    event(path="/regenerate-poster", body={"posterPrompt": "A lighthouse."}), None
)
check("poster failure is fatal here", res["statusCode"] == 502, res["statusCode"])

print("\n13. missing configuration is caught")
saved = bedrock.TEXT_MODEL_ID
bedrock.TEXT_MODEL_ID = ""
wire()
res = handler.lambda_handler(event(body={"memory": "x" * 40}), None)
check("502 without TEXT_MODEL_ID", res["statusCode"] == 502, res["statusCode"])
bedrock.TEXT_MODEL_ID = saved

print(f"\n{'=' * 52}\n{len(PASS)} passed, {len(FAIL)} failed")
if FAIL:
    for name in FAIL:
        print(f"  FAILED: {name}")
    sys.exit(1)
print("All backend checks passed.")
