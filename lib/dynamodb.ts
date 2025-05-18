import { Stack } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export function setupDynamoDB(stack: Stack) {
  const messagesTable = new dynamodb.Table(stack, 'MessagesTable', {
    partitionKey: { name: 'objectId', type: dynamodb.AttributeType.STRING },
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  });

  return { messagesTable };
}