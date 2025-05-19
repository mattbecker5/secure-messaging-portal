import { Stack } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';

export function setupPermissions(
  stack: Stack,
  db: any,
  customerUserPoolId: string,
  employeeUserPoolId: string,
  sesEmail: string,
  apiLambdaRole: iam.Role,
  authLambdaRole?: iam.Role
) {
  // Allow access to DynamoDB tables
  db.messagesTable.grantReadWriteData(apiLambdaRole);
  db.employeesTable.grantReadWriteData(apiLambdaRole);

  // === Customer Cognito permissions ===
  const customerCognitoPolicy = new iam.PolicyStatement({
    actions: [
      'cognito-idp:AdminGetUser',
      'cognito-idp:AdminCreateUser',
      'cognito-idp:ConfirmSignUp',
      'cognito-idp:InitiateAuth',
      'cognito-idp:RespondToAuthChallenge',
    ],
    resources: [
      `arn:aws:cognito-idp:${stack.region}:${stack.account}:userpool/${customerUserPoolId}`,
    ],
  });
  apiLambdaRole.addToPolicy(customerCognitoPolicy);

  // === Employee Cognito permissions ===
  const employeeCognitoPolicy = new iam.PolicyStatement({
    actions: [
      'cognito-idp:AdminCreateUser',
      'cognito-idp:AdminSetUserPassword',
    ],
    resources: [
      `arn:aws:cognito-idp:${stack.region}:${stack.account}:userpool/${employeeUserPoolId}`,
    ],
  });
  apiLambdaRole.addToPolicy(employeeCognitoPolicy);

  // === SES permissions ===
  const sesPolicy = new iam.PolicyStatement({
    actions: ['ses:SendEmail', 'ses:SendRawEmail'],
    resources: [
      `arn:aws:ses:${stack.region}:${stack.account}:identity/*`,
      `arn:aws:ses:${stack.region}:${stack.account}:configuration-set/my-first-configuration-set`,
    ],
  });
  apiLambdaRole.addToPolicy(sesPolicy);

  if (authLambdaRole) {
    authLambdaRole.addToPolicy(sesPolicy);
  }

  return { lambdaRole: apiLambdaRole };
}
