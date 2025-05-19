import { Stack } from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { join } from 'path';

export function setupApiGateway(
  stack: Stack,
  db: any,
  customerAuth: any,
  permissions: any,
  employeeAuth: any
) {
  const api = new apigateway.RestApi(stack, 'MessageApi', {
    restApiName: 'Secure Message Service',
    deployOptions: { stageName: 'dev' },
  });

  // === POST /otp ===
  const startOtpLambda = createLambda(stack, 'StartOtpLambda', 'otp/startOtp.handler', permissions, {
    USER_POOL_CLIENT_ID: customerAuth.userPoolClient.userPoolClientId,
    CUSTOMERS_TABLE: db.customersTable.tableName,
  });

  // GRANT read permissions to database table
  db.customersTable.grantReadData(startOtpLambda);

  const otp = api.root.addResource('otp');
  otp.addMethod('POST', new apigateway.LambdaIntegration(startOtpLambda));

  // === POST /otp/verify ===
  const verifyOtpLambda = createLambda(stack, 'VerifyOtpLambda', 'otp/verifyOtp.handler', permissions, {
    USER_POOL_ID: customerAuth.userPool.userPoolId,
    USER_POOL_CLIENT_ID: customerAuth.userPoolClient.userPoolClientId,
  });
  otp.addResource('verify').addMethod('POST', new apigateway.LambdaIntegration(verifyOtpLambda));

  // === Cognito Authorizer for EmployeeUserPool ===
  const employeeAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(stack, 'EmployeeUserPoolAuthorizer', {
    cognitoUserPools: [employeeAuth.userPool],
  });

  // === /employee/ ===
  const employee = api.root.addResource('employee');

  // === GET /employee/profile (JWT-protected) ===
  const profile = employee.addResource('profile');
  const getProfileLambda = createLambda(
    stack,
    'GetEmployeeProfileLambda',
    'employee/getProfile.handler',
    permissions,
    {
      EMPLOYEES_TABLE_NAME: db.employeesTable.tableName,
    }
  );

  profile.addMethod('GET', new apigateway.LambdaIntegration(getProfileLambda), {
    authorizer: employeeAuthorizer,
    authorizationType: apigateway.AuthorizationType.COGNITO,
  });

  // === POST /employee/register (admin only must already have account) ===
  const registerEmployee = employee.addResource('register');
  const registerEmployeeLambda = createLambda(stack, 'RegisterEmployeeLambda', 'employee/register.handler', permissions, {
    EMPLOYEE_USER_POOL_ID: employeeAuth.userPool.userPoolId,
    EMPLOYEES_TABLE: db.employeesTable.tableName,
  });

  registerEmployee.addMethod('POST', new apigateway.LambdaIntegration(registerEmployeeLambda), {
    authorizer: employeeAuthorizer,
    authorizationType: apigateway.AuthorizationType.COGNITO,
  });

  // === /customer group ===
  const customer = api.root.addResource('customer');

  // === POST /customer/register (JWT-protected via employee authorizer) ===
  const registerCustomerLambda = createLambda(stack, 'RegisterCustomerLambda', 'customer/register.handler', permissions, {
    CUSTOMERS_TABLE: db.customersTable.tableName,
  });

  // GRANT write permissions to database table
  db.customersTable.grantWriteData(registerCustomerLambda);

  const registerCustomer = customer.addResource('register');
  registerCustomer.addMethod('POST', new apigateway.LambdaIntegration(registerCustomerLambda), {
    authorizer: employeeAuthorizer,
    authorizationType: apigateway.AuthorizationType.COGNITO,
  });

  // === POST /customer/invite (JWT-protected) ===
  const sendInviteLambda = createLambda(stack, 'SendCustomerInviteLambda', 'customer/sendInvite.handler', permissions, {
    SES_SENDER_EMAIL: 'accounts@pacmotor.com',
    FRONTEND_LOGIN_URL: 'https://5l45iuhhrb.execute-api.us-east-1.amazonaws.com/dev/customer/login',
    CUSTOMERS_TABLE: db.customersTable.tableName,
    CONVERSATIONS_TABLE: db.conversationsTable.tableName,
    MESSAGES_TABLE: db.messagesTable.tableName,
    USER_POOL_ID: customerAuth.userPool.userPoolId
  });

  // === GRANT read/write permissions to all involved tables ===
  db.customersTable.grantReadWriteData(sendInviteLambda);
  db.conversationsTable.grantReadWriteData(sendInviteLambda);
  db.messagesTable.grantWriteData(sendInviteLambda); // Only write needed for initial welcome message

  // === Define API resource ===
  const inviteCustomer = customer.addResource('invite');

  inviteCustomer.addMethod('POST', new apigateway.LambdaIntegration(sendInviteLambda), {
    authorizer: employeeAuthorizer,
    authorizationType: apigateway.AuthorizationType.COGNITO,
  });

  // === Shared Authorizer (employee or customer) ===
  const sharedAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(stack, 'SharedAuthorizer', {
    cognitoUserPools: [employeeAuth.userPool, customerAuth.userPool],
  });

  // === GET /messages/{conversationId} (JWT-protected by either customer or employee) ===
  const getMessagesLambda = createLambda(
    stack,
    'GetMessagesLambda',
    'messages/getMessages.handler',
    permissions,
    {
      MESSAGES_TABLE: db.messagesTable.tableName,
      CONVERSATIONS_TABLE: db.conversationsTable.tableName
    }
  );

  db.messagesTable.grantReadData(getMessagesLambda);
  db.conversationsTable.grantReadData(getMessagesLambda);

  const messages = api.root.addResource('messages');
  const messagesById = messages.addResource('{conversationId}');

  messagesById.addMethod('GET', new apigateway.LambdaIntegration(getMessagesLambda), {
    authorizer: sharedAuthorizer,
    authorizationType: apigateway.AuthorizationType.COGNITO,
  });

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