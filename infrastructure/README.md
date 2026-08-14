# REELFORGE — Deployment

Console-first deployment. Infrastructure as code (SAM or CDK) is the right long-term answer, but under a weekend deadline the console is faster and less likely to burn an hour on a stack rollback. These steps are the reproducible record instead.

Corresponds to Phase 2 of `docs/04-BUILD-PHASES.md`.

---

## 0. Verify model access first

Nothing below matters if the models aren't reachable. Bedrock access requests are not always instant.

```bash
aws bedrock list-foundation-models --region <region> --query "modelSummaries[?contains(modelId,'nova')].modelId" --output table
```

Then in the Bedrock console under **Model access**, confirm both the text model and the image model show *Access granted*.

Record the exact IDs — they become `TEXT_MODEL_ID` and `IMAGE_MODEL_ID`.

> Amazon Nova Canvas is marked legacy in some regions with an end-of-life date of 2026-09-30, and the Nova 2 family documents its own image generation. Confirm what your region actually offers before locking this in. Both model IDs are environment variables precisely so this stays a config change.

Measure the round trip while you're here. Text plus image must fit inside API Gateway's **30-second** integration cap. If it doesn't, split into `/generate-story` and `/generate-poster` before writing any more code.

---

## 1. S3 bucket

```bash
aws s3api create-bucket --bucket reelforge-<account-id>-<region> --region <region>
```

Then:

- **Block Public Access: ON** (all four settings). The bucket is never public; Lambda returns presigned GET URLs.
- Lifecycle rule: expire objects under `posters/` after **7 days**. These are demo artifacts, not user data, and it keeps storage cost at effectively zero.

---

## 2. IAM execution role

Create a role for Lambda with the managed `AWSLambdaBasicExecutionRole` (CloudWatch Logs) plus this inline policy. No wildcards on models, no wildcard on the bucket, no `AdministratorAccess`.

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
      "Resource": "arn:aws:s3:::reelforge-<account-id>-<region>/posters/*"
    }
  ]
}
```

`bedrock:InvokeModel` covers the Converse API used for text generation as well as the raw `invoke_model` call used for the image.

---

## 3. Lambda function

| Setting | Value |
| --- | --- |
| Runtime | Python 3.12 |
| Handler | `handler.lambda_handler` |
| Memory | 1024 MB |
| Timeout | 60 s |
| Role | the role from step 2 |
| Reserved concurrency | 5 — a hard ceiling on spend |

The runtime already includes boto3, so the package has no dependencies:

```bash
cd backend/lambda
zip -r ../reelforge-lambda.zip handler.py bedrock.py poster.py s3.py
aws lambda update-function-code --function-name reelforge --zip-file fileb://../reelforge-lambda.zip
```

PowerShell equivalent for the zip step:

```powershell
Compress-Archive -Path backend\lambda\*.py -DestinationPath backend\reelforge-lambda.zip -Force
```

### Environment variables

| Variable | Required | Example | Notes |
| --- | --- | --- | --- |
| `TEXT_MODEL_ID` | yes | `amazon.nova-pro-v1:0` | from step 0 |
| `IMAGE_MODEL_ID` | yes | `amazon.nova-canvas-v1:0` | from step 0 |
| `POSTER_BUCKET` | yes | `reelforge-123456789012-us-east-1` | |
| `ALLOWED_ORIGINS` | yes | `https://reelforge.example` | comma-separated; **never `*`** |
| `BEDROCK_REGION` | no | `us-east-1` | defaults to the Lambda's region |
| `PRESIGN_TTL_SECONDS` | no | `3600` | poster URL lifetime |
| `TEXT_TIMEOUT_SECONDS` | no | `25` | keep the sum under the API Gateway cap |
| `IMAGE_TIMEOUT_SECONDS` | no | `25` | |
| `LOG_LEVEL` | no | `INFO` | |

`ALLOWED_ORIGINS` defaults to `http://localhost:5173`, so a deployment that forgets to set it fails closed rather than open.

### Console test event

```json
{
  "requestContext": { "http": { "method": "POST", "path": "/generate-movie" } },
  "headers": { "Origin": "http://localhost:5173" },
  "body": "{\"memory\":\"Four college friends missed their train to Goa after their final semester. They had almost no money, but they decided to travel anyway.\",\"genre\":\"Comedy\"}"
}
```

---

## 4. API Gateway (HTTP API)

Create an **HTTP API** — cheaper and lower latency than a REST API, and this project needs none of the REST extras.

| Route | Integration |
| --- | --- |
| `POST /generate-movie` | Lambda proxy → `reelforge` |
| `POST /regenerate-poster` | Lambda proxy → `reelforge` |

CORS can be left to the Lambda, which sets the headers itself and validates the origin against `ALLOWED_ORIGINS`. If you configure CORS at the API level too, the origins must match, or the browser sees duplicate headers.

Set a throttle on the default stage (for example 5 rps burst, 2 rps steady). The endpoint is public and every call costs money.

### Smoke test

```bash
curl -X POST "$API_URL/generate-movie" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{"memory":"Four college friends missed their train to Goa after their final semester. They had almost no money, but they decided to travel anyway.","genre":"Comedy"}'
```

Expect a JSON body with `title`, `trailer` (5 scenes), and a `posterUrl` that opens in a browser.

A `posterUrl` of `null` with everything else populated means text generation worked and image generation did not — check CloudWatch for the `Poster unavailable` warning. That degradation is intentional.

---

## 5. Frontend

```bash
cd frontend
echo "VITE_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com" > .env.local
npm run build
aws s3 sync dist/ s3://<frontend-bucket>/ --delete
```

Then set `ALLOWED_ORIGINS` on the Lambda to the deployed frontend origin and remove localhost.

The browser only ever receives the API URL. No AWS credentials reach the client.

---

## 6. Cost guardrails

- AWS Budgets alert on the account
- Lambda reserved concurrency (step 3)
- API Gateway stage throttling (step 4)
- S3 lifecycle expiry (step 1)

The endpoint is unauthenticated, which is acceptable for a demo but not for production. Production would need auth or a CAPTCHA in front of `POST /generate-movie`.

---

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| 403 `AccessDeniedException` from Bedrock | Model access not granted, or the role's model ARN doesn't match `TEXT_MODEL_ID` |
| 502 `GENERATION_FAILED` immediately | `TEXT_MODEL_ID` unset or wrong for the region |
| 502 with `Model output invalid after retry` in logs | Prompt drift; check the logged rejection reason |
| `posterUrl` always null | Image model access, wrong `IMAGE_MODEL_ID`, or unsupported width/height |
| CORS error in the browser | `ALLOWED_ORIGINS` doesn't include the exact origin, scheme included |
| 504 or Lambda timeout | Two model calls exceeding the 30s API Gateway cap — split the endpoints |
| `NoSuchBucket` | `POSTER_BUCKET` typo, or bucket in a different region |
