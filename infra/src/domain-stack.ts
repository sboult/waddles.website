import {
  CfnOutput,
  Fn,
  RemovalPolicy,
  Stack,
  type StackProps,
} from "aws-cdk-lib";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as ssm from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";

export interface DomainStackProps extends StackProps {
  readonly domainName: string;
  readonly hostedZoneParameterName: string;
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

    const hostedZoneParameter = new ssm.StringParameter(
      this,
      "HostedZoneIdParameter",
      {
        parameterName: props.hostedZoneParameterName,
        stringValue: hostedZone.hostedZoneId,
        description: `Route 53 hosted zone ID for ${props.domainName}`,
      },
    );
    hostedZoneParameter.applyRemovalPolicy(RemovalPolicy.RETAIN);

    new CfnOutput(this, "HostedZoneId", {
      value: hostedZone.hostedZoneId,
      description: "Pass as CDK context hostedZoneId when importing the zone",
    });

    new CfnOutput(this, "NameServers", {
      value: Fn.join(",", hostedZone.hostedZoneNameServers ?? []),
      description: "Configure these nameservers at an external registrar",
    });
  }
}
