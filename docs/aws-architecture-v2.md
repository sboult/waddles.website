# World Wide Waddles — AWS Architecture v2

Snapshot date: 2026-07-24  
AWS account: `655618292901`  
Region: `us-east-1`

This design reflects the deployed CloudFormation export/import architecture.
It has no hosted-zone ID context override and no application-level Systems
Manager Parameter Store dependency.

The draw.io file contains two pages:

1. **Runtime Overview** — browser, DNS, CDN, edge logic, and private static assets.
2. **Deployment & Stack Contract** — separate DNS/site deployment lanes and the required CloudFormation export/import order.

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

The required order for a new account or contract migration is:

```text
WaddlesDomainStack → verify WaddlesHostedZoneId → WaddlesSiteStack
```

## Service inventory

| Service | Purpose |
| --- | --- |
| Amazon Route 53 | CDK-owned public hosted zone and apex/`www` A/AAAA aliases |
| Amazon CloudFront | Global HTTPS delivery, caching, compression, response headers, and private S3 access |
| CloudFront Functions | `www` redirect and SPA viewer-request rewriting |
| Amazon S3 | Private SSE-S3-encrypted static assets with public access blocked and SSL enforced |
| AWS Certificate Manager | DNS-validated certificate for the apex and `www` names |
| AWS IAM / STS | GitHub OIDC provider plus separated DNS/site deployment and execution roles |
| AWS CloudFormation | Stack deployment and the `WaddlesHostedZoneId` export/import contract |
| AWS Lambda | CDK-generated deployment and cleanup custom-resource handlers |

## Live stack state

| Stack | Status | Role |
| --- | --- | --- |
| `WaddlesIdentityStack` | `UPDATE_COMPLETE` | GitHub OIDC provider and scoped roles |
| `WaddlesDomainStack` | `UPDATE_COMPLETE` | Hosted-zone owner and `WaddlesHostedZoneId` exporter |
| `WaddlesSiteStack` | `UPDATE_COMPLETE` | Website delivery and hosted-zone ID importer |

## Key design decisions

- `WaddlesDomainStack` is the sole hosted-zone owner.
- The hosted zone retains its existing logical ID and `RETAIN` removal policy.
- Site deployment cannot silently target another hosted zone.
- DNS remains manual and separately approved; site deployment remains automatic for relevant `main` changes.
- S3 is private and accessible only through CloudFront Origin Access Control.
- The application has no VPC, database, API, load balancer, container service, or always-on compute.
- CDK bootstrap may still read its own standard SSM bootstrap-version parameter; this is separate from the removed application hosted-zone handoff.

## Legacy cleanup

The previously retained parameter
`/waddles/waddles.website/hosted-zone-id` still exists in AWS but is no longer
referenced or managed by these stacks. It can be deleted after confirming the
site stack remains healthy with the CloudFormation import.

`WaddlesIdentityStack` was last updated before this migration. Redeploy it once
to remove the now-obsolete application hosted-zone parameter permissions from
the DNS and site execution roles.
