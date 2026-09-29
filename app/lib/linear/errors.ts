/**
 * Typed errors for everything that can go wrong talking to Linear.
 *
 * The client maps every failure to one of these so callers can react to
 * the category (reconnect, back off, retry) and show `describeError()` to
 * the user. Messages never contain the API key.
 */

/** Base class so callers can tell Linear failures from programming errors. */
export class LinearError extends Error {
  override name = "LinearError";
}

/** The request never produced a response: offline, DNS, CORS, timeout. */
export class LinearNetworkError extends LinearError {
  override name = "LinearNetworkError";
}

/** The API key is missing, revoked or wrong. */
export class LinearAuthError extends LinearError {
  override name = "LinearAuthError";
}

/** Linear is throttling us; `retryAt` is when it said to try again, if it did. */
export class LinearRateLimitError extends LinearError {
  override name = "LinearRateLimitError";
  readonly retryAt: Date | null;

  constructor(
    message: string,
    details: { retryAt: Date | null },
    options?: ErrorOptions
  ) {
    super(message, options);
    this.retryAt = details.retryAt;
  }
}

/** Linear answered with GraphQL errors (bad input, missing entity, conflicts). */
export class LinearGraphQLError extends LinearError {
  override name = "LinearGraphQLError";
  /** Linear's `extensions.code`, for example `INPUT_ERROR`. */
  readonly code: string | null;
  /** Linear's `extensions.userPresentableMessage`, safe to show as-is. */
  readonly userMessage: string | null;

  constructor(
    message: string,
    details: { code: string | null; userMessage: string | null },
    options?: ErrorOptions
  ) {
    super(message, options);
    this.code = details.code;
    this.userMessage = details.userMessage;
  }
}

/** Linear answered with an HTTP error and no usable GraphQL body. */
export class LinearHttpError extends LinearError {
  override name = "LinearHttpError";
  readonly status: number;

  constructor(status: number, options?: ErrorOptions) {
    super(`Linear returned HTTP ${status}`, options);
    this.status = status;
  }
}

const clockTime = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});

/** Turns any thrown value into one sentence suitable for a toast. */
export function describeError(error: unknown): string {
  if (error instanceof LinearAuthError) {
    return "Linear rejected your API key. Reconnect in Settings.";
  }
  if (error instanceof LinearRateLimitError) {
    return error.retryAt
      ? `Linear's rate limit was reached. Try again after ${clockTime.format(error.retryAt)}.`
      : "Linear's rate limit was reached. Try again in a minute.";
  }
  if (error instanceof LinearGraphQLError) {
    return error.userMessage ?? `Linear refused the request: ${error.message}`;
  }
  if (error instanceof LinearNetworkError) {
    return "Couldn't reach Linear. Check your connection and try again.";
  }
  if (error instanceof LinearHttpError) {
    return `Linear is having trouble (HTTP ${error.status}). Try again shortly.`;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Something went wrong.";
}
