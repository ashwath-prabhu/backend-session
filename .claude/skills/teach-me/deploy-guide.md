# Guided deploy: Part 4 (Serverless) to AWS

Walk the learner through deploying `part-4-serverless/services/users` **one step at a time**. At each step: explain what it does and why (briefly), give the command, have them run it (or run it for them if they ask), read the output together, and confirm it succeeded **before** moving on. If a step fails, stop and fix it using the troubleshooting table at the end.

All commands after Step 2 run in:

```bash
cd part-4-serverless/services/users
```

## Step 0: The big picture (explain before touching anything)

Show this and make sure they get the idea: unlike Parts 1–3, **there's no server process to keep running**. AWS runs the code only when a request arrives.

```text
 npm run deploy  (serverless deploy)
       │
       ├─ 1. serverless-esbuild bundles src/handlers/hello.ts → hello.js
       ├─ 2. zips it → .serverless/users.zip
       ├─ 3. uploads the zip to an S3 "deployment bucket"
       └─ 4. creates/updates a CloudFormation stack named users-dev, which creates:
              • a Lambda function     users-dev-hello   (your code)
              • an HTTP API           API Gateway, route GET /hello → the Lambda
              • an IAM role           permissions the Lambda runs with
              • a CloudWatch log group  where console.log output goes

 After deploy:
   curl https://<id>.execute-api.ap-south-1.amazonaws.com/hello
       → API Gateway → runs the Lambda → {"message":"Hello, World!"}
```

Check: ask them which part of this plays the role of `app.get("/hello")` from Part 3 (answer: the API Gateway route defined by `httpApi` in `serverless.yml`).

## Step 1: Check the tools

```bash
node -v              # v20+ works; the README recommends v22 (nvm use 22)
aws --version        # aws-cli/2.x
sls --version        # Framework Core: 3.x.x (NOT 4.x)
```

- **AWS CLI missing:** point them to Step 5 of the root `README.md`.
- **`sls` shows 4.x:** `npm uninstall -g serverless && npm install -g serverless@3`. The project's npm scripts use the local copy in `node_modules`, but the README standardizes on v3.

## Step 2: AWS credentials

```bash
aws configure list
```

If `access_key` shows `<not set>`, the learner must run this **in their own terminal**. It's interactive, and the keys must never go into the chat:

```bash
aws configure
# AWS Access Key ID:     <from the workshop-admin CSV>
# AWS Secret Access Key: <from the workshop-admin CSV>
# Default region name:   ap-south-1
# Default output format: json
```

Then verify:

```bash
aws sts get-caller-identity
```

- `Arn` should end in `:user/workshop-admin`.
- **Ends in `:root`:** they used root keys. Stop, have them delete those keys in IAM and use the `workshop-admin` keys (root `README.md` Step 0.4).
- **`InvalidClientTokenId`:** the keys were copied wrong; run `aws configure` again.

Teach: the Serverless Framework uses these same credentials. Everything it creates belongs to this account and region.

## Step 3: Install and pre-flight checks

```bash
cd part-4-serverless/services/users
npm install
npm run lint
npm run build       # tsc type check + `serverless package` (builds locally, uploads nothing)
```

`build` prints `Warning: Invalid configuration encountered at 'provider.runtime'`. Explain: Serverless v3's config checker is older than the `nodejs22.x` runtime, so it warns, but packaging still works. If AWS later rejects the runtime, the troubleshooting table has the fix.

**Teaching moment: look at what will be uploaded.**

```bash
unzip -l .serverless/users.zip
# src/handlers/hello.js  and  hello.js.map: one bundled file, no node_modules

grep -o '"Type": "[^"]*"' .serverless/cloudformation-template-update-stack.json | sort | uniq -c
```

Expected resource types: `AWS::Lambda::Function`, `AWS::Lambda::Permission`, `AWS::Lambda::Version`, `AWS::ApiGatewayV2::Api`, `AWS::ApiGatewayV2::Route`, `AWS::ApiGatewayV2::Integration`, `AWS::ApiGatewayV2::Stage`, `AWS::IAM::Role`, `AWS::Logs::LogGroup`, `AWS::S3::Bucket`, `AWS::S3::BucketPolicy`. Map each one back to the Step 0 diagram. Ask: "Which of these is our `GET /hello`?" (`ApiGatewayV2::Route`).

**Run it locally first** (no AWS needed):

```bash
npm run invoke      # expect "statusCode": 200 and "message": "Hello, World!"
```

Optional: `npm run offline` then `curl -i http://localhost:3000/hello` in another terminal (stop the Part 1 TCP server first, because both use port 3000). Ctrl+C to stop.

## Step 4: Deploy

Explain what's about to happen (Step 0 diagram) and that it **creates real resources in their AWS account**. They stay within the free tier for a workshop, but they must be removed afterwards.

**Ask for an explicit yes before deploying.** Then the learner runs it, or you run it with their go-ahead:

```bash
npm run deploy
```

It takes about 1–3 minutes. Expected ending:

```text
✔ Service deployed to stack users-dev (…s)

endpoint: GET - https://<id>.execute-api.ap-south-1.amazonaws.com/hello
functions:
  hello: users-dev-hello (…)
```

Point out the stack name (`service` + `stage` = `users-dev`) and the endpoint URL.

## Step 5: Test the live API

```bash
curl -i https://<id>.execute-api.ap-south-1.amazonaws.com/hello
curl -i https://<id>.execute-api.ap-south-1.amazonaws.com/unknown
```

- `/hello` → `HTTP/2 200` with `{"message":"Hello, World!"}`.
- `/unknown` → `404` with `{"message":"Not Found"}`. This 404 comes from **API Gateway itself**, because no route matched, so the Lambda never ran. Compare with Parts 2 and 3, where *our code* wrote the 404.
- Compare the headers with Part 3: there's no `X-Powered-By: Express`, and there's an `apigw-requestid` header from API Gateway.

## Step 6: Explore what was created

```bash
npx serverless info                     # endpoint, function names, stack
npx serverless invoke --function hello  # run the deployed Lambda directly, without API Gateway
npx serverless logs --function hello    # CloudWatch logs (START/END/REPORT lines: duration, memory)
```

In the AWS Console (region **ap-south-1, Mumbai**, top-right dropdown), have them find:

- **CloudFormation → Stacks → `users-dev`**: the Resources tab lists everything from Step 3.
- **Lambda → `users-dev-hello`**: the code, the runtime and the trigger (API Gateway).
- **API Gateway → `dev-users`**: Routes → `GET /hello`.
- **CloudWatch → Log groups → `/aws/lambda/users-dev-hello`**.

Teach from the `REPORT` log line: **cold start** (`Init Duration` appears on the first call only), billed duration, memory size (128 MB from `serverless.yml`).

Optional experiment, **only with the learner's OK**: change the message in `src/handlers/hello.ts`, run `npx serverless deploy function --function hello` (faster: code only), `curl` again, then **restore the file** (`git checkout -- src/handlers/hello.ts`) and redeploy the function so AWS matches the repo.

## Step 7: Clean up (always)

**Ask for an explicit yes**, then:

```bash
npm run remove
```

Verify it's gone:

```bash
aws cloudformation describe-stacks --stack-name users-dev --region ap-south-1
# expected: An error occurred (ValidationError) ... Stack with id users-dev does not exist
```

Recap with three questions, e.g.:

1. What does API Gateway do in this setup, and which Part 3 line does it replace?
2. Why is nothing running when nobody calls the API, and how is that different from `node server.js`?
3. What does `npm run remove` delete, and why must you run it after every lab?

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `AWS provider credentials not found` | Step 2 not done: `aws configure`. |
| `The security token included in the request is invalid` | Wrong keys: run `aws configure` again with the CSV values. |
| `AccessDenied` / `not authorized to perform` | The IAM user lacks permissions: it needs `AdministratorAccess` for the workshop (root `README.md` Step 0.4). |
| `Invalid value specified for runtime` / `nodejs22.x` rejected | In `serverless.yml`, change `runtime: nodejs22.x` → `nodejs20.x` and `target: node22` → `node20`, then deploy again. Explain why: v3's built-in runtime list is older than Node 22. |
| `Stack users-dev is in UPDATE_ROLLBACK_FAILED` or a similar stuck state | `npm run remove`, wait for it to finish, then deploy again. If it's still stuck, delete the stack in the CloudFormation console. |
| `Cannot find module 'hello'` (in `offline` or on AWS) | The handler file has a dot in its name. It must be `src/handlers/hello.ts` with handler `src/handlers/hello.hello`. |
| `listen EADDRINUSE :::3000` with `npm run offline` | Part 1's TCP server (or another process) is using port 3000. Stop it, or run `npx serverless offline --httpPort 3005`. |
| `curl` to the endpoint gives `{"message":"Not Found"}` | Wrong path or URL: use `/hello` and the endpoint from *this* deploy (`npx serverless info`). |
| `sls --version` shows 4.x and asks for a login | The global CLI is v4: `npm uninstall -g serverless && npm install -g serverless@3`. |
