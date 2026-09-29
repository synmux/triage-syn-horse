import { describe, expect, it, vi } from "vitest";
import type { LinearClient } from "~/lib/linear/client";
import {
  UpdateIssueDocument,
  ViewerDocument,
} from "~/lib/linear/generated/graphql";
import {
  createReadOnlyClient,
  isWriteDocument,
  ReadOnlyViolationError,
} from "../../support/read-only-client";

describe("isWriteDocument", () => {
  it("recognises mutations, including ones that follow fragments and comments", () => {
    expect(isWriteDocument("mutation Rename { issueUpdate }")).toBe(true);
    expect(
      isWriteDocument(`
        # a comment mentioning query
        fragment Bits on Issue { id }
        mutation Hidden { issueUpdate(id: "x", input: {}) { success } }
      `)
    ).toBe(true);
    expect(isWriteDocument("subscription Watch { issueUpdates }")).toBe(true);
    expect(isWriteDocument(UpdateIssueDocument.toString())).toBe(true);
  });

  it("lets queries through, even when a field is named like a mutation", () => {
    expect(isWriteDocument("query { mutation: viewer { id } }")).toBe(false);
    expect(isWriteDocument(ViewerDocument.toString())).toBe(false);
    expect(isWriteDocument("{ viewer { id } }")).toBe(false);
  });
});

describe("createReadOnlyClient", () => {
  it("rejects mutations without calling the wrapped client", async () => {
    const request = vi.fn();
    const client = createReadOnlyClient({ request } as LinearClient);

    await expect(
      client.request(UpdateIssueDocument, { id: "issue", input: {} })
    ).rejects.toBeInstanceOf(ReadOnlyViolationError);
    expect(request).not.toHaveBeenCalled();
  });

  it("forwards queries with their options", async () => {
    const request = vi.fn(() => Promise.resolve("ok"));
    const client = createReadOnlyClient({ request } as LinearClient);

    await expect(
      client.request(ViewerDocument, {}, { signedFileUrls: true })
    ).resolves.toBe("ok");
    expect(request).toHaveBeenCalledWith(
      ViewerDocument,
      {},
      { signedFileUrls: true }
    );
  });
});
