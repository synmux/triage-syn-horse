import { describe, expect, it, vi } from "vitest";
import { createLinearClient } from "~/lib/linear/client";
import {
  describeError,
  LinearAuthError,
  LinearGraphQLError,
  LinearHttpError,
  LinearNetworkError,
  LinearRateLimitError,
} from "~/lib/linear/errors";
import { ViewerDocument } from "~/lib/linear/generated/graphql";

const apiKey = "lin_api_unit_test_key_0123456789";
const tookTooLong = /too long/;

const jsonResponse = (
  body: unknown,
  status = 200,
  headers: Record<string, string> = {}
) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", ...headers },
    status,
  });

const viewerData = {
  organization: { name: "synmux", urlKey: "synmux" },
  viewer: {
    avatarUrl: null,
    displayName: "syn",
    email: "syn@example.com",
    id: "user-1",
    name: "syn",
  },
};

// Payloads captured from the real API on 2026-09-29.
const authenticationFailure = {
  errors: [
    {
      extensions: {
        code: "AUTHENTICATION_ERROR",
        statusCode: 401,
        type: "authentication error",
        userError: true,
        userPresentableMessage:
          "You need to authenticate to access this operation.",
      },
      message: "Authentication required, not authenticated",
    },
  ],
};

const entityNotFound = {
  data: null,
  errors: [
    {
      extensions: {
        code: "INPUT_ERROR",
        statusCode: 400,
        type: "invalid input",
        userError: true,
        userPresentableMessage: "Could not find referenced Issue.",
      },
      message: "Entity not found: Issue",
      path: ["issue"],
    },
  ],
};

const clientReturning = (response: Response | Error) => {
  const fetchSpy = vi.fn<typeof fetch>(() =>
    response instanceof Error
      ? Promise.reject(response)
      : Promise.resolve(response)
  );
  return {
    client: createLinearClient({ apiKey, fetch: fetchSpy }),
    fetchSpy,
  };
};

const rejectionOf = async (promise: Promise<unknown>): Promise<unknown> => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("Expected the promise to reject");
};

describe("createLinearClient", () => {
  it("posts the query with the raw key and JSON headers", async () => {
    const { client, fetchSpy } = clientReturning(
      jsonResponse({ data: viewerData })
    );

    await client.request(ViewerDocument, {});

    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe("https://api.linear.app/graphql");
    expect(init?.method).toBe("POST");
    const headers = new Headers(init?.headers);
    expect(headers.get("authorization")).toBe(apiKey);
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.has("public-file-urls-expire-in")).toBe(false);
    expect(JSON.parse(String(init?.body))).toEqual({
      query: ViewerDocument.toString(),
      variables: {},
    });
  });

  it("asks for signed file URLs only when requested", async () => {
    const { client, fetchSpy } = clientReturning(
      jsonResponse({ data: viewerData })
    );

    await client.request(ViewerDocument, {}, { signedFileUrls: true });

    const headers = new Headers(fetchSpy.mock.calls[0]?.[1]?.headers);
    expect(headers.get("public-file-urls-expire-in")).toBe("3600");
  });

  it("returns the data of a successful response", async () => {
    const { client } = clientReturning(jsonResponse({ data: viewerData }));

    await expect(client.request(ViewerDocument, {})).resolves.toEqual(
      viewerData
    );
  });

  it("maps HTTP 401 to LinearAuthError", async () => {
    const { client } = clientReturning(
      jsonResponse(authenticationFailure, 401)
    );

    const error = await rejectionOf(client.request(ViewerDocument, {}));
    expect(error).toBeInstanceOf(LinearAuthError);
  });

  it("maps an AUTHENTICATION_ERROR code to LinearAuthError whatever the status", async () => {
    const { client } = clientReturning(
      jsonResponse(authenticationFailure, 200)
    );

    const error = await rejectionOf(client.request(ViewerDocument, {}));
    expect(error).toBeInstanceOf(LinearAuthError);
  });

  it("maps HTTP 429 to LinearRateLimitError using Retry-After seconds", async () => {
    vi.useFakeTimers({ now: new Date("2026-09-29T04:00:00Z") });
    const { client } = clientReturning(
      jsonResponse({ errors: [{ message: "Too many" }] }, 429, {
        "retry-after": "90",
      })
    );

    const error = await rejectionOf(client.request(ViewerDocument, {}));
    expect(error).toBeInstanceOf(LinearRateLimitError);
    expect((error as LinearRateLimitError).retryAt?.toISOString()).toBe(
      "2026-09-29T04:01:30.000Z"
    );
    vi.useRealTimers();
  });

  it("maps a RATELIMITED code to LinearRateLimitError", async () => {
    const { client } = clientReturning(
      jsonResponse(
        {
          errors: [
            {
              extensions: { code: "RATELIMITED" },
              message: "Rate limit exceeded",
            },
          ],
        },
        400
      )
    );

    const error = await rejectionOf(client.request(ViewerDocument, {}));
    expect(error).toBeInstanceOf(LinearRateLimitError);
    expect((error as LinearRateLimitError).retryAt).toBeNull();
  });

  it("treats partial data with errors as a failure and keeps Linear's message", async () => {
    const { client } = clientReturning(jsonResponse(entityNotFound, 200));

    const error = await rejectionOf(client.request(ViewerDocument, {}));
    expect(error).toBeInstanceOf(LinearGraphQLError);
    expect((error as LinearGraphQLError).code).toBe("INPUT_ERROR");
    expect((error as LinearGraphQLError).userMessage).toBe(
      "Could not find referenced Issue."
    );
  });

  it("maps a non-JSON error body to LinearHttpError", async () => {
    const { client } = clientReturning(
      new Response("<html>Bad gateway</html>", {
        headers: { "content-type": "text/html" },
        status: 502,
      })
    );

    const error = await rejectionOf(client.request(ViewerDocument, {}));
    expect(error).toBeInstanceOf(LinearHttpError);
    expect((error as LinearHttpError).status).toBe(502);
  });

  it("maps a response without data or errors to LinearGraphQLError", async () => {
    const { client } = clientReturning(jsonResponse({ data: null }));

    const error = await rejectionOf(client.request(ViewerDocument, {}));
    expect(error).toBeInstanceOf(LinearGraphQLError);
  });

  it("maps a failed fetch to LinearNetworkError", async () => {
    const { client } = clientReturning(new TypeError("Load failed"));

    const error = await rejectionOf(client.request(ViewerDocument, {}));
    expect(error).toBeInstanceOf(LinearNetworkError);
    expect((error as LinearNetworkError).cause).toBeInstanceOf(TypeError);
  });

  it("times out a request that never answers", async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason)
          );
        })
    );
    const client = createLinearClient({
      apiKey,
      fetch: fetchSpy,
      timeoutMs: 1000,
    });

    const pending = rejectionOf(client.request(ViewerDocument, {}));
    await vi.advanceTimersByTimeAsync(1001);
    const error = await pending;

    expect(error).toBeInstanceOf(LinearNetworkError);
    expect((error as Error).message).toMatch(tookTooLong);
    vi.useRealTimers();
  });

  it("lets a caller abort propagate untouched", async () => {
    const controller = new AbortController();
    const fetchSpy = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason)
          );
        })
    );
    const client = createLinearClient({ apiKey, fetch: fetchSpy });

    const pending = rejectionOf(
      client.request(ViewerDocument, {}, { signal: controller.signal })
    );
    controller.abort();
    const error = await pending;

    expect(error).toBeInstanceOf(DOMException);
    expect((error as DOMException).name).toBe("AbortError");
  });

  it("never puts the API key in an error message", async () => {
    const failures = [
      jsonResponse(authenticationFailure, 401),
      jsonResponse(entityNotFound),
      new TypeError(`fetch failed for ${apiKey}`),
    ];
    const errors = await Promise.all(
      failures.map((failure) =>
        rejectionOf(clientReturning(failure).client.request(ViewerDocument, {}))
      )
    );
    for (const error of errors) {
      expect(String((error as Error).message)).not.toContain(apiKey);
      expect(describeError(error)).not.toContain(apiKey);
    }
  });
});

describe("describeError", () => {
  it("explains each error type in plain English", () => {
    expect(describeError(new LinearAuthError("nope"))).toBe(
      "Linear rejected your API key. Reconnect in Settings."
    );
    expect(
      describeError(
        new LinearRateLimitError("slow down", {
          retryAt: new Date(2026, 8, 29, 4, 30),
        })
      )
    ).toBe("Linear's rate limit was reached. Try again after 04:30.");
    expect(
      describeError(new LinearRateLimitError("slow down", { retryAt: null }))
    ).toBe("Linear's rate limit was reached. Try again in a minute.");
    expect(
      describeError(
        new LinearGraphQLError("Entity not found: Issue", {
          code: "INPUT_ERROR",
          userMessage: "Could not find referenced Issue.",
        })
      )
    ).toBe("Could not find referenced Issue.");
    expect(
      describeError(
        new LinearGraphQLError("Argument Validation Error", {
          code: "INVALID_INPUT",
          userMessage: null,
        })
      )
    ).toBe("Linear refused the request: Argument Validation Error");
    expect(describeError(new LinearNetworkError("offline"))).toBe(
      "Couldn't reach Linear. Check your connection and try again."
    );
    expect(describeError(new LinearHttpError(503))).toBe(
      "Linear is having trouble (HTTP 503). Try again shortly."
    );
    expect(describeError(new Error("Plain failure"))).toBe("Plain failure");
    expect(describeError("weird")).toBe("Something went wrong.");
  });
});
