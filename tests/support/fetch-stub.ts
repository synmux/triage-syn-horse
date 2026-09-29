/**
 * A `fetch` replacement that answers Linear GraphQL requests by operation
 * name, so store tests exercise the real client end to end. Handlers
 * return `data` (or throw a Response to send an error). Every request is
 * recorded with its headers.
 */
import { vi } from "vitest";

export interface StubbedRequest {
  headers: Headers;
  operation: string;
  variables: Record<string, unknown>;
}

// `never` lets each test type its handler's variables precisely.
type Handler = (variables: never) => unknown;

const operationNamePattern = /\b(?:query|mutation)\s+(\w+)/;

export function stubLinearFetch(handlers: Record<string, Handler>) {
  const requests: StubbedRequest[] = [];
  const fetchStub = vi.fn<typeof fetch>(async (_input, init) => {
    const body = JSON.parse(String(init?.body)) as {
      query: string;
      variables: Record<string, unknown>;
    };
    const operation = operationNamePattern.exec(body.query)?.[1] ?? "unknown";
    requests.push({
      headers: new Headers(init?.headers),
      operation,
      variables: body.variables,
    });
    const handler = handlers[operation];
    if (!handler) {
      return Response.json(
        { errors: [{ message: `No stub for ${operation}` }] },
        { status: 400 }
      );
    }
    try {
      return Response.json({ data: await handler(body.variables as never) });
    } catch (thrown) {
      if (thrown instanceof Response) {
        return thrown;
      }
      throw thrown;
    }
  });
  vi.stubGlobal("fetch", fetchStub);
  return { fetchStub, requests };
}

/** A 401 exactly as Linear sends it for a bad key. */
export const authenticationFailure = () =>
  Response.json(
    {
      errors: [
        {
          extensions: { code: "AUTHENTICATION_ERROR", statusCode: 401 },
          message: "Authentication required, not authenticated",
        },
      ],
    },
    { status: 401 }
  );

/** Wraps nodes in a single-page connection. */
export const connection = <TNode>(nodes: TNode[]) => ({
  nodes,
  pageInfo: { endCursor: null, hasNextPage: false },
});
