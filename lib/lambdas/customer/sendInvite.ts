import {
  SESClient,
  SendEmailCommand
} from '@aws-sdk/client-ses';
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AdminCreateUserCommand
} from '@aws-sdk/client-cognito-identity-provider';
import {
  APIGatewayProxyHandler
} from 'aws-lambda';
import {
  DynamoDBClient
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
  PutCommand
} from '@aws-sdk/lib-dynamodb';

const sesClient = new SESClient({});
const cognito = new CognitoIdentityProviderClient({});
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const SES_SENDER_EMAIL = process.env.SES_SENDER_EMAIL!;
const FRONTEND_LOGIN_URL = process.env.FRONTEND_LOGIN_URL!;
const CUSTOMERS_TABLE = process.env.CUSTOMERS_TABLE!;
const CONVERSATIONS_TABLE = process.env.CONVERSATIONS_TABLE!;
const MESSAGES_TABLE = process.env.MESSAGES_TABLE!;
const USER_POOL_ID = process.env.USER_POOL_ID!;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const claims = event.requestContext.authorizer?.claims;
    const employeeEmail = claims?.email;
    const employeeId = claims?.sub;

    if (!employeeEmail || !employeeId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { email, name, title } = body;

    if (!email || !name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: email or name' }),
      };
    }

    // Step 0: Ensure Cognito user exists
    await checkAndCreateCognitoUser(email);

    // Step 1: Check if customer exists
    const { Item: existingCustomer } = await dynamoClient.send(
      new GetCommand({
        TableName: CUSTOMERS_TABLE,
        Key: { email },
      })
    );

    if (!existingCustomer) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Customer not registered' }),
      };
    }

    // Step 2: Create conversation
    const conversationId = generateUuidV4();
    const timestamp = new Date().toISOString();

    await dynamoClient.send(
      new PutCommand({
        TableName: CONVERSATIONS_TABLE,
        Item: {
          conversationId,
          customerEmail: email,
          customerName: name,
          title: title || 'Untitled Conversation',
          initiatedBy: employeeEmail,
          initiatedById: employeeId,
          status: 'invited',
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      })
    );

    // Step 3: Update customer with lastConversationId
    await dynamoClient.send(
      new UpdateCommand({
        TableName: CUSTOMERS_TABLE,
        Key: { email },
        UpdateExpression: 'SET lastConversationId = :cid, updatedAt = :now',
        ExpressionAttributeValues: {
          ':cid': conversationId,
          ':now': timestamp,
        },
      })
    );

    // Step 4: Insert welcome message
    const messageId = generateUuidV4();
    await dynamoClient.send(
      new PutCommand({
        TableName: MESSAGES_TABLE,
        Item: {
          conversationId,
          messageId,
          sender: employeeEmail,
          senderId: employeeId,
          body: 'Welcome to PacMotor Secure Message. This is where you will receive private messages and secure content.',
          sentAt: timestamp,
          readByCustomer: false,
        },
      })
    );

    // Step 5: Send invite email
    const loginUrl = `${FRONTEND_LOGIN_URL}?conversationId=${encodeURIComponent(conversationId)}`;
    const subject = 'You Have a Secure Message from PacMotor';
    const htmlBody = `
      <p>Hi ${name},</p>
      <p>${employeeEmail} has sent you a secure message titled <strong>"${title || 'Untitled Conversation'}"</strong>. To view it, click the link below:</p>
      <p><a href="${loginUrl}">${loginUrl}</a></p>
      <p>This link is valid for a limited time. Please do not share it.</p>
      <p>– PacMotor Secure Message Portal</p>
    `;

    await sesClient.send(
      new SendEmailCommand({
        Destination: { ToAddresses: [email] },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: { Html: { Data: htmlBody, Charset: 'UTF-8' } },
        },
        Source: SES_SENDER_EMAIL,
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Invite sent successfully',
        conversationId,
      }),
    };
  } catch (err) {
    console.error('Error sending invite:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send invite' }),
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

async function checkAndCreateCognitoUser(email: string) {
  try {
    const getUserResult = await cognito.send(new AdminGetUserCommand({
      Username: email,
      UserPoolId: USER_POOL_ID,
    }));

    console.log(`Cognito user exists: ${email}`);
    return getUserResult;
  } catch (err: any) {
    if (err.name === 'UserNotFoundException') {
      console.log(`Cognito user not found, creating user: ${email}`);
      try {
        await cognito.send(new AdminCreateUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: email,
          UserAttributes: [
            { Name: 'email', Value: email },
            { Name: 'email_verified', Value: 'true' },
          ],
          MessageAction: 'SUPPRESS', // We'll send our own email
        }));

        console.log(`Cognito user created successfully: ${email}`);
        return { created: true };
      } catch (createErr: any) {
        console.error(`Failed to create Cognito user: ${email}`, createErr);
        throw new Error(`Failed to create Cognito user: ${createErr.message}`);
      }
    } else {
      console.error(`Unexpected error during AdminGetUser for: ${email}`, err);
      throw new Error(`Unexpected error checking Cognito user: ${err.message}`);
    }
  }
}