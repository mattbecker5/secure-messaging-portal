import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const dbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const CONVERSATIONS_TABLE = process.env.CONVERSATIONS_TABLE!;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const claims = event.requestContext.authorizer?.claims;
    const email = claims?.email;
    const sub = claims?.sub;

    if (!email || !sub) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    const result = await dbClient.send(
      new ScanCommand({ TableName: CONVERSATIONS_TABLE })
    );

    const allConversations = result.Items || [];

    const filtered = allConversations.filter((conv) =>
      conv.customerEmail === email || conv.initiatedById === sub
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ conversations: filtered }),
    };
  } catch (err) {
    console.error('getConversations error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to retrieve conversations' }),
    };
  }
};