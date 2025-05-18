import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({});

const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID;

export const handler = async (event: any) => {
  console.log("Received event:", JSON.stringify(event));

  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const email = body?.email;

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing email in request body" }),
      };
    }

    const command = new InitiateAuthCommand({
      AuthFlow: "CUSTOM_AUTH",
      ClientId: USER_POOL_CLIENT_ID!,
      AuthParameters: {
        USERNAME: email,
      },
    });

    const response = await client.send(command);

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