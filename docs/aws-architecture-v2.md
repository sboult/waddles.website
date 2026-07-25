# World Wide Waddles — AWS Architecture v2

Snapshot date: 2026-07-25
AWS account: `655618292901`  
Region: `us-east-1`

This design reflects the deployed CloudFormation export/import architecture.
It has no hosted-zone ID context override and no application-level Systems
Manager Parameter Store dependency.

The draw.io file contains three pages:

1. **Runtime Overview** — browser, DNS, CDN, edge logic, and private static assets.
2. **Deployment & Stack Contract** — separate DNS/site deployment lanes and the required CloudFormation export/import order.
3. **PR Preview Flow** — trusted artifact publishing, isolated S3 prefixes, wildcard preview routing, and cleanup.

## Runtime flow

1. The browser resolves `waddles.website` or `www.waddles.website` through the Route 53 public hosted zone.
2. Apex and `www` A/AAAA aliases target the same CloudFront distribution.
3. ACM supplies the CloudFront certificate for both domain names.
4. The viewer-request CloudFront Function permanently redirects `www` to the apex domain and rewrites directory or extensionless SPA routes to `index.html`.
5. CloudFront fetches objects from the private S3 bucket through Origin Access Control.
6. CloudFront returns compressed content with the configured CSP, HSTS, content-type, frame, and referrer security headers.

## Hosted-zone contract

1. `WaddlesDomainStack` creates and retains the Route 53 public hosted zone.
2. Its `HostedZoneId` output is exported under the stable name `WaddlesHostedZoneId`.
3. `WaddlesSiteStack` uses `Fn::ImportValue` for ACM DNS validation and the four Route 53 alias records.
4. No CDK context value or GitHub `HOSTED_ZONE_ID` variable can override the hosted zone.
5. The DNS and site stacks remain independently deployable because the import is an explicit CloudFormation contract rather than an automatic CDK stack dependency.

## Deployment flow

### DNS lane

1. The manually dispatched DNS workflow receives GitHub OIDC credentials through the `dns-production` environment.
2. The DNS deployment role operates only on `WaddlesDomainStack` and passes only the DNS execution role.
3. CloudFormation manages the retained public hosted zone and publishes `WaddlesHostedZoneId`.

### Site lane

1. The site workflow runs on relevant pushes to `main` or by manual dispatch through the `production` environment.
2. The site deployment role operates only on `WaddlesSiteStack` and passes only the site execution role.
3. CloudFormation resolves `WaddlesHostedZoneId`, manages the ACM certificate and DNS records, deploys static assets, and invalidates CloudFront.

### Preview infrastructure lane

1. `WaddlesPreviewStack` imports `WaddlesHostedZoneId` and creates one shared preview bucket, wildcard ACM certificate, wildcard Route 53 aliases, CloudFront distribution, response-headers policy, and CloudFront Function.
2. The existing site deployment and execution roles may deploy `WaddlesPreviewStack`; preview content publishing uses a separate S3-only role.
3. The preview publisher role trusts only GitHub OIDC jobs using the `preview` environment and can manage only `pr-*` prefixes in the preview bucket.

The required order for a new account or contract migration is:

```text
WaddlesDomainStack → verify WaddlesHostedZoneId → WaddlesSiteStack + WaddlesPreviewStack
```

## Pull request preview flow

1. Pull-request CI builds the static site without AWS credentials and uploads `apps/www/dist` as a short-lived GitHub Actions artifact.
2. A trusted `workflow_run` workflow from the default branch downloads the artifact after CI succeeds.
3. GitHub OIDC assumes `waddles-github-preview-publish`, which has S3-only access to preview prefixes.
4. The workflow syncs the artifact to `pr-<number>/` and adds or updates a pull-request comment containing `https://pr-<number>.preview.waddles.website`.
5. The wildcard Route 53 alias sends preview traffic to the shared CloudFront distribution.
6. The viewer-request CloudFront Function maps the hostname to the matching `pr-<number>/` prefix and applies the SPA rewrite.
7. CloudFront reads the private preview object through Origin Access Control.
8. Closing a pull request removes its prefix from the shared bucket.

## Service inventory

| Service | Purpose |
| --- | --- |
| Amazon Route 53 | CDK-owned public hosted zone plus production and `*.preview` A/AAAA aliases |
| Amazon CloudFront | Separate production and shared preview distributions with private S3 access |
| CloudFront Functions | Production redirect/SPA rewrite plus preview hostname-to-prefix routing |
| Amazon S3 | Private production assets and shared `pr-<number>/` preview prefixes |
| AWS Certificate Manager | DNS-validated production and `*.preview.waddles.website` certificates |
| AWS IAM / STS | GitHub OIDC provider plus DNS/site roles and an S3-only preview publisher |
| AWS CloudFormation | Stack deployment and the `WaddlesHostedZoneId` export/import contract |
| AWS Lambda | CDK-generated deployment and cleanup custom-resource handlers |

## Live stack state

| Stack | Status | Role |
| --- | --- | --- |
| `WaddlesIdentityStack` | `UPDATE_COMPLETE` | GitHub OIDC provider and scoped roles |
| `WaddlesDomainStack` | `UPDATE_COMPLETE` | Hosted-zone owner and `WaddlesHostedZoneId` exporter |
| `WaddlesSiteStack` | `UPDATE_COMPLETE` | Website delivery and hosted-zone ID importer |
| `WaddlesPreviewStack` | `CREATE_COMPLETE` | Shared ephemeral preview delivery and hosted-zone ID importer |

## Key design decisions

- `WaddlesDomainStack` is the sole hosted-zone owner.
- The hosted zone retains its existing logical ID and `RETAIN` removal policy.
- Site deployment cannot silently target another hosted zone.
- DNS remains manual and separately approved; site deployment remains automatic for relevant `main` changes.
- S3 is private and accessible only through CloudFront Origin Access Control.
- PRs share one preview distribution and bucket; prefixes provide isolation without provisioning a distribution per PR.
- Untrusted PR code never receives AWS credentials. Only a trusted default-branch workflow publishes the static artifact.
- Preview cleanup is event-driven when the PR closes.
- The application has no VPC, database, API, load balancer, container service, or always-on compute.
- CDK bootstrap may still read its own standard SSM bootstrap-version parameter; this is separate from the removed application hosted-zone handoff.

## Legacy cleanup

The previously retained parameter
`/waddles/waddles.website/hosted-zone-id` still exists in AWS but is no longer
referenced or managed by these stacks. It can be deleted after confirming the
site stack remains healthy with the CloudFormation import.
