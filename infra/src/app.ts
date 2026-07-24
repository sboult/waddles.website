#!/usr/bin/env node

import {
  App,
  CliCredentialsStackSynthesizer,
  Tags,
} from "aws-cdk-lib";

import { loadConfig, STACK_NAMES } from "./config.ts";
import { DomainStack } from "./domain-stack.ts";
import { IdentityStack } from "./identity-stack.ts";
import { SiteStack } from "./site-stack.ts";

const app = new App();
const config = loadConfig(app);

const identityStack = new IdentityStack(app, STACK_NAMES.identity, {
  config,
  description: "GitHub OIDC identities and deployment permissions for Waddles",
  env: config.env,
  terminationProtection: true,
});

const domainStack = new DomainStack(app, STACK_NAMES.domain, {
  description: "Long-lived Route 53 foundation for waddles.website",
  domainName: config.domainName,
  env: config.env,
  hostedZoneParameterName: config.hostedZoneParameterName,
  synthesizer: new CliCredentialsStackSynthesizer(),
  terminationProtection: true,
});

const siteStack = new SiteStack(app, STACK_NAMES.site, {
  description: "Static World Wide Waddles website",
  domainName: config.domainName,
  env: config.env,
  hostedZoneId: config.hostedZoneId,
  hostedZoneParameterName: config.hostedZoneParameterName,
  synthesizer: new CliCredentialsStackSynthesizer(),
});

for (const stack of [identityStack, domainStack, siteStack]) {
  Tags.of(stack).add("Project", "WorldWideWaddles");
  Tags.of(stack).add("ManagedBy", "AWS-CDK");
}

app.synth();
