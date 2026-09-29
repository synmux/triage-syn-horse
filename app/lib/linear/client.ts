/**
 * A minimal, typed GraphQL client for Linear's public API.
 *
 * It sends a personal API key straight from the browser (Linear allows
 * CORS) and maps every failure to a typed error from `./errors`.
 */
import {
  LinearAuthError,
  LinearGraphQLError,
  LinearHttpError,
  LinearNetworkError,
  LinearRateLimitError,
} from "./errors";
import type { TypedDocumentString } from "./generated/graphql";

export const linearGraphqlEndpoint = "https://api.linear.app/graphql";

/** Lifetime of signed `uploads.linear.app` URLs requested with `signedFileUrls`. */
export const signedFileUrlLifetimeSeconds = 3600;

const defaultTimeoutMs = 20_000;

export interface RequestOptions {
  /** Abort the request; the abort reason is rethrown untouched. */
  signal?: AbortSignal;
  /** Return signed, auth-free URLs for files embedded in markdown fields. */
  signedFileUrls?: boolean;
}

export interface LinearClient {
  request: <TResult, TVariables>(
    document: TypedDocumentString<TResult, TVariables>,
    variables: TVariables,
    options?: RequestOptions
  ) => Promise<TResult>;
}

export interface LinearClientOptions {
  apiKey: string;
  endpoint?: string;
  fetch?: typeof globalThis.fetch;
  /** Give up on a request after this long (default 20 seconds). */
  timeoutMs?: number;
}

interface GraphQLErrorPayload {
  extensions?: {
    code?: string;
    userPresentableMessage?: string;
  };
  message?: string;
}

interface GraphQLResponseBody<TResult> {
  data?: TResult | null;
  errors?: GraphQLErrorPayload[];
}

class RequestTimeoutError extends Error {
  override name = "TimeoutError";
}

export function createLinearClient(options: LinearClientOptions): LinearClient {
  // Resolve the global fetch per request rather than capturing it now, so a
  // long-lived client always uses the current implementation.
  const fetchImplementation: typeof globalThis.fetch =
    options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  const endpoint = options.endpoint ?? linearGraphqlEndpoint;
  const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;

  return {
    async request<TResult, TVariables>(
      document: TypedDocumentString<TResult, TVariables>,
      variables: TVariables,
      requestOptions: RequestOptions = {}
    ): Promise<TResult> {
      const headers: Record<string, string> = {
        Authorization: options.apiKey,
        "Content-Type": "application/json",
      };
      if (requestOptions.signedFileUrls) {
        headers["public-file-urls-expire-in"] = String(
          signedFileUrlLifetimeSeconds
        );
      }

      const timeoutController = new AbortController();
      const timer = setTimeout(
        () =>
          timeoutController.abort(
            new RequestTimeoutError("Linear took too long to respond")
          ),
        timeoutMs
      );
      const signal = requestOptions.signal
        ? AbortSignal.any([requestOptions.signal, timeoutController.signal])
        : timeoutController.signal;

      let response: Response;
      try {
        response = await fetchImplementation(endpoint, {
          body: JSON.stringify({ query: document.toString(), variables }),
          headers,
          method: "POST",
          signal,
        });
      } catch (error) {
        if (requestOptions.signal?.aborted) {
          throw requestOptions.signal.reason;
        }
        if (timeoutController.signal.aborted) {
          throw new LinearNetworkError("Linear took too long to respond", {
            cause: error,
          });
        }
        throw new LinearNetworkError("Could not reach Linear", {
          cause: error,
        });
      } finally {
        clearTimeout(timer);
      }

      const body = await readJsonBody<TResult>(response);
      const firstError = body?.errors?.[0];
      if (firstError || !response.ok) {
        throw toLinearError(response, firstError);
      }
      if (body?.data === null || body?.data === undefined) {
        throw new LinearGraphQLError("Linear returned no data", {
          code: null,
          userMessage: null,
        });
      }
      return body.data;
    },
  };
}

async function readJsonBody<TResult>(
  response: Response
): Promise<GraphQLResponseBody<TResult> | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) {
    return null;
  }
  try {
    return (await response.json()) as GraphQLResponseBody<TResult>;
  } catch (error) {
    throw new LinearHttpError(response.status, { cause: error });
  }
}

function toLinearError(
  response: Response,
  graphqlError: GraphQLErrorPayload | undefined
): Error {
  const code = graphqlError?.extensions?.code ?? null;
  const message = graphqlError?.message ?? `HTTP ${response.status}`;

  if (response.status === 401 || code === "AUTHENTICATION_ERROR") {
    return new LinearAuthError(message);
  }
  if (response.status === 429 || code === "RATELIMITED") {
    return new LinearRateLimitError(message, {
      retryAt: parseRetryAfter(response.headers.get("retry-after")),
    });
  }
  if (graphqlError) {
    return new LinearGraphQLError(message, {
      code,
      userMessage: graphqlError.extensions?.userPresentableMessage ?? null,
    });
  }
  return new LinearHttpError(response.status);
}

/** `Retry-After` is either delta-seconds or an HTTP date. */
function parseRetryAfter(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return new Date(Date.now() + seconds * 1000);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
