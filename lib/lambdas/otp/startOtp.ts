import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const cognito = new CognitoIdentityProviderClient({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID!;
const CUSTOMERS_TABLE = process.env.CUSTOMERS_TABLE!;

export const handler = async (event: any) => {
  console.log("Received OTP event:", JSON.stringify(event));

  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const email = body?.email;

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing email in request body" }),
      };
    }

    // Step 1: Confirm customer exists in the DB
    const { Item } = await ddb.send(new GetCommand({
      TableName: CUSTOMERS_TABLE,
      Key: { email }, // assumes 'email' is the partition key
    }));

    if (!Item) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "This email is not authorized to access messages" }),
      };
    }

    // Step 2: Begin custom auth flow with Cognito
    const authCommand = new InitiateAuthCommand({
      AuthFlow: "CUSTOM_AUTH",
      ClientId: USER_POOL_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
      },
    });

    const response = await cognito.send(authCommand);

    return {
      statusCode: 200,
      body: JSON.stringify({
        challengeName: response.ChallengeName,
        session: response.Session,
      }),
    };
  } catch (error: any) {
    console.error("startOtp error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to initiate auth",
        details: error.message,
      }),
    };
  }
};