import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildSchema,
  type DefinitionNode,
  Kind,
  type OperationDefinitionNode,
  OperationTypeNode,
  parse,
  validate,
} from "graphql";
import { describe, expect, it } from "vitest";
// biome-ignore lint/performance/noNamespaceImport: the test enumerates every generated document.
import * as generated from "~/lib/linear/generated/graphql";

// happy-dom rewrites import.meta.url, so resolve from the project root.
const schemaSource = readFileSync(
  resolve(process.cwd(), "graphql/linear.schema.graphql"),
  "utf8"
);
const schema = buildSchema(schemaSource);

const documents: [name: string, source: string][] = Object.entries(generated)
  .filter(
    ([name, value]) => name.endsWith("Document") && value instanceof String
  )
  .map(([name, value]) => [name, String(value)]);

const isOperation = (
  definition: DefinitionNode
): definition is OperationDefinitionNode =>
  definition.kind === Kind.OPERATION_DEFINITION;

const operationsOfType = (operationType: OperationTypeNode): string[] =>
  documents
    .flatMap(([, document]) => parse(document).definitions)
    .filter(isOperation)
    .filter((definition) => definition.operation === operationType)
    .map((definition) => definition.name?.value ?? "<anonymous>")
    .sort();

describe("Linear GraphQL operations", () => {
  it("generates a typed document for every operation", () => {
    expect(documents.map(([name]) => name).sort()).toEqual([
      "CreateCommentDocument",
      "CreateIssueRelationDocument",
      "DeleteCommentDocument",
      "DeleteIssueRelationDocument",
      "IssueDetailDocument",
      "IssueLabelsDocument",
      "IssueStateDocument",
      "ProjectsDocument",
      "SearchIssuesDocument",
      "TeamsDocument",
      "TriageQueueDocument",
      "UpdateIssueDocument",
      "UsersDocument",
      "ViewerDocument",
      "WorkflowStatesDocument",
    ]);
  });

  it.each(documents)(
    "%s validates against the vendored Linear schema",
    (_name, document) => {
      const errors = validate(schema, parse(document));
      expect(errors.map((error) => error.message)).toEqual([]);
    }
  );

  it("uses exactly the five mutations the app is designed around", () => {
    expect(operationsOfType(OperationTypeNode.MUTATION)).toEqual([
      "CreateComment",
      "CreateIssueRelation",
      "DeleteComment",
      "DeleteIssueRelation",
      "UpdateIssue",
    ]);
  });

  it("gives every query a name", () => {
    expect(operationsOfType(OperationTypeNode.QUERY)).not.toContain(
      "<anonymous>"
    );
  });
});
