// === /lib/auth.ts ===
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Stack } from 'aws-cdk-lib';
import { join } from 'path';

export function setupAuth(stack: Stack, lambdaRole: iam.Role) {
  const defineAuthChallenge = new lambda.Function(stack, 'DefineAuthChallenge', {
    runtime: lambda.Runtime.NODEJS_18_X,
    handler: 'define.handler',
    code: lambda.Code.fromAsset(join(__dirname, 'lambdas', 'auth')),
    role: lambdaRole,
  });

  const createAuthChallenge = new lambda.Function(stack, 'CreateAuthChallenge', {
    runtime: lambda.Runtime.NODEJS_18_X,
    handler: 'create.handler',
    code: lambda.Code.fromAsset(join(__dirname, 'lambdas', 'auth')),
    role: lambdaRole,
  });

  const verifyAuthChallengeResponse = new lambda.Function(stack, 'VerifyAuthChallengeResponse', {
    runtime: lambda.Runtime.NODEJS_18_X,
    handler: 'verify.handler',
    code: lambda.Code.fromAsset(join(__dirname, 'lambdas', 'auth')),
    role: lambdaRole,
  });

  const userPool = new cognito.UserPool(stack, 'CustomerUserPool', {
    signInAliases: { email: true },
    autoVerify: { email: true },
    lambdaTriggers: {
      defineAuthChallenge,
      createAuthChallenge,
      verifyAuthChallengeResponse,
    },
  });

  const userPoolClient = new cognito.UserPoolClient(stack, 'CustomerUserPoolClient', {
    userPool,
    generateSecret: false,
    authFlows: { custom: true },
  });

  return {
    userPool,
    userPoolClient,
    lambdas: {
      defineAuthChallenge,
      createAuthChallenge,
      verifyAuthChallengeResponse,
    },
  };
}