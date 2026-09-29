/**
 * An in-memory LinearClient for unit tests. Each operation name maps to a
 * handler returning the response data (or throwing); every call is
 * recorded so tests can assert exactly what would have been sent.
 */
import type { LinearClient } from "~/lib/linear/client";

export interface RecordedCall {
  operation: string;
  signedFileUrls: boolean;
  variables: unknown;
}

type Handler = (variables: never) => unknown;

const operationNamePattern = /\b(?:query|mutation)\s+(\w+)/;

export function operationName(document: { toString: () => string }): string {
  const match = operationNamePattern.exec(document.toString());
  if (!match?.[1]) {
    throw new Error(
      "Fake client received a document without an operation name"
    );
  }
  return match[1];
}

export function createFakeClient(handlers: Record<string, Handler>) {
  const calls: RecordedCall[] = [];
  const client: LinearClient = {
    request: (document, variables, options) => {
      const operation = operationName(document);
      calls.push({
        operation,
        signedFileUrls: options?.signedFileUrls ?? false,
        variables,
      });
      const handler = handlers[operation];
      if (!handler) {
        return Promise.reject(
          new Error(`Fake client has no handler for ${operation}`)
        );
      }
      try {
        return Promise.resolve(handler(variables as never)) as Promise<never>;
      } catch (error) {
        return Promise.reject(error);
      }
    },
  };
  return { calls, client };
}
