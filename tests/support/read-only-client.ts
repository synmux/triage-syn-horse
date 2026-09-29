/**
 * A wrapper that makes it impossible for tests to write to the live
 * Linear workspace: any document containing a mutation (or subscription)
 * is rejected before it reaches the network.
 */
import { Kind, OperationTypeNode, parse } from "graphql";
import type { LinearClient } from "~/lib/linear/client";

export class ReadOnlyViolationError extends Error {
  override name = "ReadOnlyViolationError";
}

/** True when the document defines any operation other than a query. */
export function isWriteDocument(source: string): boolean {
  return parse(source).definitions.some(
    (definition) =>
      definition.kind === Kind.OPERATION_DEFINITION &&
      definition.operation !== OperationTypeNode.QUERY
  );
}

export function createReadOnlyClient(client: LinearClient): LinearClient {
  return {
    request(document, variables, options) {
      const source = document.toString();
      if (isWriteDocument(source)) {
        return Promise.reject(
          new ReadOnlyViolationError(
            "Refusing to send a mutation: tests must never write to the live Linear workspace"
          )
        );
      }
      return client.request(document, variables, options);
    },
  };
}
