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
