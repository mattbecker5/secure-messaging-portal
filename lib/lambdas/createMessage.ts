import { APIGatewayProxyHandler } from 'aws-lambda';

export const handler: APIGatewayProxyHandler = async (event) => {
  const body = JSON.parse(event.body || '{}');
  console.log('Received message:', body);

  // TODO: Save message to DynamoDB

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Object created successfully' }),
  };
};
