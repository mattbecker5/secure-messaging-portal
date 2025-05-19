// lib/employee-auth.ts
import { Stack } from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';

export function setupEmployeeAuth(stack: Stack) {

  // Employee Cognito User Pool
  const userPool = new cognito.UserPool(stack, 'EmployeeUserPool', {
    userPoolName: 'EmployeeUserPool',
    selfSignUpEnabled: false,
    signInAliases: { email: true },
    autoVerify: { email: true },
    passwordPolicy: {
      minLength: 8,
      requireLowercase: true,
      requireUppercase: true,
      requireDigits: true,
      requireSymbols: false,
    },
  });

  const domain = userPool.addDomain('EmployeeCognitoDomain', {
    cognitoDomain: {
      domainPrefix: 'secure-msg-portal-employee',
    },
  });

  const userPoolClient = new cognito.UserPoolClient(stack, 'EmployeeAppClient', {
    userPool,
    generateSecret: false,
    authFlows: {
      userPassword: true,
    },
    oAuth: {
      flows: {
        authorizationCodeGrant: true,
      },
      scopes: [
        cognito.OAuthScope.EMAIL,
        cognito.OAuthScope.OPENID,
        cognito.OAuthScope.PROFILE,
      ],
      callbackUrls: ['http://localhost:3000/callback'],
      logoutUrls: ['http://localhost:3000/logout'],
    },
  });

  return {
    userPool,
    userPoolClient,
    domain,
  };
}