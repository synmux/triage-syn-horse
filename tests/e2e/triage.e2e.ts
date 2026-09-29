/**
 * Triage flows on an iPhone-sized WebKit against real Linear data, with
 * every mutation intercepted (see fixtures.ts). Each test asserts the
 * exact mutation the app would have sent.
 */
import { expect, type Page } from "@playwright/test";
import { apiKey, type LinearHarness, test } from "./fixtures";

// DISABLED. On 2026-09-29 this suite wrote to the live Linear workspace:
// in the production build the service worker claimed the page and
// Playwright's route interception stopped seeing requests, so "intercepted"
// mutations reached Linear. Do not re-enable until BOTH guards exist:
//   1. `serviceWorkers: "block"` in playwright.config.ts, and
//   2. an E2E-only build that sends mutations to an unresolvable
//      `.invalid` endpoint, so a missed interception cannot write anything.
// See AGENTS.md ("E2E safety").
test.skip(
  true,
  "Disabled until the E2E safety guards in AGENTS.md are in place."
);
test.skip(!apiKey, "Set LINEAR_API_KEY to run the E2E suite (read-only).");

const issueIdPattern = /\/issue\/([^/?#]+)/;
const tomorrowButton = /^Tomorrow/;
const markDuplicateButton = /^Mark as duplicate of/;
const labelsChip = /Labels|labels?$/;
const queueUrl = /\/$/;

async function openQueue(page: Page) {
  await page.goto("/");
  await expect(page.locator("a.issue-row").first()).toBeVisible({
    timeout: 30_000,
  });
}

/** Opens the queue's first issue and returns the harness's record of it. */
async function openFirstIssue(page: Page, linear: LinearHarness) {
  await openQueue(page);
  const href = await page.locator("a.issue-row").first().getAttribute("href");
  const issueId = issueIdPattern.exec(href ?? "")?.[1];
  const issue = issueId ? linear.issues.get(issueId) : undefined;
  if (!issue) {
    throw new Error("The harness did not see the first issue in the queue");
  }
  await page.locator("a.issue-row").first().click();
  await expect(page.locator(".ticket h1")).toBeVisible();
  await expect(page.locator(".strip")).toBeVisible();
  return issue;
}

const londonClock = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "2-digit",
  timeZone: "Europe/London",
  year: "numeric",
});

test("shows the real triage queue without horizontal scrolling", async ({
  page,
}) => {
  await openQueue(page);

  const rows = await page.locator("a.issue-row").count();
  expect(rows).toBeGreaterThan(0);
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );
  expect(overflow).toBe(0);

  const teamChip = page.locator(".filters .chip").nth(1);
  const count = Number(await teamChip.locator(".count").textContent());
  await teamChip.click();
  await expect(page.locator("a.issue-row")).toHaveCount(count);
});

test("accepts an issue with one tap and moves on to the next", async ({
  page,
  linear,
}) => {
  const issue = await openFirstIssue(page, linear);

  await page.locator('button[aria-keyshortcuts="1"]').click();

  await expect.poll(() => linear.mutations.length).toBe(1);
  expect(linear.mutations[0]).toEqual({
    operation: "UpdateIssue",
    variables: {
      id: issue.id,
      input: { stateId: linear.stateId(issue, "Backlog") },
    },
  });
  await expect(page).not.toHaveURL(new RegExp(issue.id));
  await expect(
    page.getByText(`Accepted ${issue.identifier} into Backlog`)
  ).toBeVisible();
});

test("undoes an accept from the toast, after checking nothing changed", async ({
  page,
  linear,
}) => {
  const issue = await openFirstIssue(page, linear);
  await page.locator('button[aria-keyshortcuts="1"]').click();
  await expect.poll(() => linear.mutations.length).toBe(1);

  await page.getByRole("button", { name: "Undo" }).click();

  await expect.poll(() => linear.mutations.length).toBe(2);
  expect(linear.mutations[1]).toEqual({
    operation: "UpdateIssue",
    variables: {
      id: issue.id,
      input: { stateId: linear.stateId(issue, "Triage") },
    },
  });
  await expect(
    page.getByText(`Undone: Accepted ${issue.identifier} into Backlog`)
  ).toBeVisible();
});

test("declines with a reason: comment first, then Canceled", async ({
  page,
  linear,
}) => {
  const issue = await openFirstIssue(page, linear);

  await page.locator(".segment.decline").click();
  await page.getByLabel("Reason (optional)").fill("Already covered elsewhere.");
  await page
    .getByRole("button", { name: `Decline ${issue.identifier}` })
    .click();

  await expect.poll(() => linear.mutations.length).toBe(2);
  expect(linear.mutations).toEqual([
    {
      operation: "CreateComment",
      variables: {
        input: { body: "Already covered elsewhere.", issueId: issue.id },
      },
    },
    {
      operation: "UpdateIssue",
      variables: {
        id: issue.id,
        input: { stateId: linear.stateId(issue, "Canceled") },
      },
    },
  ]);
});

test("snoozes until 09:00 tomorrow", async ({ page, linear }) => {
  const issue = await openFirstIssue(page, linear);

  await page.locator(".segment.snooze").click();
  await page.getByRole("button", { name: tomorrowButton }).click();

  await expect.poll(() => linear.mutations.length).toBe(1);
  const [mutation] = linear.mutations;
  expect(mutation?.operation).toBe("UpdateIssue");
  expect(mutation?.variables.id).toBe(issue.id);
  const input = mutation?.variables.input as {
    snoozedUntilAt: string;
    snoozedById: string;
  };
  expect(input.snoozedById).toEqual(expect.any(String));
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const expectedDate = londonClock.format(tomorrow).slice(0, 10);
  expect(londonClock.format(new Date(input.snoozedUntilAt))).toBe(
    `${expectedDate}, 09:00`
  );
});

test("marks an issue as a duplicate of a search result", async ({
  page,
  linear,
}) => {
  const issue = await openFirstIssue(page, linear);

  await page.locator(".segment.duplicate").click();
  await page.getByPlaceholder("Title or identifier").fill("the");
  const result = page.locator("button.result").first();
  await expect(result).toBeVisible({ timeout: 15_000 });
  const canonicalId = await result.getAttribute("data-issue-id");
  await result.click();
  await page.getByRole("button", { name: markDuplicateButton }).click();

  await expect.poll(() => linear.mutations.length).toBe(1);
  expect(canonicalId).not.toBe(issue.id);
  expect(linear.mutations[0]).toEqual({
    operation: "CreateIssueRelation",
    variables: {
      input: {
        issueId: issue.id,
        relatedIssueId: canonicalId,
        type: "duplicate",
      },
    },
  });
});

test("sets the priority from the property bar", async ({ page, linear }) => {
  const issue = await openFirstIssue(page, linear);

  await page.locator(".property-bar .chip").first().click();
  await page.locator('[data-option-id="2"]').click();

  await expect.poll(() => linear.mutations.length).toBe(1);
  expect(linear.mutations[0]).toEqual({
    operation: "UpdateIssue",
    variables: { id: issue.id, input: { priority: 2 } },
  });
  await expect(page.locator(".property-bar .chip").first()).toContainText(
    "High"
  );
});

test("adds a label as a delta rather than replacing the set", async ({
  page,
  linear,
}) => {
  const issue = await openFirstIssue(page, linear);
  const alreadyApplied = new Set(issue.labels.nodes.map((label) => label.id));

  await page.getByRole("button", { name: labelsChip }).first().click();
  const options = page.locator(".option[data-option-id]");
  const optionCount = await options.count();
  let chosen: string | null = null;
  for (let index = 0; index < optionCount && chosen === null; index += 1) {
    // biome-ignore lint/performance/noAwaitInLoops: finds the first unapplied label.
    const optionId = await options.nth(index).getAttribute("data-option-id");
    if (optionId && !alreadyApplied.has(optionId)) {
      chosen = optionId;
      await options.nth(index).click();
    }
  }

  expect(chosen).not.toBeNull();
  await expect.poll(() => linear.mutations.length).toBe(1);
  expect(linear.mutations[0]).toEqual({
    operation: "UpdateIssue",
    variables: {
      id: issue.id,
      input: { addedLabelIds: [chosen], removedLabelIds: [] },
    },
  });
});

test("swipes a row right to accept it", async ({ page, linear }) => {
  await openQueue(page);
  const row = page.locator("a.issue-row").first();
  const href = await row.getAttribute("href");
  const issue = linear.issues.get(issueIdPattern.exec(href ?? "")?.[1] ?? "");
  if (!issue) {
    throw new Error("Unknown first row");
  }
  const box = await row.boundingBox();
  if (!box) {
    throw new Error("The first row has no box");
  }
  const y = box.y + box.height / 2;

  await page.mouse.move(box.x + 60, y);
  await page.mouse.down();
  for (const step of [20, 60, 120, 200, 280]) {
    // biome-ignore lint/performance/noAwaitInLoops: a drag is a sequence of moves.
    await page.mouse.move(box.x + 60 + step, y + 2);
  }
  await page.mouse.up();

  await expect.poll(() => linear.mutations.length).toBe(1);
  expect(linear.mutations[0]).toEqual({
    operation: "UpdateIssue",
    variables: {
      id: issue.id,
      input: { stateId: linear.stateId(issue, "Backlog") },
    },
  });
  await expect(page).toHaveURL(queueUrl);
});

test("a short sideways drag snaps back and changes nothing", async ({
  page,
  linear,
}) => {
  await openQueue(page);
  const box = await page.locator("a.issue-row").first().boundingBox();
  if (!box) {
    throw new Error("The first row has no box");
  }
  const y = box.y + box.height / 2;

  await page.mouse.move(box.x + 60, y);
  await page.mouse.down();
  await page.mouse.move(box.x + 90, y);
  await page.mouse.move(box.x + 120, y);
  await page.mouse.up();

  await page.waitForTimeout(600);
  expect(linear.mutations).toEqual([]);
  await expect(page).toHaveURL(queueUrl);
});

test("opens a deep link to an issue directly", async ({ page, linear }) => {
  await openQueue(page);
  const [issue] = [...linear.issues.values()];
  if (!issue) {
    throw new Error("No issues seen");
  }

  await page.goto(`/issue/${issue.id}`);

  await expect(page.locator(".kicker .identifier")).toHaveText(
    issue.identifier
  );
  expect(linear.mutations).toEqual([]);
});
