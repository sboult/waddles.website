import type { App, Environment } from "aws-cdk-lib";

export const STACK_NAMES = {
  domain: "WaddlesDomainStack",
  identity: "WaddlesIdentityStack",
  preview: "WaddlesPreviewStack",
  site: "WaddlesSiteStack",
} as const;

export const ROLE_NAMES = {
  dnsDeployment: "waddles-github-dns-deployment",
  dnsExecution: "waddles-cloudformation-dns-execution",
  previewPublish: "waddles-github-preview-publish",
  siteDeployment: "waddles-github-site-deployment",
  siteExecution: "waddles-cloudformation-site-execution",
} as const;

export const EXPORT_NAMES = {
  hostedZoneId: "WaddlesHostedZoneId",
} as const;

export interface WaddlesConfig {
  readonly domainName: string;
  readonly dnsEnvironment: string;
  readonly env: Environment;
  readonly githubOidcProviderArn?: string;
  readonly githubOwner: string;
  readonly githubOwnerId: string;
  readonly githubRepository: string;
  readonly githubRepositoryId: string;
  readonly previewEnvironment: string;
  readonly siteEnvironment: string;
}

function optionalContext(app: App, key: string): string | undefined {
  const value = app.node.tryGetContext(key);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function requiredContext(app: App, key: string): string {
  const value = optionalContext(app, key);
  if (!value) {
    throw new Error(`Missing required CDK context value: ${key}`);
  }
  return value;
}

export function loadConfig(app: App): WaddlesConfig {
  const domainName = requiredContext(app, "domainName");

  return {
    domainName,
    dnsEnvironment: requiredContext(app, "githubDnsEnvironment"),
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: "us-east-1",
    },
    githubOidcProviderArn: optionalContext(app, "githubOidcProviderArn"),
    githubOwner: requiredContext(app, "githubOwner"),
    githubOwnerId: requiredContext(app, "githubOwnerId"),
    githubRepository: requiredContext(app, "githubRepository"),
    githubRepositoryId: requiredContext(app, "githubRepositoryId"),
    previewEnvironment: requiredContext(app, "githubPreviewEnvironment"),
    siteEnvironment: requiredContext(app, "githubSiteEnvironment"),
  };
}

export function githubEnvironmentSubject(
  config: WaddlesConfig,
  environment: string,
): string {
  const repository = `${config.githubOwner}@${config.githubOwnerId}/${config.githubRepository}@${config.githubRepositoryId}`;

  return `repo:${repository}:environment:${environment}`;
}
