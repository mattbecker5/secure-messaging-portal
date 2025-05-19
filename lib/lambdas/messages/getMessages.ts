import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const dbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const MESSAGES_TABLE = process.env.MESSAGES_TABLE!;
const CONVERSATIONS_TABLE = process.env.CONVERSATIONS_TABLE!;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const claims = event.requestContext.authorizer?.claims;
    const email = claims?.email;
    const userId = claims?.sub;

    if (!email || !userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    const conversationId = event.pathParameters?.conversationId;
    if (!conversationId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing conversationId' }),
      };
    }

    // Step 1: Lookup the conversation record
    const { Item: conversation } = await dbClient.send(
      new GetCommand({
        TableName: CONVERSATIONS_TABLE,
        Key: { conversationId },
      })
    );

    if (!conversation) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Conversation not found' }),
      };
    }

    const isEmployee = conversation.initiatedById === userId;
    const isCustomer = conversation.customerEmail === email;

    if (!isEmployee && !isCustomer) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Access denied' }),
      };
    }

    // Step 2: Get messages for the conversation
    const result = await dbClient.send(
      new QueryCommand({
        TableName: MESSAGES_TABLE,
        KeyConditionExpression: 'conversationId = :cid',
        ExpressionAttributeValues: {
          ':cid': conversationId,
        },
        ScanIndexForward: true,
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ messages: result.Items || [] }),
    };
  } catch (err) {
    console.error('Error getting messages:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to get messages' }),
    };
  }
};