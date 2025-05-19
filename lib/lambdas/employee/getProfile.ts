import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const EMPLOYEES_TABLE_NAME = process.env.EMPLOYEES_TABLE_NAME!;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const claims = event.requestContext.authorizer?.claims;
    const employeeId = claims?.sub;

    if (!employeeId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized: no sub claim found' }),
      };
    }

    const { Item } = await client.send(
      new GetCommand({
        TableName: EMPLOYEES_TABLE_NAME,
        Key: { employeeId },
      })
    );

    if (!Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Employee profile not found' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(Item),
    };
  } catch (err) {
    console.error('Error fetching employee profile:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};