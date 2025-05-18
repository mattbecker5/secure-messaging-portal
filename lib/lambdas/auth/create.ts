import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({});
const senderEmail = 'accounts@pacmotor.com'; // ✅ your verified SES sender

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
}

export const handler = async (event: any) => {
  try {
    const email = event.request?.userAttributes?.email;
    if (!email) {
      throw new Error('Missing email attribute');
    }

    const code = generateOTP();

    event.response.publicChallengeParameters = { email };
    event.response.privateChallengeParameters = { answer: code };
    event.response.challengeMetadata = `CODE-${code}`;

    const sendCommand = new SendEmailCommand({
      Source: senderEmail,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: 'Your OTP Code' },
        Body: {
          Text: { Data: `Your verification code is: ${code}` },
        },
      },
    });

    console.log(`Sending OTP ${code} to ${email}`);
    await ses.send(sendCommand);

    return event;
  } catch (error: any) {
    console.error('CreateAuthChallenge failed:', error);
    throw new Error(`CreateAuthChallenge failed: ${error.message}`);
  }
};