/** The shape Linear uses for every paginated connection. */
export interface Connection<TNode> {
  nodes: TNode[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor?: string | null;
  };
}

/**
 * Fetches every page of a Linear connection by following `endCursor`.
 *
 * Throws rather than silently truncating when there are more pages than
 * `maxPages`, or when Linear reports another page without a cursor.
 */
export async function collectPages<TNode>(
  fetchPage: (after: string | null) => Promise<Connection<TNode>>,
  options: { maxPages?: number } = {}
): Promise<TNode[]> {
  const maxPages = options.maxPages ?? 20;
  const collected: TNode[] = [];
  let cursor: string | null = null;

  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
    // Pages must be fetched in order: each request needs the previous cursor.
    // biome-ignore lint/performance/noAwaitInLoops: sequential by design.
    const connection: Connection<TNode> = await fetchPage(cursor);
    collected.push(...connection.nodes);

    if (!connection.pageInfo.hasNextPage) {
      return collected;
    }
    if (!connection.pageInfo.endCursor) {
      throw new Error("Linear reported another page but no cursor to fetch it");
    }
    cursor = connection.pageInfo.endCursor;
  }

  throw new Error(
    `Stopped after ${maxPages} pages; Linear reported more results`
  );
}
