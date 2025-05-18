import {
  CognitoIdentityProviderClient,
  RespondToAuthChallengeCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({});

const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID!;
if (!USER_POOL_CLIENT_ID) {
  throw new Error("Missing USER_POOL_CLIENT_ID in environment");
}

export const handler = async (event: any) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { email, code, session } = body;

    if (!email || !code || !session) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "email, code, and session are required" }),
      };
    }

    const command = new RespondToAuthChallengeCommand({
      ClientId: USER_POOL_CLIENT_ID,
      ChallengeName: "CUSTOM_CHALLENGE",
      Session: session,
      ChallengeResponses: {
        USERNAME: email,
        ANSWER: code,
      },
    });

    const result = await client.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({
        AuthenticationResult: result.AuthenticationResult,
        ChallengeName: result.ChallengeName,
        Session: result.Session,
      }),
    };
  } catch (err: any) {
    console.error("verifyOtp error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to verify OTP",
        details: err.message,
      }),
    };
  }
};
