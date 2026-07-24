# World Wide Waddles: Hello World MVP

## Goal

Ship the first public version of **World Wide Waddles** at
`https://waddles.website`.

This is a small hackathon-style project. The first release is intentionally
tiny: a responsive web page that visibly renders an ASCII Waddles saying
`hello world`.

The project must be easy to develop locally, deploy to AWS, and extend later.

## MVP requirements

- Use a TypeScript monorepo so the web app and AWS CDK infrastructure live
  together.
- Build the `www` site as a static single-page application.
- Make the page usable on mobile and desktop.
- Host it on AWS without Amplify.
- Use request-driven AWS services with no always-on compute.
- Keep idle cost as close to zero as practical.
- Provide a simple, documented deployment command.
- Serve `waddles.website` and `www.waddles.website` over HTTPS.
- Keep the implementation small. Do not build future game or social features
  yet.

## What the page renders

Center Waddles horizontally and vertically in the viewport and preserve the
ASCII spacing with a monospace font and a `<pre>` element. The page should
have sensible padding and must not overflow a narrow mobile viewport.

This output was generated with:

```sh
ducksay "hello world"
```

```text
<!--       _
       .__(.)< (hello world)
        \___)
 ~~~~~~~~~~~~~~~~~~-->
```

The `<!--` and `-->` markers are wrappers emitted by `ducksay`; do not show
those markers on the page. The visible content begins with the duck's head and
ends with the water line.

The page should be accessible and have:

- A document title of `World Wide Waddles`
- A useful description meta tag
- Good foreground/background contrast
- No required client-side network requests

## Repository shape

Use pnpm workspaces and keep the initial monorepo minimal:

```text
waddles.website/
├── apps/
│   └── www/                 # Vite + TypeScript static SPA
├── infra/                   # AWS CDK v2 app in TypeScript
├── package.json             # Root scripts and shared tooling
├── pnpm-workspace.yaml
├── README.md
└── PROMPT.md
```

Do not add empty API, shared-package, game, or backend directories in
anticipation of future work.

## Frontend strategy

Use Vite and TypeScript. Prefer plain HTML/CSS/TypeScript for this first page;
a UI framework is unnecessary for a single static view.

The production build must output static files to `apps/www/dist`. Local
development should run with one root command, such as:

```sh
pnpm dev
```

The design can be playful, but the ASCII duck must remain the focus. Avoid
large dependencies, image assets, analytics, cookie banners, forms, APIs, and
premature game code.

## AWS strategy

Implement one AWS CDK v2 stack in TypeScript with:

- A private S3 bucket for the built static assets
- A CloudFront distribution using Origin Access Control to read from S3
- An ACM public certificate in `us-east-1`
- Route 53 alias records for the apex domain and `www`
- HTTPS-only viewer behavior
- Compression enabled
- SPA fallback behavior that serves `index.html` for client-side routes
- Deployment of `apps/www/dist` to S3
- A CloudFront invalidation when site assets change

Deploy the stack in `us-east-1` to keep the CloudFront certificate and the
small MVP infrastructure in one stack. Reuse the existing Route 53 hosted zone
for `waddles.website` rather than creating a duplicate zone.

Use secure defaults:

- Block all public access to S3.
- Grant only the CloudFront distribution access to the bucket.
- Redirect HTTP to HTTPS.
- Do not expose AWS credentials to browser code.
- Configure removal policies deliberately and document whether `cdk destroy`
  removes the asset bucket.

S3 and CloudFront charge for storage and usage rather than keeping application
servers running, so the application has no always-on compute and effectively
scales to zero. Route 53, domain registration, and small storage/request costs
may still create a low baseline bill; do not claim the site is literally free.

Do not add:

- AWS Amplify
- Lambda
- API Gateway
- DynamoDB
- ECS, EC2, or load balancers
- NAT Gateways or a VPC
- AWS WAF
- A backend of any kind

## Deployment experience

Provide root scripts with clear names. The intended workflow is:

```sh
pnpm install
pnpm test
pnpm build
pnpm deploy
```

`pnpm deploy` should build the web app and run the CDK deployment so one
command publishes the current site. Document these one-time prerequisites:

- A supported Node.js version and pnpm
- AWS credentials for the target account
- CDK bootstrap in `us-east-1`
- An existing Route 53 hosted zone for `waddles.website`

Before deployment, CDK should synthesize cleanly. A production deployment
should not require clicking through the AWS console.

A CI workflow is optional for this first release. Local deployment must work
first.

## Definition of done

The hello-world MVP is complete when:

1. The repository is a working pnpm monorepo.
2. `pnpm dev` shows the ASCII duck locally.
3. `pnpm build` produces a static site.
4. The layout works at common mobile and desktop widths.
5. `pnpm test` passes.
6. `pnpm deploy` builds and deploys the site through CDK.
7. `https://waddles.website` and `https://www.waddles.website` serve the page.
8. The S3 bucket is private and reachable only through CloudFront.
9. There are no always-on compute resources and no Amplify dependency.

## Deferred roadmap

After the hello-world page is online:

1. Add social links and World Wide Waddles event content.
2. Add a `/play` route with a Flappy Bird-style Waddles game.
3. Only then evaluate whether scores, leaderboards, accounts, analytics, or
   other backend features are worth their added scope and cost.

The deferred roadmap is context, not part of this MVP.
