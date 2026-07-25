# World Wide Waddles

![Waddles surfing a bright blue wave](docs/waddles-readme.png)

A tiny open source home for Waddles, built with React and hosted on AWS.
His signature ASCII greetings are powered by
[DuckSay](https://github.com/sboult/ducksay), a Rust CLI that makes Waddles say
whatever is on his mind.

## Setup

Install Node.js 24 and enable pnpm, then install the dependencies:

```sh
corepack enable
pnpm install
```

## Developing

Start the local development server:

```sh
pnpm dev
```

Before submitting changes, run:

```sh
pnpm typecheck
pnpm build
```

## Contributing

Fork the repository, create a branch, and open a pull request with a short
description of your change. Keep changes focused and make sure the checks above
pass before submitting.

## Pull request previews

Pull requests get an ephemeral preview at:

```text
https://pr-<number>.preview.waddles.website
```

CI builds the site without AWS credentials and saves the static output as an
artifact. After CI succeeds, a separate workflow publishes that artifact to the
pull request's prefix in the shared preview bucket and adds the URL to the pull
request. Closing the pull request removes its files.

The preview infrastructure is a single shared CloudFront distribution and S3
bucket managed by `WaddlesPreviewStack`. It does not create a CloudFront
distribution for every pull request.

### One-time setup

1. Create a GitHub environment named `preview`. It does not need secrets.
2. Make sure the `AWS_ACCOUNT_ID` repository variable is available to both the
   `production` and `preview` environments.
3. Deploy the updated identity stack from an authenticated local session:

   ```sh
   pnpm identity:deploy
   ```

4. Deploy the shared preview infrastructure:

   ```sh
   pnpm preview:deploy
   ```

   After the identity update is deployed, the **Deploy preview infrastructure**
   workflow can be used for later infrastructure updates.

The `workflow_run` and `pull_request_target` workflows must exist on the default
branch before automatic publishing and cleanup run. To smoke test the
infrastructure from a feature branch, build and upload a prefix manually:

```sh
pnpm build
aws s3 sync apps/www/dist \
  "s3://waddles-website-previews-<account-id>/pr-<number>" \
  --delete \
  --cache-control "public,max-age=0,must-revalidate"
```
