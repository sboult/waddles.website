import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CfnOutput,
  Duration,
  Fn,
  RemovalPolicy,
  Stack,
  type StackProps,
} from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

export interface PreviewStackProps extends StackProps {
  readonly domainName: string;
  readonly hostedZoneExportName: string;
}

export class PreviewStack extends Stack {
  public constructor(scope: Construct, id: string, props: PreviewStackProps) {
    super(scope, id, props);

    const previewDomainName = `preview.${props.domainName}`;
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      "HostedZone",
      {
        hostedZoneId: Fn.importValue(props.hostedZoneExportName),
        zoneName: props.domainName,
      },
    );

    const assets = new s3.Bucket(this, "Assets", {
      bucketName: `waddles-website-previews-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const certificate = new acm.Certificate(this, "Certificate", {
      domainName: `*.${previewDomainName}`,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      "ResponseHeaders",
      {
        responseHeadersPolicyName: "waddles-preview-security-headers",
        securityHeadersBehavior: {
          contentSecurityPolicy: {
            contentSecurityPolicy:
              "default-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests",
            override: true,
          },
          contentTypeOptions: { override: true },
          frameOptions: {
            frameOption: cloudfront.HeadersFrameOption.DENY,
            override: true,
          },
          referrerPolicy: {
            referrerPolicy:
              cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
            override: true,
          },
          strictTransportSecurity: {
            accessControlMaxAge: Duration.days(365),
            includeSubdomains: true,
            override: true,
            preload: true,
          },
        },
      },
    );

    const previewRewrite = new cloudfront.Function(this, "PreviewRewrite", {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      comment: "Route PR preview hosts to isolated S3 prefixes",
      code: cloudfront.FunctionCode.fromFile({
        filePath: path.join(
          currentDirectory,
          "functions/preview-rewrite.js",
        ),
      }),
    });

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      certificate,
      comment: "World Wide Waddles PR previews",
      domainNames: [`*.${previewDomainName}`],
      enableIpv6: true,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      defaultBehavior: {
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
        functionAssociations: [
          {
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            function: previewRewrite,
          },
        ],
        origin: origins.S3BucketOrigin.withOriginAccessControl(assets),
        responseHeadersPolicy,
        viewerProtocolPolicy:
          cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    for (const [recordId, recordType] of [
      ["AliasA", route53.RecordType.A],
      ["AliasAAAA", route53.RecordType.AAAA],
    ] as const) {
      new route53.RecordSet(this, recordId, {
        recordName: "*.preview",
        recordType,
        target: route53.RecordTarget.fromAlias(
          new targets.CloudFrontTarget(distribution),
        ),
        zone: hostedZone,
      });
    }

    new CfnOutput(this, "PreviewUrlPattern", {
      value: `https://pr-{number}.${previewDomainName}`,
    });
    new CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
    });
    new CfnOutput(this, "AssetsBucketName", {
      value: assets.bucketName,
    });
  }
}
