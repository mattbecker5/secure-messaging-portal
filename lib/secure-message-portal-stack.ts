import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { setupApiGateway } from './api-gateway';
import { setupDynamoDB } from './dynamodb';
import { setupCustomerAuth } from './customer-auth';
import { setupPermissions } from './permissions';
import { setupEmployeeAuth } from './employee-auth';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dotenv from 'dotenv';

dotenv.config();

export class SecureMessagePortalStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const db = setupDynamoDB(this);

    // Role for Cognito trigger Lambdas
    const authLambdaRole = new iam.Role(this, 'AuthLambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Role for REST API Lambdas
    const apiLambdaRole = new iam.Role(this, 'ApiLambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // setting read access to the employee table
    db.employeesTable.grantReadData(apiLambdaRole);

    // Customer Auth setup with trigger role
    const customerAuth = setupCustomerAuth(this, authLambdaRole);

    // creating SSO login
    const employeeAuth = setupEmployeeAuth(this);

    // SES email address
    const sesEmail = 'accounts@pacmotor.com';

    // Permissions for API Lambdas, SES, Cognito access
    setupPermissions(
      this,
      db,
      customerAuth.userPool.userPoolId,
      employeeAuth.userPool.userPoolId,
      sesEmail,
      apiLambdaRole,
      authLambdaRole
    );


    // API Gateway with API Lambda role
    setupApiGateway(this, db, customerAuth, { lambdaRole: apiLambdaRole }, employeeAuth);

  }
}