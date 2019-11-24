import core = require('@aws-cdk/core');
import kinesis = require('@aws-cdk/aws-kinesis')
import lambda = require('@aws-cdk/aws-lambda');
import path = require('path');
import events = require('@aws-cdk/aws-events');
import targets = require('@aws-cdk/aws-events-targets');
import iam = require("@aws-cdk/aws-iam");

export interface CloudWatchLogForwarderProps {
  readonly kinesisProps?: kinesis.StreamProps;
  readonly cloudWatchLogGroupsRetentionInDays?: number;
}

export class CloudWatchLogForwarder extends core.Construct {

  constructor(scope: core.Construct, id: string, props?: CloudWatchLogForwarderProps) {
    super(scope, id);

    // TODO MAX
    // new kinesis.Stream(this, 'Stream', props?.kinesisProps);

    const cloudWatchLogGroupsRetentionInDays = props?.cloudWatchLogGroupsRetentionInDays ?? 7;

    const setExpiryLambda = new lambda.Function(this, 'SetExpiry', {
      // TODO MAX: move this customization in client app
      functionName: 'SetCloudWatchLogGroupsRetention',
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'handler.handler',
      description: 'Sets the log retention policy to the specified no. of days',
      memorySize: 128,
      environment: {
        "LOG_GROUP_RETENTION": String(cloudWatchLogGroupsRetentionInDays)
      },
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'resources', 'SetExpiry'))});

    const createLogGroupEventRule = new events.Rule(this, 'CreateLogGroupEvent', {
      // TODO MAX: name event?
      ruleName: 'LogGroupCreated',
      description: 'Fires whenever CloudTrail detects that a log group is created',
      eventPattern: {
        source: [ "aws.logs" ],
        detailType: ["AWS API Call via CloudTrail"],
        detail: {
          eventSource: [
            "logs.amazonaws.com"
          ],
          eventName: [
            "CreateLogGroup"
          ]
        }
      }
    });

    createLogGroupEventRule.addTarget(new targets.LambdaFunction(setExpiryLambda));
  } 
}

export class ExampleStack extends core.Stack {
  constructor(scope: core.Construct, id: string, props?: core.StackProps) {
    super(scope, id, props);

    new CloudWatchLogForwarder(this, "CloudWatchLogForwarder")
  }
}
