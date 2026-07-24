# World Wide Waddles

A tiny React site for the World Wide Waddles event, hosted on AWS with CDK.

## Workspace

- `apps/www` — React and Vite single-page application
- `infra` — CDK site, domain, and GitHub OIDC identity stacks
- `packages/config-typescript` — shared TypeScript configuration

The repository uses Node.js 24, pnpm, and Turborepo. Node runs the CDK
TypeScript entrypoint directly; no TypeScript runtime wrapper is required.

## Local development

```sh
pnpm install
pnpm dev
```

Create a production build and synthesize all CDK stacks:

```sh
pnpm build
pnpm synth
```

## CDK configuration

Defaults live in `infra/cdk.json`. They can be overridden with CDK context:

```sh
pnpm --filter @waddles/infra exec cdk synth \
  -c githubOwner=YOUR_GITHUB_OWNER \
  -c githubOwnerId=YOUR_GITHUB_OWNER_ID \
  -c githubRepository=waddles.website \
  -c githubRepositoryId=YOUR_GITHUB_REPOSITORY_ID
```

All four GitHub repository identity values are required because the OIDC trust
policy uses GitHub's immutable owner and repository IDs. If the GitHub OIDC
provider already exists in the AWS account, provide its ARN as
`githubOidcProviderArn`.

## One-time AWS setup

Authenticate a trusted local administrator session and verify that it targets
the intended AWS account:

```sh
aws sts get-caller-identity
```

Then run the repository's one-time setup task:

```sh
pnpm run setup
```

`pnpm run setup` bootstraps CDK in the target account's `us-east-1` region and then
deploys `IdentityStack`. Run it once for each AWS account used by this project.
The CDK bootstrap creates the asset bucket and deployment roles required by
subsequent CDK deployments.

`IdentityStack` creates the GitHub OIDC provider, separate GitHub deployment
roles for DNS and the site, and separate CloudFormation execution roles. It is
validated in CI but intentionally deployed only from a trusted local session.

To bootstrap without deploying the identity stack, use `pnpm run bootstrap`.

If `waddles.website` does not already have a Route 53 public hosted zone:

```sh
pnpm domain:deploy
```

The domain stack is termination-protected, retains the hosted zone, exports its
ID through CloudFormation, and outputs the assigned nameservers. Configure
those nameservers at the registrar when the domain is registered elsewhere,
then confirm public DNS delegation before deploying the site. Deploy the domain
stack once before the first site deployment so its export is available.

Deploy the application locally with:

```sh
pnpm deploy
```

Run `pnpm diff` before infrastructure changes.

## GitHub Actions

Create these GitHub environments:

- `production` for `SiteStack`
- `dns-production` for the manually dispatched `DomainStack`

Protect both environments appropriately; DNS should require manual approval.
Add `AWS_ACCOUNT_ID` as a repository or environment variable.

The workflows use GitHub OIDC and temporary AWS credentials. Do not add AWS
access keys to GitHub secrets.
