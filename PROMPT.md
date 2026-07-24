
# World Wide Waddles: MVP Technical Proposal

## Overview

**World Wide Waddles** is a browser-based, Flappy Bird-style game hosted entirely on AWS at:

**https://waddles.website**

Players guide Waddles through AWS-themed obstacles, earn a score, and optionally submit it to a global leaderboard.

The first version should prioritize:

* Fast gameplay on desktop and mobile
* No account required
* Global leaderboard
* Minimal operational overhead
* Near-zero cost while traffic is low
* Infrastructure deployed entirely through code
* Easy enough to build and iterate on with an AI coding agent

---

## MVP Gameplay

The game runs entirely in the browser.

### Core loop

1. Player opens `waddles.website`
2. Player clicks or taps to start
3. Waddles moves upward when the player clicks, taps, or presses Space
4. Waddles passes between obstacles
5. Each cleared obstacle adds one point
6. Collision ends the game
7. Player can submit their score using a display name
8. Player can immediately restart

### AWS theme

The game can use lightweight AWS references without making the mechanics complicated.

Possible obstacle themes:

* S3 buckets
* CloudFormation stacks
* API Gateway gates
* CloudWatch alarms
* Availability Zones
* NAT Gateway invoices

Possible death messages:

* `Waddles experienced a service interruption`
* `Deployment rolled back`
* `Health check failed`
* `ThrottlingException`
* `Your NAT Gateway bill arrived`

These are presentation details and should not block the initial playable version.

---

## MVP Features

### Required

* Responsive browser game
* Touch, mouse, and keyboard controls
* Current score
* Personal best stored in the browser
* Game-over screen
* Player name input
* Global top-score leaderboard
* Daily leaderboard
* Basic server-side score validation
* Shareable result link or share text
* Basic analytics
* Custom domain with HTTPS

### Not included initially

* User accounts
* Multiplayer
* Real-time lobbies
* Character customization
* Purchases
* Achievements
* Friends lists
* Native mobile apps
* Complex anti-cheat systems
* WebSockets

---

# Proposed AWS Architecture

```text
Player
  |
  v
Route 53
  |
  v
CloudFront
  |
  +--------------------+
  |                    |
  v                    v
Private S3 Bucket      API Gateway HTTP API
Game Assets                 |
                             v
                         AWS Lambda
                             |
                             v
                         DynamoDB
```

## Frontend hosting

### Amazon S3

Store the compiled static game files:

* HTML
* JavaScript
* CSS
* Sprites
* Sound effects
* Fonts
* Social preview image

The S3 bucket should remain private. CloudFront should access it through Origin Access Control rather than exposing the bucket as a public S3 website.

### Amazon CloudFront

CloudFront serves the game globally and handles:

* HTTPS
* CDN caching
* Compression
* Custom domain support
* Redirecting HTTP to HTTPS
* Security headers
* Optional request filtering

CloudFront is designed to deliver static and dynamic web content through edge locations. AWS currently also offers CloudFront plans beginning at $0 per month, although pay-as-you-go remains an option.

### Amazon Route 53

Route 53 provides DNS for:

* `waddles.website`
* `www.waddles.website`
* `api.waddles.website`, if a separate API hostname is desired

Both the root domain and `www` can point to CloudFront using alias records. AWS documents this standard Route 53 and CloudFront architecture for static sites.

### AWS Certificate Manager

Use a free public ACM certificate for:

* `waddles.website`
* `www.waddles.website`
* `api.waddles.website`

The CloudFront certificate must be created in `us-east-1`.

---

# Game Implementation

## Recommended frontend stack

Keep the game client intentionally small:

* TypeScript
* Vite
* Phaser, or plain Canvas
* Vitest
* Static output

### Phaser versus Canvas

**Phaser** is probably the best vibe-coding choice because it already handles:

* Game loops
* Physics
* Sprite loading
* Input
* Collision detection
* Scene management
* Mobile scaling

Plain Canvas would produce a smaller bundle, but more core game behavior would need to be implemented manually.

### Frontend state

The browser should own all real-time gameplay state:

```ts
type GameState = {
  runId: string;
  score: number;
  startedAt: number;
  endedAt?: number;
  status: "idle" | "playing" | "gameOver";
};
```

Do not send an API request for every obstacle, flap, or score increment.

The backend should only be called when:

* A run starts
* A run ends and a score is submitted
* The leaderboard is loaded

This avoids unnecessary API calls and keeps gameplay latency independent from AWS.

---

# Backend API

Use an **API Gateway HTTP API**, not a REST API.

HTTP APIs offer a smaller feature set at a lower cost and are sufficient for this MVP.

## API routes

### Start a run

```http
POST /runs
```

Response:

```json
{
  "runId": "01JXYZ...",
  "runToken": "signed-token",
  "startedAt": "2026-07-24T12:00:00Z"
}
```

This gives the browser a server-issued run identifier before gameplay begins.

### Submit a score

```http
POST /runs/{runId}/score
```

Request:

```json
{
  "playerName": "Sean",
  "score": 27,
  "durationMs": 48320,
  "runToken": "signed-token"
}
```

Response:

```json
{
  "accepted": true,
  "rank": 14,
  "personalBest": true
}
```

### Read the global leaderboard

```http
GET /leaderboards/global?limit=25
```

### Read the daily leaderboard

```http
GET /leaderboards/daily?limit=25
```

### Health check

```http
GET /health
```

A dedicated health route is optional. API Gateway and Lambda metrics may already provide enough visibility.

---

# AWS Lambda

Use one small Lambda function for the API.

Recommended configuration:

```text
Runtime: Node.js
Architecture: ARM64
Memory: 256 MB
Timeout: 5 seconds
Reserved concurrency: not configured
Provisioned concurrency: disabled
```

The Lambda should contain route handlers for:

* Creating runs
* Validating submissions
* Saving scores
* Querying leaderboards

Avoid a Lambda function per route at first. One function means:

* Fewer resources
* Easier deployment
* Shared validation code
* Less configuration
* Faster iteration

Lambda charges per invocation and execution time and includes a monthly free allocation for eligible accounts. Provisioned concurrency should remain disabled so the API can scale down when unused.

---

# DynamoDB Data Model

DynamoDB is a good fit because it is serverless, fully managed, and supports on-demand capacity that charges according to usage rather than reserved database servers.

Use one table:

```text
WorldWideWaddles
```

Enable:

```text
Billing mode: PAY_PER_REQUEST
Point-in-time recovery: optional for MVP
Deletion protection: enabled in production
```

## Score item

```json
{
  "pk": "SCORE#01JXYZ",
  "sk": "SCORE#01JXYZ",
  "runId": "01JXYZ",
  "playerName": "Sean",
  "score": 27,
  "durationMs": 48320,
  "createdAt": "2026-07-24T12:01:00Z",
  "expiresAt": 1816430460,
  "entityType": "score",
  "globalPartition": "GLOBAL",
  "dailyPartition": "DAY#2026-07-24"
}
```

## Global leaderboard index

```text
GSI1PK: GLOBAL
GSI1SK: SCORE#0000000027#2026-07-24T12:01:00Z
```

## Daily leaderboard index

```text
GSI2PK: DAY#2026-07-24
GSI2SK: SCORE#0000000027#2026-07-24T12:01:00Z
```

The score portion should be left-padded so DynamoDB sorts it correctly.

To retrieve scores from highest to lowest:

```ts
ScanIndexForward: false
```

## Run item

```json
{
  "pk": "RUN#01JXYZ",
  "sk": "RUN#01JXYZ",
  "startedAt": "2026-07-24T12:00:00Z",
  "expiresAt": 1784908800,
  "submitted": false
}
```

Run records can expire after a few hours or days using DynamoDB TTL.

Score records can either remain permanently or expire after a defined period, such as one year.

---

# Basic Anti-Cheat

A browser game cannot be made completely cheat-proof because players control the frontend.

The MVP goal should be to stop trivial score submissions, not create a competitive gaming security platform.

## Initial validation

Reject a submission when:

* The run ID does not exist
* The run token is invalid
* The run has already been submitted
* The score is negative
* The score exceeds a configured maximum
* The duration is impossibly short for the score
* The player name is invalid
* The request body is too large

Example validation:

```ts
const minimumMillisecondsPerPoint = 700;

if (durationMs < score * minimumMillisecondsPerPoint) {
  throw new InvalidScoreError();
}
```

## Signed run token

When a run starts, Lambda can sign a compact token containing:

```json
{
  "runId": "01JXYZ",
  "startedAt": 1784894400000,
  "version": 1
}
```

Sign it with an HMAC secret stored in:

* AWS Systems Manager Parameter Store, or
* An encrypted Lambda environment variable

Secrets Manager is unnecessary for the first version unless automatic secret rotation is required.

## Later anti-cheat improvements

* Send checkpoint timestamps during a run
* Rate-limit submissions by IP
* Store suspicious scores separately
* Require manual review for extreme scores
* Replay deterministic obstacle seeds
* Use AWS WAF for abusive traffic

These should only be added when abuse actually appears.

---

# Caching

## Static assets

Use long-lived immutable caching for hashed assets:

```http
Cache-Control: public, max-age=31536000, immutable
```

Use a short cache for the HTML entry point:

```http
Cache-Control: public, max-age=0, must-revalidate
```

## Leaderboards

Cache leaderboard responses for approximately 10–30 seconds.

Possible implementation:

```http
Cache-Control: public, max-age=10, s-maxage=30
```

This reduces repeated DynamoDB reads while still making the leaderboard feel current.

Do not add ElastiCache or Redis to the MVP.

---

# Player Identity

Do not require registration.

Use a simple display name with constraints:

* 2–16 characters
* Letters, numbers, underscores, spaces, and hyphens
* Profanity filtering
* Escaped before rendering
* No HTML

Store the player’s preferred name locally:

```ts
localStorage.setItem("waddles.playerName", playerName);
```

Also store their local best:

```ts
localStorage.setItem("waddles.personalBest", String(score));
```

Amazon Cognito can be added later if accounts become valuable, but it creates extra UI and architecture without improving the core game.

---

# Analytics and Observability

## Product analytics

For the cheapest MVP, send lightweight custom events through the existing API:

* `game_started`
* `game_over`
* `score_submitted`
* `share_clicked`

Do not store every flap or frame.

Alternatively, use a lightweight browser analytics provider, but that would make the app no longer entirely AWS-hosted.

## CloudWatch

Use:

* Lambda invocation count
* Lambda errors
* Lambda duration
* API Gateway 4XX responses
* API Gateway 5XX responses
* DynamoDB throttles

Set log retention to seven days initially.

Do not leave CloudWatch log groups with infinite retention.

## Alarms

Create only a few alarms:

* Lambda error count exceeds a small threshold
* API 5XX rate increases
* Estimated AWS charges exceed a defined amount

Configure an AWS Budget, such as:

```text
Alert at $5
Alert at $10
Alert at $25
```

This is more important than attempting to optimize fractions of a cent.

---

# Security

## Required controls

* Private S3 origin
* CloudFront Origin Access Control
* HTTPS-only
* API input validation
* DynamoDB least-privilege IAM
* No AWS credentials in the browser
* Restricted CORS origin
* Content Security Policy
* Rate limits in application code
* Maximum request-body size
* Escaped leaderboard names

## CORS

Allow only:

```text
https://waddles.website
https://www.waddles.website
```

A localhost origin can be enabled through a development configuration rather than production.

## AWS WAF

Do not include AWS WAF in the first version unless there is active abuse.

WAF can introduce a larger predictable monthly cost than the rest of a lightly used serverless application.

---

# Infrastructure as Code

Use AWS CDK with TypeScript.

Suggested repository:

```text
waddles/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   ├── public/
│   │   └── vite.config.ts
│   └── api/
│       ├── src/
│       └── tests/
├── packages/
│   └── shared/
│       ├── schemas/
│       └── types/
├── infra/
│   ├── bin/
│   ├── lib/
│   │   └── waddles-stack.ts
│   └── cdk.json
├── package.json
└── pnpm-workspace.yaml
```

## CDK resources

The stack should create:

* S3 website-assets bucket
* CloudFront distribution
* Origin Access Control
* ACM certificate
* Route 53 records
* API Gateway HTTP API
* Lambda function
* DynamoDB table
* CloudWatch log retention
* Billing or monitoring resources where supported

## Deployment

A GitHub Actions workflow can:

1. Install dependencies
2. Run linting
3. Run tests
4. Build the web app
5. Build the Lambda
6. Run `cdk deploy`
7. Upload static assets
8. Create a CloudFront invalidation for `index.html`

For a small project, deploying the static files with CDK’s bucket deployment construct is acceptable. If deploy time becomes annoying, move the asset sync into the workflow later.

---

# Suggested Build Phases

## Phase 1: Playable locally

* Initialize Vite and Phaser
* Implement Waddles movement
* Add obstacle generation
* Add collision detection
* Add scoring
* Add restart flow
* Add responsive controls
* Add temporary placeholder art

Success condition:

> Someone can play repeatedly on desktop and mobile without any AWS backend.

## Phase 2: Static AWS deployment

* Create S3 bucket
* Create CloudFront distribution
* Add ACM certificate
* Configure Route 53
* Deploy to `waddles.website`

Success condition:

> The game loads publicly over HTTPS from AWS.

## Phase 3: Leaderboard API

* Add DynamoDB table
* Add Lambda
* Add HTTP API
* Implement run creation
* Implement score submission
* Implement global leaderboard
* Implement daily leaderboard

Success condition:

> A player can submit a score and see it appear on the leaderboard.

## Phase 4: Hardening

* Add run tokens
* Add score timing validation
* Add name validation
* Add submission rate limits
* Set log retention
* Configure budgets and alarms
* Add error states to the frontend

Success condition:

> Simple request manipulation cannot submit arbitrary unlimited scores.

## Phase 5: Polish

* Replace placeholder visuals
* Add sound effects
* Add AWS-themed death messages
* Add social sharing
* Add Open Graph image
* Add mobile installation metadata
* Add small analytics events

---

# Estimated Monthly Cost

For a small launch, this architecture should generally remain in the **cents-to-low-single-digits per month**, excluding the domain registration.

The largest variables will be:

* CloudFront data transfer
* Number and size of game assets
* API request count
* CloudWatch log volume

The following components scale with use:

| Service              |                  Expected low-traffic behavior |
| -------------------- | ---------------------------------------------: |
| S3                   |                                Pennies or less |
| CloudFront           |             Free or inexpensive at low traffic |
| Lambda               | Frequently covered by free usage or negligible |
| API Gateway HTTP API |                                Pay per request |
| DynamoDB on-demand   |                         Pay per read and write |
| Route 53 hosted zone |                     Small fixed monthly charge |
| ACM                  |               No additional certificate charge |
| CloudWatch           |            Negligible if logging is controlled |

S3 charges for storage and requests rather than requiring a running server.

The architecture has:

* No EC2 instances
* No load balancer
* No NAT Gateway
* No RDS instance
* No Redis cluster
* No containers running continuously
* No provisioned Lambda concurrency

Those exclusions are what keep the idle cost low.

---

# Recommended MVP Decisions

| Decision         | MVP choice                                                     |
| ---------------- | -------------------------------------------------------------- |
| Frontend         | Vite + TypeScript + Phaser                                     |
| Hosting          | Private S3 + CloudFront                                        |
| DNS              | Route 53                                                       |
| TLS              | ACM                                                            |
| API              | API Gateway HTTP API                                           |
| Compute          | One ARM64 Lambda                                               |
| Database         | One DynamoDB on-demand table                                   |
| Authentication   | None                                                           |
| Leaderboards     | Global and daily                                               |
| Multiplayer      | No                                                             |
| Analytics        | Minimal custom events                                          |
| Anti-cheat       | Signed runs and sanity checks                                  |
| Infrastructure   | AWS CDK with TypeScript                                        |
| CI/CD            | GitHub Actions                                                 |
| Target idle cost | Approximately $1 or less, depending on DNS and account pricing |

---

# Definition of Done

The MVP is complete when:

1. `waddles.website` loads over HTTPS
2. The game works on mobile and desktop
3. A player can start, play, lose, and restart
4. A player can submit a name and score
5. Global and daily leaderboards display
6. Obviously impossible scores are rejected
7. Infrastructure can be recreated through CDK
8. Production deploys run through GitHub Actions
9. Logging has finite retention
10. AWS budget alerts are configured
