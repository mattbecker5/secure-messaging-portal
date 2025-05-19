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
  console.log("Verifying OTP...");

  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
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

    if (result.AuthenticationResult) {
      // OTP verified successfully
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "OTP verified",
          idToken: result.AuthenticationResult.IdToken,
          accessToken: result.AuthenticationResult.AccessToken,
          refreshToken: result.AuthenticationResult.RefreshToken,
          expiresIn: result.AuthenticationResult.ExpiresIn,
          tokenType: result.AuthenticationResult.TokenType,
        }),
      };
    }

    // Still in challenge
    return {
      statusCode: 401,
      body: JSON.stringify({
        error: "OTP verification failed or requires additional steps",
        nextChallenge: result.ChallengeName,
        session: result.Session,
      }),
    };
  } catch (err: any) {
    console.error("verifyOtp error:", err);

    const message = err?.name === "NotAuthorizedException"
      ? "Invalid code or session"
      : err?.message || "Unknown error";

    return {
      statusCode: 403,
      body: JSON.stringify({
        error: "OTP verification failed",
        details: message,
      }),
    };
  }
};