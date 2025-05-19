// lambdas/customer/registerCustomer.ts
import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const CUSTOMERS_TABLE = process.env.CUSTOMERS_TABLE!;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const claims = event.requestContext.authorizer?.claims;
    const employeeId = claims?.sub;

    if (!employeeId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { email, name, mobileNumber } = body;

    if (!email || !name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: email or name' }),
      };
    }

    const loginToken = generateUuidV4();
    const timestamp = new Date().toISOString();

    const item = {
      email,
      name,
      mobileNumber: mobileNumber || null,
      invitedBy: employeeId,
      status: 'invited',
      loginToken,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await client.send(
      new PutCommand({
        TableName: CUSTOMERS_TABLE,
        Item: item,
      })
    );

    return {
      statusCode: 201,
      body: JSON.stringify({ message: 'Customer registered', loginToken }),
    };
  } catch (err) {
    console.error('Error registering customer:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

function generateUuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
