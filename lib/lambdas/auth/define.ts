export const handler = async (event: any) => {
  const session = event.request.session || [];

  if (session.length === 0) {
    // First challenge
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
    event.response.challengeName = 'CUSTOM_CHALLENGE';
  } else if (
    session.length > 0 &&
    session[session.length - 1].challengeResult === true
  ) {
    // Challenge passed
    event.response.issueTokens = true;
    event.response.failAuthentication = false;
  } else if (session.length >= 3) {
    // Fail after 3 attempts
    event.response.issueTokens = false;
    event.response.failAuthentication = true;
  } else {
    // Retry challenge
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
    event.response.challengeName = 'CUSTOM_CHALLENGE';
  }

  return event;
};