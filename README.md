# World Wide Waddles

![Waddles surfing a bright blue wave](docs/waddles-readme.png)

A tiny open source home for Waddles, built with React and hosted with AWS
Amplify. His signature ASCII greetings are insired by
[Ducksay](https://github.com/sboult/ducksay), a Rust CLI that makes Waddles say
whatever is on his mind.

## Developing

Install Node.js 24, enable pnpm, and start the local development server:

```sh
corepack enable
pnpm install
pnpm dev
```

Before submitting changes, run:

```sh
pnpm typecheck
pnpm build
```

## Deploying

AWS Amplify Hosting builds and deploys `main`. It also creates a temporary
deployment for every pull request and removes it when the pull request closes.
The build and security-header configuration live in
[`amplify.yml`](amplify.yml) and [`customHttp.yml`](customHttp.yml).

See [Setting up Amplify Hosting](docs/amplify-hosting.md) for the one-time AWS
setup and the migration checklist for the existing site.

## Contributing

Fork the repository, create a branch, and open a pull request with a short
description of your change. Keep changes focused and make sure the checks above
pass before submitting.
