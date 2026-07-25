# Setting up Amplify Hosting

Amplify Hosting owns production deployments and pull-request previews. GitHub
Actions only runs the repository's typecheck and build checks.

The first connection to GitHub requires a repository owner to authorize the AWS
Amplify GitHub App. Everything after that connection is automatic.

## Create the Amplify app

1. Open **AWS Amplify** in `us-east-1` and choose **Create new app**.
2. Choose **GitHub**, authorize the AWS Amplify GitHub App, and grant it access
   only to `sboult/waddles.website`.
3. Select the `main` branch.
4. Select **My app is a monorepo** and enter `apps/www` as the app root.
5. Confirm that `AMPLIFY_MONOREPO_APP_ROOT` is set to `apps/www`.
6. Confirm that Amplify detected the committed `amplify.yml`. If you are
   setting Amplify up from the pull request that introduces this file, `main`
   does not contain it yet. Choose **Edit YML** and paste the contents of this
   pull request's `amplify.yml` for the initial deployment.
7. Do not add an IAM service role. This is a static app in a public repository
   and does not need access to other AWS resources.
8. Save and deploy, then verify the generated `amplifyapp.com` URL.

The initial deployment should run these commands from `amplify.yml`:

```text
pnpm install --frozen-lockfile
pnpm --filter @waddles/www build
```

The published artifact directory is `apps/www/dist`.

## Enable pull-request previews

1. In the Amplify app, open **Hosting**, then **Previews**.
2. Select `main`, choose **Edit settings**, and enable pull-request previews.
3. Open a pull request or push another commit to an existing pull request.
4. Wait for the Amplify preview check and open its generated preview URL.
5. Close a test pull request and confirm that Amplify removes its preview.

Amplify limits an app to 50 active branches, including pull-request previews,
so stale pull requests should be closed.

## Configure the SPA rewrite

In **Hosting**, open **Rewrites and redirects**, choose **Open text editor**, and
add this rule:

```json
[
  {
    "source": "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>",
    "status": "200",
    "target": "/index.html",
    "condition": null
  }
]
```

This sends extensionless browser routes to the React app while allowing real
static files to return normally.

## Move the production domain

Do this only after both the `main` deployment and a pull-request preview work
on their generated Amplify URLs.

The existing CloudFront distribution currently owns `waddles.website` and
`www.waddles.website`. Amplify cannot attach those names until the old
distribution releases them, so expect a short cutover window.

1. Keep the working Amplify URL open for verification.
2. In CloudFormation, delete `WaddlesPreviewStack`. This does not conflict with
   Amplify, but it is no longer needed after Amplify previews work.
3. In CloudFormation, delete `WaddlesSiteStack`. This is the one required
   deletion: its CloudFront aliases conflict with Amplify's custom domain.
4. In Amplify, open **Hosting**, then **Custom domains**, and add
   `waddles.website`.
5. Map the root domain to `main` and add `www` to the same branch.
6. Wait until Amplify reports the domain as available.
7. Verify HTTPS, the apex domain, `www`, and a pull-request preview.

The Route 53 hosted zone is retained by the old domain stack, so deleting the
site and preview stacks does not delete the domain or its hosted zone.

Do not delete `WaddlesDomainStack` or `WaddlesIdentityStack` before this
cutover. The domain stack owns the retained hosted zone, and CloudFormation may
still need execution roles from the identity stack while deleting the other
stacks.

To keep the apex domain canonical, add this rule before the SPA rule:

```json
{
  "source": "https://www.waddles.website",
  "status": "301",
  "target": "https://waddles.website",
  "condition": null
}
```

## Retire the old infrastructure

After Amplify has served production successfully:

1. Disable termination protection on `WaddlesDomainStack`, then delete it. Its
   Route 53 hosted zone has a retain policy and remains in the account.
2. Disable termination protection on `WaddlesIdentityStack`, then delete it.
   Its GitHub deployment and CloudFormation execution roles are no longer used.
3. Optionally delete the unused `CDKToolkit` stack after confirming no other
   application in the account uses it.
4. Delete the legacy SSM parameter
   `/waddles/waddles.website/hosted-zone-id` if it still exists.

Deleting CDK files from this repository does not delete any live AWS resource.
The CloudFormation cleanup above is intentionally a separate, explicit step.

## AWS documentation

- [Deploy an existing app with Amplify Hosting](https://docs.aws.amazon.com/amplify/latest/userguide/getting-started.html)
- [Configure a pnpm monorepo](https://docs.aws.amazon.com/amplify/latest/userguide/monorepo-configuration.html)
- [Enable pull-request previews](https://docs.aws.amazon.com/amplify/latest/userguide/pr-previews.html)
