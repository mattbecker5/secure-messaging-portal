import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

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

    const body = JSON.parse(event.body || '{}');
    const messageBody = body.body?.trim();

    if (!messageBody) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Message body is required' }),
      };
    }

    // Step 1: Validate access
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

    // Step 2: Write message
    const timestamp = new Date().toISOString();
    const messageId = generateUuidV4();

    await dbClient.send(
      new PutCommand({
        TableName: MESSAGES_TABLE,
        Item: {
          conversationId,
          messageId,
          sender: email,
          senderId: userId,
          body: messageBody,
          sentAt: timestamp,
          readByCustomer: isEmployee ? false : true, // unread if sent by employee
        },
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Message sent successfully' }),
    };
  } catch (err) {
    console.error('Error posting message:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send message' }),
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