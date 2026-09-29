import { describe, expect, it, vi } from "vitest";
import { type Connection, collectPages } from "~/lib/linear/pagination";

const page = (
  nodes: number[],
  endCursor: string | null,
  hasNextPage: boolean
): Connection<number> => ({ nodes, pageInfo: { endCursor, hasNextPage } });

describe("collectPages", () => {
  it("returns a single page as-is", async () => {
    const fetchPage = vi.fn(() => Promise.resolve(page([1, 2], "c1", false)));

    await expect(collectPages(fetchPage)).resolves.toEqual([1, 2]);
    expect(fetchPage).toHaveBeenCalledWith(null);
  });

  it("follows cursors and concatenates pages in order", async () => {
    const pages = new Map<string | null, Connection<number>>([
      [null, page([1, 2], "c1", true)],
      ["c1", page([3], "c2", true)],
      ["c2", page([4, 5], "c3", false)],
    ]);
    const fetchPage = vi.fn((after: string | null) => {
      const next = pages.get(after);
      if (!next) {
        throw new Error(`Unexpected cursor ${after}`);
      }
      return Promise.resolve(next);
    });

    await expect(collectPages(fetchPage)).resolves.toEqual([1, 2, 3, 4, 5]);
    expect(fetchPage.mock.calls.map(([cursor]) => cursor)).toEqual([
      null,
      "c1",
      "c2",
    ]);
  });

  it("throws instead of truncating when a page limit is exceeded", async () => {
    let pageNumber = 0;
    const fetchPage = () => {
      pageNumber += 1;
      return Promise.resolve(page([pageNumber], `c${pageNumber}`, true));
    };

    await expect(collectPages(fetchPage, { maxPages: 3 })).rejects.toThrow(
      "Stopped after 3 pages; Linear reported more results"
    );
  });

  it("throws when Linear reports more pages without a cursor", async () => {
    const fetchPage = () => Promise.resolve(page([1], null, true));

    await expect(collectPages(fetchPage)).rejects.toThrow(
      "Linear reported another page but no cursor to fetch it"
    );
  });
});
