import { Stack } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';

export function setupPermissions(stack: Stack, db: any, userPoolId: string, sesEmail: string) {
  const lambdaRole = new iam.Role(stack, 'LambdaExecutionRole', {
    assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    managedPolicies: [
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
    ],
  });

  // Allow access to DynamoDB table
  db.messagesTable.grantReadWriteData(lambdaRole);

  // Allow API Lambdas to call Cognito operations
  lambdaRole.addToPolicy(new iam.PolicyStatement({
    actions: [
      'cognito-idp:AdminGetUser',
      'cognito-idp:AdminCreateUser',
      'cognito-idp:ConfirmSignUp',
      'cognito-idp:InitiateAuth',
      'cognito-idp:RespondToAuthChallenge',
    ],
    resources: [
      `arn:aws:cognito-idp:${stack.region}:${stack.account}:userpool/${userPoolId}`,
    ],
  }));

  // Allow Lambda to send email using SES
  lambdaRole.addToPolicy(new iam.PolicyStatement({
    actions: ['ses:SendEmail', 'ses:SendRawEmail'],
    resources: [
      `arn:aws:ses:${stack.region}:${stack.account}:identity/*`,
      `arn:aws:ses:${stack.region}:${stack.account}:configuration-set/my-first-configuration-set`
    ],
  }));

  return { lambdaRole };
}
