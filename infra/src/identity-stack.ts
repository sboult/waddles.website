import {
  ArnFormat,
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps,
} from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import type { Construct } from "constructs";

import {
  ROLE_NAMES,
  STACK_NAMES,
  githubEnvironmentSubject,
  type WaddlesConfig,
} from "./config.ts";

export interface IdentityStackProps extends StackProps {
  readonly config: WaddlesConfig;
}

export class IdentityStack extends Stack {
  public constructor(
    scope: Construct,
    id: string,
    props: IdentityStackProps,
  ) {
    super(scope, id, props);

    const provider = props.config.githubOidcProviderArn
      ? iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
          this,
          "GitHubProvider",
          props.config.githubOidcProviderArn,
        )
      : new iam.OpenIdConnectProvider(this, "GitHubProvider", {
          url: "https://token.actions.githubusercontent.com",
          clientIds: ["sts.amazonaws.com"],
          removalPolicy: RemovalPolicy.RETAIN,
        });

    const siteExecutionRole = this.createExecutionRole(
      ROLE_NAMES.siteExecution,
      this.siteExecutionPolicy(props.config),
    );
    const dnsExecutionRole = this.createExecutionRole(
      ROLE_NAMES.dnsExecution,
      this.dnsExecutionPolicy(),
    );

    this.createGitHubDeploymentRole({
      environment: props.config.siteEnvironment,
      executionRole: siteExecutionRole,
      provider,
      roleName: ROLE_NAMES.siteDeployment,
      stackName: STACK_NAMES.site,
      config: props.config,
      publishesAssets: true,
    });

    this.createGitHubDeploymentRole({
      environment: props.config.dnsEnvironment,
      executionRole: dnsExecutionRole,
      provider,
      roleName: ROLE_NAMES.dnsDeployment,
      stackName: STACK_NAMES.domain,
      config: props.config,
      publishesAssets: false,
    });
  }

  private createExecutionRole(
    roleName: string,
    policy: iam.PolicyDocument,
  ): iam.Role {
    return new iam.Role(this, `${roleName}Role`, {
      roleName,
      assumedBy: new iam.ServicePrincipal("cloudformation.amazonaws.com"),
      description: `CloudFormation execution role managed by ${STACK_NAMES.identity}`,
      inlinePolicies: {
        DeploymentPermissions: policy,
      },
    });
  }

  private createGitHubDeploymentRole(options: {
    readonly config: WaddlesConfig;
    readonly environment: string;
    readonly executionRole: iam.IRole;
    readonly provider: iam.IOpenIdConnectProvider;
    readonly publishesAssets: boolean;
    readonly roleName: string;
    readonly stackName: string;
  }): iam.Role {
    const subject = githubEnvironmentSubject(
      options.config,
      options.environment,
    );
    const principal = new iam.WebIdentityPrincipal(
      options.provider.openIdConnectProviderArn,
      {
        StringEquals: {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": subject,
        },
      },
    );
    const role = new iam.Role(this, `${options.roleName}Role`, {
      roleName: options.roleName,
      assumedBy: principal,
      description: `GitHub Actions deployment role for ${options.stackName}`,
      maxSessionDuration: Duration.hours(1),
    });

    const stackArn = Stack.of(this).formatArn({
      service: "cloudformation",
      resource: "stack",
      resourceName: `${options.stackName}/*`,
    });
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "DeployOnlyTheExpectedStack",
        actions: [
          "cloudformation:CreateChangeSet",
          "cloudformation:CreateStack",
          "cloudformation:DeleteChangeSet",
          "cloudformation:DeleteStack",
          "cloudformation:DescribeChangeSet",
          "cloudformation:DescribeStackEvents",
          "cloudformation:DescribeStackResources",
          "cloudformation:DescribeStacks",
          "cloudformation:ExecuteChangeSet",
          "cloudformation:GetTemplate",
          "cloudformation:UpdateStack",
        ],
        resources: [stackArn],
      }),
    );
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "ReadCloudFormationMetadata",
        actions: [
          "cloudformation:GetTemplateSummary",
          "cloudformation:ListStacks",
          "cloudformation:ValidateTemplate",
        ],
        resources: ["*"],
      }),
    );
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "PassOnlyTheMatchingExecutionRole",
        actions: ["iam:PassRole"],
        resources: [options.executionRole.roleArn],
        conditions: {
          StringEquals: {
            "iam:PassedToService": "cloudformation.amazonaws.com",
          },
        },
      }),
    );
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "ReadCdkBootstrapVersion",
        actions: ["ssm:GetParameter"],
        resources: [
          Stack.of(this).formatArn({
            service: "ssm",
            resource: "parameter",
            resourceName: "cdk-bootstrap/hnb659fds/version",
          }),
        ],
      }),
    );

    if (options.publishesAssets) {
      const bootstrapBucket = `arn:${this.partition}:s3:::cdk-hnb659fds-assets-${this.account}-${this.region}`;
      role.addToPolicy(
        new iam.PolicyStatement({
          sid: "PublishCdkFileAssets",
          actions: [
            "s3:GetBucketLocation",
            "s3:GetObject",
            "s3:ListBucket",
            "s3:PutObject",
          ],
          resources: [bootstrapBucket, `${bootstrapBucket}/*`],
        }),
      );
    }

    return role;
  }

  private domainRecordConditions(domainName: string): {
    readonly [key: string]: { readonly [key: string]: string | string[] };
  } {
    return {
      "ForAllValues:StringLike": {
        "route53:ChangeResourceRecordSetsNormalizedRecordNames": [
          domainName,
          `*.${domainName}`,
        ],
      },
      Null: {
        "route53:ChangeResourceRecordSetsNormalizedRecordNames": "false",
      },
    };
  }

  private dnsExecutionPolicy(): iam.PolicyDocument {
    return new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          actions: [
            "route53:CreateHostedZone",
            "route53:GetChange",
            "route53:GetHostedZone",
            "route53:ListHostedZonesByName",
            "route53:ListTagsForResource",
            "route53:ChangeTagsForResource",
          ],
          resources: ["*"],
        }),
        new iam.PolicyStatement({
          actions: [
            "route53:ChangeResourceRecordSets",
            "route53:DeleteHostedZone",
          ],
          resources: [
            Stack.of(this).formatArn({
              service: "route53",
              region: "",
              account: "",
              resource: "hostedzone",
              resourceName: "*",
            }),
          ],
        }),
      ],
    });
  }

  private siteExecutionPolicy(config: WaddlesConfig): iam.PolicyDocument {
    const bucketArn = `arn:${this.partition}:s3:::waddles-website-assets-${this.account}`;
    const bootstrapBucketArn = `arn:${this.partition}:s3:::cdk-hnb659fds-assets-${this.account}-${this.region}`;
    const functionArn = Stack.of(this).formatArn({
      arnFormat: ArnFormat.COLON_RESOURCE_NAME,
      service: "lambda",
      resource: "function",
      resourceName: `${STACK_NAMES.site}-*`,
    });
    const deploymentLayerArn = Stack.of(this).formatArn({
      arnFormat: ArnFormat.COLON_RESOURCE_NAME,
      service: "lambda",
      resource: "layer",
      resourceName: "DeployWebsiteAwsCliLayer*",
    });
    const generatedRoleArn = Stack.of(this).formatArn({
      service: "iam",
      region: "",
      resource: "role",
      resourceName: `${STACK_NAMES.site}-*`,
    });

    return new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          actions: ["s3:*"],
          resources: [bucketArn, `${bucketArn}/*`],
        }),
        new iam.PolicyStatement({
          actions: ["s3:GetObject"],
          resources: [`${bootstrapBucketArn}/*`],
        }),
        new iam.PolicyStatement({
          actions: [
            "cloudfront:CreateDistribution",
            "cloudfront:CreateFunction",
            "cloudfront:CreateInvalidation",
            "cloudfront:CreateOriginAccessControl",
            "cloudfront:CreateResponseHeadersPolicy",
            "cloudfront:DeleteDistribution",
            "cloudfront:DeleteFunction",
            "cloudfront:DeleteOriginAccessControl",
            "cloudfront:DeleteResponseHeadersPolicy",
            "cloudfront:DescribeFunction",
            "cloudfront:GetDistribution",
            "cloudfront:GetDistributionConfig",
            "cloudfront:GetFunction",
            "cloudfront:GetInvalidation",
            "cloudfront:GetOriginAccessControl",
            "cloudfront:GetResponseHeadersPolicy",
            "cloudfront:ListTagsForResource",
            "cloudfront:PublishFunction",
            "cloudfront:TagResource",
            "cloudfront:UntagResource",
            "cloudfront:UpdateDistribution",
            "cloudfront:UpdateFunction",
            "cloudfront:UpdateOriginAccessControl",
            "cloudfront:UpdateResponseHeadersPolicy",
          ],
          resources: ["*"],
        }),
        new iam.PolicyStatement({
          actions: [
            "acm:AddTagsToCertificate",
            "acm:DeleteCertificate",
            "acm:DescribeCertificate",
            "acm:ListTagsForCertificate",
            "acm:RemoveTagsFromCertificate",
            "acm:RequestCertificate",
          ],
          resources: ["*"],
        }),
        new iam.PolicyStatement({
          actions: ["route53:ChangeResourceRecordSets"],
          resources: [
            Stack.of(this).formatArn({
              service: "route53",
              region: "",
              account: "",
              resource: "hostedzone",
              resourceName: "*",
            }),
          ],
          conditions: this.domainRecordConditions(config.domainName),
        }),
        new iam.PolicyStatement({
          actions: [
            "route53:GetChange",
            "route53:GetHostedZone",
            "route53:ListResourceRecordSets",
          ],
          resources: ["*"],
        }),
        new iam.PolicyStatement({
          actions: [
            "iam:AttachRolePolicy",
            "iam:CreateRole",
            "iam:DeleteRole",
            "iam:DeleteRolePolicy",
            "iam:DetachRolePolicy",
            "iam:GetRole",
            "iam:GetRolePolicy",
            "iam:ListAttachedRolePolicies",
            "iam:ListRolePolicies",
            "iam:PassRole",
            "iam:PutRolePolicy",
            "iam:TagRole",
            "iam:UntagRole",
          ],
          resources: [generatedRoleArn],
        }),
        new iam.PolicyStatement({
          actions: ["lambda:*"],
          resources: [functionArn],
        }),
        new iam.PolicyStatement({
          actions: ["lambda:PublishLayerVersion"],
          resources: [deploymentLayerArn],
        }),
        new iam.PolicyStatement({
          actions: ["lambda:DeleteLayerVersion", "lambda:GetLayerVersion"],
          resources: [`${deploymentLayerArn}:*`],
        }),
        new iam.PolicyStatement({
          actions: [
            "logs:CreateLogGroup",
            "logs:DeleteLogGroup",
            "logs:DescribeLogGroups",
            "logs:ListTagsForResource",
            "logs:TagResource",
            "logs:UntagResource",
          ],
          resources: [
            Stack.of(this).formatArn({
              arnFormat: ArnFormat.COLON_RESOURCE_NAME,
              service: "logs",
              resource: "log-group",
              resourceName: `/aws/lambda/${STACK_NAMES.site}-*`,
            }),
          ],
        }),
      ],
    });
  }
}
