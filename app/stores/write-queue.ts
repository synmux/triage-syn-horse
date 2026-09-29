/**
 * The single per-issue write queue shared by every store that mutates
 * issues, so an undo can never overtake its action and edits to one issue
 * always land in the order they were made.
 */
import { createSerialQueue } from "~/lib/serial-queue";

export const issueWriteQueue = createSerialQueue();
