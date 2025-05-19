# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

## Things I did to setup

commands
------------------------------
* aws configure

* cdk bootstrap aws://882881631138/us-east-1

* npm run build

* cdk deploy

------------------------------
Outputs:
* SecureMessagePortalStack.MessageApiEndpointB5A37478 = https://5l45iuhhrb.execute-api.us-east-1.amazonaws.com/dev/
* SecureMessagePortalStack.UserPoolClientId = 7orpqkbl25j3vdrf3e6um8v5c5
* SecureMessagePortalStack.UserPoolId = us-east-1_RNwRNeTy7
* Stack ARN:
* arn:aws:cloudformation:us-east-1:882881631138:stack/SecureMessagePortalStack/fd0f88a0-32d2-11f0-a95f-0affc56add51

* I used these in the Stack to console log Auth Urls
```ts
    const auth = setupAuth(this, authLambdaRole);

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: auth.userPool.userPoolId,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: auth.userPoolClient.userPoolClientId,
    });
```

* I used this to get SSO for employeePool stuff, we will change this so SAML
```ts
    const employeeAuth = setupEmployeeAuth(this);
```

* Employee login CLient ID: 16t8ejl86l3j68l2k7729nth6s

```ts
https://secure-msg-portal-employee.auth.us-east-1.amazoncognito.com/login
  ?client_id=16t8ejl86l3j68l2k7729nth6s
  &response_type=code
  &scope=email+openid+profile
  &redirect_uri=http://localhost:3000/callback

After you signin using

http://localhost:3000/callback?code=456d3493-5600-4d84-aeb4-7364ed97f7d1

take the code and make POST call

https://secure-msg-portal-employee.auth.us-east-1.amazoncognito.com/oauth2/token

Content-Type: application/x-www-form-urlencoded

Body (x-www-form-urlencoded):
grant_type=authorization_code
client_id=YOUR_CLIENT_ID
code=PASTE_AUTH_CODE_HERE
redirect_uri=http://localhost:3000/callback

```


# Secure Message Portal - Project Plan

## ✅ Core Objectives

* Build a secure, OTP-based login system using AWS Cognito.
* Enable **two-way messaging** and **file sharing** between employees and customers.
* Maintain **multiple conversations** per customer.
* Allow **conversation reassignment** between employees.
* Support **role-based access**, including super users who can see all conversations.
* Support email-based notifications (eventually SMS-based as well).
* Treat messages and files as the same underlying object type.

---

## 🔐 Authentication & Security

* **Login**: Customers log in via email-based OTP using AWS Cognito with a custom auth flow.
* **Verification**: Handled via `startOtp.ts` and `verifyOtp.ts`.
* **JWT Tokens**: Issued by Cognito and passed in Authorization header for secure API access.
* **Authorization**:

  * Employees can access only their assigned conversations.
  * Super users can access all.
  * Customers can access only their own messages/files.

---

## 🧍 User Model

```ts
{
  id: string;              // UUID
  email: string;
  mobileNumber?: string;   // For future SMS-based OTP
  role: 'customer' | 'employee' | 'superuser';
  createdAt: string;
}
```

---

## 💬 Conversation Model

```ts
{
  id: string;                // UUID
  customerId: string;        // FK → User (role = customer)
  assignedEmployeeId: string; // FK → User (role = employee or superuser)
  status: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
}
```

---

## 📄 Message/File Model

```ts
{
  id: string;               // UUID
  conversationId: string;   // FK → Conversation
  senderId: string;         // FK → User
  type: 'text' | 'file';
  content: string;          // message or S3 file URL
  createdAt: string;
}
```

> ✅ **Note**: `message` and `file` are stored in the same table. A file just has `type: 'file'` and its `content` is a file URL.

---

## 📦 DynamoDB Tables

| Table Name      | Description                         |
| --------------- | ----------------------------------- |
| `Users`         | Stores user accounts                |
| `Conversations` | Stores conversation threads         |
| `Messages`      | Stores messages and file references |

---

## ✉️ Email Notifications

* Trigger email via SES when a new message is sent to a customer.
* Email contains a secure link or instructions to view the message.

---

## 🛠️ Key Lambda Functions

| Function             | Purpose                                      |
| -------------------- | -------------------------------------------- |
| `startOtp`           | Begins custom auth with OTP                  |
| `verifyOtp`          | Validates the OTP challenge                  |
| `createMessage`      | Sends a new message/file                     |
| `getMessages`        | Retrieves all messages in a thread           |
| `assignConversation` | Transfers a conversation to another employee |
| `listConversations`  | Lists customer conversations                 |
| `notifyCustomer`     | Triggers email when new message              |

---

## 🧭 Next Steps

1. Define DynamoDB schemas using AWS CDK.
2. Set up REST API routes in API Gateway.
3. Implement message and conversation logic.
4. Configure SES email templates and triggers.
5. Add Cognito groups or custom claims for employee roles.

---

---

---

# NEW DOCS - Secure Message Portal

A secure, serverless messaging platform where employees can initiate conversations and send private messages to customers. Customers authenticate using a one-time passcode (OTP) to view their messages.

---

## 🔐 Authentication

| Role     | Method           | Cognito Pool     |
| -------- | ---------------- | ---------------- |
| Employee | SSO or User Pool | EmployeeUserPool |
| Customer | OTP via email    | CustomerUserPool |

Both users receive JWT tokens to access protected APIs.

---

## 📬 Invite Customer Flow

**Endpoint:** `POST /customer/invite`

**Auth:** Employee JWT required

### Flow:

1. Validate employee JWT
2. Confirm customer is pre-registered in `CustomersTable`
3. Create a `conversationId` and store in `ConversationsTable`
4. Store welcome message in `MessagesTable`
5. Update `CustomersTable.lastConversationId`
6. Send secure login email via SES

**Email contains:**

```
https://<frontend-login-url>?conversationId=<uuid>
```

---

## 📩 OTP Login (Customer)

### Step 1: Start OTP

**Endpoint:** `POST /otp/start`

* Validate email is in `CustomersTable`
* Initiate Cognito CUSTOM\_AUTH flow

### Step 2: Verify OTP

**Endpoint:** `POST /otp/verify`

* Submit code and session to Cognito
* Receive JWT on success

---

## 📨 View Messages

**Endpoint:** `GET /messages/{conversationId}`

**Auth:** Employee or Customer JWT

### Flow:

1. Validate JWT
2. Fetch `conversationId` from `ConversationsTable`
3. Verify requester is either:

   * Employee who initiated the conversation, or
   * Customer with matching email
4. Query `MessagesTable` by `conversationId`

---

## 🗂 DynamoDB Tables

### `CustomersTable`

| Key                | Type | Description     |
| ------------------ | ---- | --------------- |
| email              | PK   | Customer email  |
| name               | str  | Full name       |
| lastConversationId | str  | Latest convo ID |

### `ConversationsTable`

| Key                 | Type | Description           |
| ------------------- | ---- | --------------------- |
| conversationId      | PK   | UUID                  |
| customerEmail       | str  | Associated customer   |
| employeeId          | str  | Initiating employee   |
| title               | str  | Conversation title    |
| status              | str  | invited, active, etc. |
| createdAt/updatedAt | str  | Timestamps            |

### `MessagesTable`

| Key               | Type | Description                |
| ----------------- | ---- | -------------------------- |
| conversationId    | PK   | FK to `ConversationsTable` |
| timestamp         | SK   | ISO8601 timestamp          |
| messageId         | str  | Unique ID                  |
| sender / senderId | str  | Who sent the message       |
| body              | str  | Content                    |
| readByCustomer    | bool | Read tracking              |

---

## 📧 Example Email

```
Subject: You Have a Secure Message from PacMotor

Hi John,
Matthew has sent you a secure message titled “Warranty Claim #12”.
To view it, click the link below:

https://.../customer/login?conversationId=abc-123

Please do not share this link. It is only valid for a limited time.
```

---

## 🛡️ Access Control Summary

| Action             | Who Can Perform   |
| ------------------ | ----------------- |
| Send Invite        | Employee          |
| Start/Verify OTP   | Customer          |
| View Messages      | Employee/Customer |
| View Conversations | *Coming soon*     |

---

## 🔮 Roadmap

* [ ] Endpoint to list conversations
* [ ] Endpoint to send messages
* [ ] Expiring invite links
* [ ] Admin dashboard for employees
* [ ] OTP via SMS support

---

## 📁 File Locations (Lambda)

* `customer/sendInvite.ts`
* `otp/startOtp.ts`
* `otp/verifyOtp.ts`
* `messages/getMessages.ts`
* `conversations/listConversations.ts` *(upcoming)*

---

## 📦 Stack Technologies

* AWS Lambda (business logic)
* API Gateway (REST API)
* Amazon Cognito (auth)
* Amazon DynamoDB (data store)
* Amazon SES (email)

---

## ✅ Deployment Notes

Make sure the following environment variables are set:

* `SES_SENDER_EMAIL`
* `FRONTEND_LOGIN_URL`
* `CUSTOMERS_TABLE`
* `CONVERSATIONS_TABLE`
* `MESSAGES_TABLE`
* `USER_POOL_CLIENT_ID`

---


