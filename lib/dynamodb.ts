import { Stack } from 'aws-cdk-lib';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export function setupDynamoDB(stack: Stack) {
  const employeesTable = new dynamodb.Table(stack, 'EmployeesTable', {
    partitionKey: { name: 'employeeId', type: dynamodb.AttributeType.STRING },
    removalPolicy: RemovalPolicy.DESTROY,
  });

  const customersTable = new dynamodb.Table(stack, 'CustomersTable', {
    partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
    removalPolicy: RemovalPolicy.DESTROY,
  });

  const conversationsTable = new dynamodb.Table(stack, 'ConversationsTable', {
    partitionKey: { name: 'conversationId', type: dynamodb.AttributeType.STRING },
    removalPolicy: RemovalPolicy.DESTROY,
  });

  const messagesTable = new dynamodb.Table(stack, 'MessagesTable', {
    partitionKey: { name: 'conversationId', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'sentAt', type: dynamodb.AttributeType.STRING },
    removalPolicy: RemovalPolicy.DESTROY,
  });

  return {
    customersTable,
    employeesTable,
    conversationsTable,
    messagesTable,
  };
}