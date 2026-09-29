/**
 * Refreshes the vendored Linear GraphQL schema from Linear's public SDK
 * repository. Run with `pnpm schema:update`, then `pnpm codegen` and
 * `pnpm test` to confirm every operation still validates.
 */
import { writeFile } from "node:fs/promises";

const schemaUrl =
  "https://raw.githubusercontent.com/linear/linear/master/packages/sdk/src/schema.graphql";
const destination = new URL(
  "../graphql/linear.schema.graphql",
  import.meta.url
);

const response = await fetch(schemaUrl);
if (!response.ok) {
  throw new Error(
    `Failed to download the Linear schema: HTTP ${response.status}`
  );
}

const schemaSource = await response.text();
if (
  !(
    schemaSource.includes("type Query") &&
    schemaSource.includes("type Mutation")
  )
) {
  throw new Error(
    "The downloaded file does not look like Linear's GraphQL schema"
  );
}

await writeFile(destination, schemaSource);
process.stdout.write(
  `Wrote ${schemaSource.length.toLocaleString("en-GB")} bytes to graphql/linear.schema.graphql\n`
);
