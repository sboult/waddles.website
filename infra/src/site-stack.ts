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
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import type { Construct } from "constructs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

export interface SiteStackProps extends StackProps {
  readonly domainName: string;
  readonly hostedZoneExportName: string;
}

export class SiteStack extends Stack {
  public constructor(scope: Construct, id: string, props: SiteStackProps) {
    super(scope, id, props);

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      "HostedZone",
      {
        hostedZoneId: Fn.importValue(props.hostedZoneExportName),
        zoneName: props.domainName,
      },
    );

    const assets = new s3.Bucket(this, "Assets", {
      bucketName: `waddles-website-assets-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const certificate = new acm.Certificate(this, "Certificate", {
      domainName: props.domainName,
      subjectAlternativeNames: [`www.${props.domainName}`],
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      "ResponseHeaders",
      {
        responseHeadersPolicyName: "waddles-security-headers",
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

    const spaRewrite = new cloudfront.Function(this, "SpaRewrite", {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      comment: "Serve index.html for extensionless SPA routes",
      code: cloudfront.FunctionCode.fromFile({
        filePath: path.join(currentDirectory, "functions/spa-rewrite.js"),
      }),
    });

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      certificate,
      comment: "World Wide Waddles",
      defaultRootObject: "index.html",
      domainNames: [props.domainName, `www.${props.domainName}`],
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
            function: spaRewrite,
          },
        ],
        origin: origins.S3BucketOrigin.withOriginAccessControl(assets),
        responseHeadersPolicy,
        viewerProtocolPolicy:
          cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    new s3deploy.BucketDeployment(this, "DeployWebsite", {
      destinationBucket: assets,
      distribution,
      distributionPaths: ["/", "/index.html", "/assets/*"],
      prune: true,
      sources: [
        s3deploy.Source.asset(
          path.resolve(currentDirectory, "../../apps/www/dist"),
        ),
      ],
      cacheControl: [
        s3deploy.CacheControl.fromString("public,max-age=0,must-revalidate"),
      ],
    });

    for (const [recordType, target] of [
      ["AliasA", route53.RecordType.A],
      ["AliasAAAA", route53.RecordType.AAAA],
    ] as const) {
      new route53.RecordSet(this, recordType, {
        recordType: target,
        target: route53.RecordTarget.fromAlias(
          new targets.CloudFrontTarget(distribution),
        ),
        zone: hostedZone,
      });

      new route53.RecordSet(this, `Www${recordType}`, {
        recordName: "www",
        recordType: target,
        target: route53.RecordTarget.fromAlias(
          new targets.CloudFrontTarget(distribution),
        ),
        zone: hostedZone,
      });
    }

    new CfnOutput(this, "SiteUrl", {
      value: `https://${props.domainName}`,
    });
    new CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
    });
    new CfnOutput(this, "AssetsBucketName", {
      value: assets.bucketName,
    });
  }
}
