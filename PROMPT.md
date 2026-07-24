# World Wide Waddles: Hello World MVP

## Goal

Ship the first public version of **World Wide Waddles** at
`https://waddles.website`.

This is a small hackathon-style project. The first release is intentionally
tiny: a responsive web page that visibly renders an ASCII Waddles saying
`hello world`.

The project must be easy to develop locally, deploy to AWS, and extend later.

## MVP requirements

- Use a TypeScript monorepo managed with Turborepo so the web app and AWS CDK
  infrastructure live together.
- Build the `www` site as a React single-page application using Vite.
- Make the page usable on mobile and desktop.
- Host it on AWS without Amplify.
- Host the source repository on GitHub.
- Use GitHub Actions for CI and AWS deployments.
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

Use Turborepo with pnpm workspaces and keep the initial monorepo minimal:

```text
waddles.website/
├── apps/
│   └── www/                 # React + TypeScript SPA built with Vite
├── .github/
│   └── workflows/           # CI, site deployment, and DNS deployment
├── infra/                   # AWS CDK v2 app in TypeScript
├── package.json             # Root scripts and shared tooling
├── pnpm-workspace.yaml
├── turbo.json               # Monorepo task definitions
├── README.md
└── PROMPT.md
```

Do not add empty API, shared-package, game, or backend directories in
anticipation of future work.

## Frontend strategy

Use React with TypeScript and Vite. Keep the component structure small for this
first page; one focused application component is sufficient.

The production build must output static files to `apps/www/dist`. Configure
Turborepo tasks for development, testing, building, and deployment. Local
development should run with one root command, such as:

```sh
pnpm dev
```

The design can be playful, but the ASCII duck must remain the focus. Avoid
large dependencies, image assets, analytics, cookie banners, forms, APIs, and
premature game code.

## AWS strategy

Implement one AWS CDK v2 site stack in TypeScript with:

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
small MVP infrastructure in one stack.

### Domain and DNS onboarding

Support `waddles.website` as a configurable domain rather than assuming DNS is
already prepared:

- The CDK app must define a small `DomainStack` for the public hosted zone and
  a `SiteStack` for the website resources.
- When a public Route 53 hosted zone for `waddles.website` already exists,
  accept its hosted-zone ID through CDK context and import it with
  `HostedZone.fromHostedZoneAttributes`.
- Never silently create a second hosted zone when one already exists.
- When no hosted zone exists, `pnpm domain:deploy` must deploy `DomainStack`
  through CDK, create the zone with a `RETAIN` removal policy, and output both
  the hosted-zone ID and authoritative name servers.
- `SiteStack` must receive an `IHostedZone`, whether it was created by
  `DomainStack` or imported from CDK context.
- If the domain is registered outside Route 53, document the one-time step to
  configure those name servers at the registrar.
- Domain registration and external registrar changes are not CloudFormation
  resources and are not part of `pnpm deploy`.
- Use DNS validation for the ACM certificate and create Route 53 alias `A` and
  `AAAA` records for both `waddles.website` and `www.waddles.website`.

All hosted-zone creation/import, certificate validation records, and website
alias records inside AWS must be implemented in CDK; no AWS Console steps are
allowed for them. The regular site deployment must reuse the configured hosted
zone. Destroying `SiteStack` must not delete the domain registration or hosted
zone.

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
pnpm domain:deploy # one time, only when a hosted zone does not exist
pnpm deploy
```

`pnpm deploy` should build the web app and run the CDK deployment so one
command publishes the current site. Root commands should delegate workspace
tasks through `turbo`. Document these one-time prerequisites:

- A supported Node.js version and pnpm
- AWS credentials for the target account
- CDK bootstrap in `us-east-1`
- Either an existing Route 53 hosted-zone ID or completion of the documented
  one-time domain setup

Before deployment, CDK should synthesize cleanly. A production deployment
should not require clicking through the AWS console.

## GitHub and CI/CD

Host the canonical Git repository on GitHub. GitHub Actions is the required
CI/CD system; do not add AWS CodePipeline, CodeBuild, or Amplify Hosting.

Provide three focused workflows:

- `ci.yml` runs install, formatting/linting, tests, the production web build,
  and CDK synth on pull requests and relevant pushes.
- `deploy-site.yml` deploys only `SiteStack` after CI passes on the default
  branch. Changes under `apps/www` and the site-infrastructure code should
  trigger this workflow.
- `deploy-domain.yml` deploys only `DomainStack`. It must be manually
  dispatched, protected by a dedicated GitHub environment approval, and never
  run automatically because DNS has a different lifecycle and blast radius.

Authenticate GitHub Actions to AWS with GitHub's OIDC provider and a
least-privilege IAM deployment role. Do not store long-lived AWS access keys in
GitHub secrets. Keep the DNS and site deployment roles separate.

The first production deployment order is:

1. Manually run the domain workflow if a hosted zone does not already exist.
2. Configure registrar delegation when required and verify public DNS.
3. Run the site workflow.

Routine site releases must not deploy, update, or destroy `DomainStack`.
Changes to shared monorepo configuration should validate both stacks, but must
not automatically deploy DNS.

Local development and deployment commands must continue to work independently
of GitHub Actions.

## Definition of done

The hello-world MVP is complete when:

1. The repository is a working Turborepo using pnpm workspaces.
2. `pnpm dev` shows the ASCII duck locally.
3. `pnpm build` produces a static site.
4. The layout works at common mobile and desktop widths.
5. `pnpm test` passes.
6. `pnpm deploy` builds and deploys the site through CDK.
7. `https://waddles.website` and `https://www.waddles.website` serve the page.
8. The S3 bucket is private and reachable only through CloudFront.
9. There are no always-on compute resources and no Amplify dependency.
10. The hosted zone survives site-stack deletion.
11. Route 53, ACM validation, and alias records are managed through CDK.
12. The canonical repository is hosted on GitHub.
13. GitHub Actions validates changes and deploys DNS and site stacks through
    separate OIDC-authenticated workflows.

## Deferred roadmap

After the hello-world page is online:

1. Add social links and World Wide Waddles event content.
2. Add a `/play` route with a Flappy Bird-style Waddles game.
3. Only then evaluate whether scores, leaderboards, accounts, analytics, or
   other backend features are worth their added scope and cost.

The deferred roadmap is context, not part of this MVP.
