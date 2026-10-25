import type { APIGatewayProxyResultV2 } from 'aws-lambda';

interface HelloResponseBody {
  message: string;
}

/** Handles `GET /hello` from API Gateway (HTTP API). */
export const hello = async (): Promise<APIGatewayProxyResultV2> => {
  const responseBody: HelloResponseBody = { message: 'Hello, World!' };

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(responseBody),
  };
};
