# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

## Things I did to setup

commands
------------------------------
aws configure

cdk bootstrap aws://882881631138/us-east-1

npm run build

cdk deploy

------------------------------
Outputs:
SecureMessagePortalStack.MessageApiEndpointB5A37478 = https://5l45iuhhrb.execute-api.us-east-1.amazonaws.com/dev/
SecureMessagePortalStack.UserPoolClientId = 7orpqkbl25j3vdrf3e6um8v5c5
SecureMessagePortalStack.UserPoolId = us-east-1_RNwRNeTy7
Stack ARN:
arn:aws:cloudformation:us-east-1:882881631138:stack/SecureMessagePortalStack/fd0f88a0-32d2-11f0-a95f-0affc56add51

