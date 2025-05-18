import { Stack } from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { join } from 'path';

export function setupApiGateway(
  stack: Stack,
  db: any,
  auth: any,
  permissions: any
) {
  const api = new apigateway.RestApi(stack, 'MessageApi', {
    restApiName: 'Secure Message Service',
    deployOptions: { stageName: 'dev' },
  });

  // === POST /messages ===
  const createMessageLambda = createLambda(stack, 'CreateMessageLambda', 'createMessage.handler', permissions);
  const messages = api.root.addResource('messages');
  messages.addMethod('POST', new apigateway.LambdaIntegration(createMessageLambda));

  // === OTP group ===
  const otp = api.root.addResource('otp');

  // === POST /otp ===
  const startOtpLambda = createLambda(stack, 'StartOtpLambda', 'otp/startOtp.handler', permissions, {
    USER_POOL_ID: auth.userPool.userPoolId,
    USER_POOL_CLIENT_ID: auth.userPoolClient.userPoolClientId,
  });
  otp.addMethod('POST', new apigateway.LambdaIntegration(startOtpLambda));

  // === POST /otp/verify ===
  const verifyOtpLambda = createLambda(stack, 'VerifyOtpLambda', 'otp/verifyOtp.handler', permissions, {
    USER_POOL_ID: auth.userPool.userPoolId,
    USER_POOL_CLIENT_ID: auth.userPoolClient.userPoolClientId,
  });
  otp.addResource('verify').addMethod('POST', new apigateway.LambdaIntegration(verifyOtpLambda));
}

// Shared Lambda creator
function createLambda(
  stack: Stack,
  id: string,
  handler: string,
  permissions: any,
  environment: Record<string, string> = {}
): lambda.Function {
  return new lambda.Function(stack, id, {
    runtime: lambda.Runtime.NODEJS_18_X,
    handler,
    code: lambda.Code.fromAsset(join(__dirname, 'lambdas')),
    role: permissions.lambdaRole,
    environment,
  });
}