import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const cognitoClient = new CognitoIdentityProviderClient({});
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const USER_POOL_ID = process.env.EMPLOYEE_USER_POOL_ID!;
const EMPLOYEE_TABLE = process.env.EMPLOYEES_TABLE!;

export const handler = async (event: any) => {
  console.log('🔐 RegisterEmployee event:', event.body);

  try {
    const body = JSON.parse(event.body);
    const { email, name, mobileNumber, password } = body;

    if (!email || !name || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required fields' }),
      };
    }

    // === Step 1: Create the user in Cognito ===
    const createCmd = new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: name },
        ...(mobileNumber ? [{ Name: 'mobile_number', Value: mobileNumber }] : []),
      ],
      MessageAction: 'SUPPRESS', // suppress welcome email
    });

    const createResp = await cognitoClient.send(createCmd);
    const userId = createResp.User?.Attributes?.find(attr => attr.Name === 'sub')?.Value;

    // === Step 2: Set the permanent password ===
    const pwdCmd = new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      Password: password,
      Permanent: false,
    });

    await cognitoClient.send(pwdCmd);

    // === Step 3: Save employee record to DynamoDB ===
    const item = {
      employeeId: userId,
      email,
      name,
      mobileNumber: mobileNumber || null,
      role: 'employee',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dynamoClient.send(
      new PutCommand({
        TableName: EMPLOYEE_TABLE,
        Item: item,
      })
    );

    console.log('✅ Employee registered:', item);

    return {
      statusCode: 201,
      body: JSON.stringify({ message: 'Employee created', employee: item }),
    };
  } catch (err) {
    console.error('❌ Register error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to register employee', error: err }),
    };
  }
};