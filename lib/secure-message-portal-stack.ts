import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { setupApiGateway } from './api-gateway';
import { setupDynamoDB } from './dynamodb';
import { setupAuth } from './auth';
import { setupPermissions } from './permissions';
import * as dotenv from 'dotenv';

dotenv.config();

export class SecureMessagePortalStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const db = setupDynamoDB(this);

    const sesEmail = 'accounts@pacmotor.com';
    const permissions = setupPermissions(this, db, '', sesEmail); // userPoolId not needed yet

    const auth = setupAuth(this, permissions.lambdaRole); // pass role into auth

    // After userPool is created, update the permissions (if needed)
    // (Optional: grant Cognito-specific permissions later here if separate logic is used)

    setupApiGateway(this, db, auth, permissions);

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: auth.userPool.userPoolId,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: auth.userPoolClient.userPoolClientId,
    });
  }
}