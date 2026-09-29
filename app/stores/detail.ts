/**
 * Full issue details (description, comments, attachments, relations).
 *
 * Fetched with signed file URLs so images load without auth. Those URLs
 * expire after an hour, so entries older than 50 minutes are refetched.
 */
import { defineStore } from "pinia";
import { reactive, watch } from "vue";
import { describeError } from "~/lib/linear/errors";
import {
  CreateCommentDocument,
  IssueDetailDocument,
} from "~/lib/linear/generated/graphql";
import type { IssueDetail } from "~/lib/linear/types";
import { MutationNotConfirmedError } from "~/lib/triage/executor";
import { useSessionStore } from "./session";
import { issueWriteQueue } from "./write-queue";

export const detailMaxAgeMs = 50 * 60 * 1000;

export interface DetailEntry {
  error: string | null;
  fetchedAt: number | null;
  issue: IssueDetail | null;
  loading: boolean;
}

export const useDetailStore = defineStore("detail", () => {
  const session = useSessionStore();
  const entries = reactive(new Map<string, DetailEntry>());
  const inFlight = new Map<string, Promise<IssueDetail>>();

  const entryFor = (issueId: string): DetailEntry => {
    let entry = entries.get(issueId);
    if (!entry) {
      entry = { error: null, fetchedAt: null, issue: null, loading: false };
      entries.set(issueId, entry);
    }
    return entry;
  };

  const isStale = (issueId: string, now = Date.now()) => {
    const fetchedAt = entries.get(issueId)?.fetchedAt;
    return fetchedAt === null || fetchedAt === undefined
      ? true
      : now - fetchedAt > detailMaxAgeMs;
  };

  /** Returns the cached detail when fresh, otherwise fetches it. */
  function load(
    issueId: string,
    options: { force?: boolean } = {}
  ): Promise<IssueDetail> {
    const entry = entryFor(issueId);
    if (!(options.force || isStale(issueId)) && entry.issue) {
      return Promise.resolve(entry.issue);
    }
    const existing = inFlight.get(issueId);
    if (existing) {
      return existing;
    }
    const client = session.requireClient();
    entry.loading = true;
    const request = client
      .request(IssueDetailDocument, { id: issueId }, { signedFileUrls: true })
      .then(({ issue }) => {
        const current = entryFor(issueId);
        current.issue = issue;
        current.fetchedAt = Date.now();
        current.error = null;
        return issue;
      })
      .catch((failure: unknown) => {
        entryFor(issueId).error = describeError(failure);
        throw failure;
      })
      .finally(() => {
        entryFor(issueId).loading = false;
        inFlight.delete(issueId);
      });
    inFlight.set(issueId, request);
    return request;
  }

  /** Warms the cache; a failure is kept on the entry and shown when opened. */
  function prefetch(issueId: string): void {
    load(issueId).catch(() => {
      // The error is recorded on the entry by load().
    });
  }

  /** Posts a comment, then reloads the issue so it appears in the thread. */
  async function addComment(issueId: string, body: string): Promise<void> {
    const text = body.trim();
    if (!text) {
      throw new Error("Write a comment first");
    }
    const client = session.requireClient();
    const data = await issueWriteQueue.run(issueId, () =>
      client.request(CreateCommentDocument, {
        input: { body: text, issueId },
      })
    );
    if (!data.commentCreate.success) {
      throw new MutationNotConfirmedError();
    }
    await load(issueId, { force: true });
  }

  watch(
    () => session.status,
    (status) => {
      if (status === "disconnected") {
        entries.clear();
      }
    }
  );

  return { addComment, entries, entryFor, isStale, load, prefetch };
});
