import {
  CfnOutput,
  Fn,
  RemovalPolicy,
  Stack,
  type StackProps,
} from "aws-cdk-lib";
import * as route53 from "aws-cdk-lib/aws-route53";
import type { Construct } from "constructs";

export interface DomainStackProps extends StackProps {
  readonly domainName: string;
  readonly hostedZoneExportName: string;
}

export class DomainStack extends Stack {
  public constructor(
    scope: Construct,
    id: string,
    props: DomainStackProps,
  ) {
    super(scope, id, props);

    const hostedZone = new route53.PublicHostedZone(this, "HostedZone", {
      zoneName: props.domainName,
      comment: "Foundational DNS for World Wide Waddles",
    });
    hostedZone.applyRemovalPolicy(RemovalPolicy.RETAIN);

    new CfnOutput(this, "HostedZoneId", {
      value: hostedZone.hostedZoneId,
      description: `Route 53 hosted zone ID for ${props.domainName}`,
      exportName: props.hostedZoneExportName,
    });

    new CfnOutput(this, "NameServers", {
      value: Fn.join(",", hostedZone.hostedZoneNameServers ?? []),
      description: "Configure these nameservers at an external registrar",
    });
  }
}
