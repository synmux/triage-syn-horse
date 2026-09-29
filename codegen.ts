import type { CodegenConfig } from "@graphql-codegen/cli";

/**
 * Generates typed documents for every operation in app/lib/linear/operations.ts
 * from the vendored Linear schema. Documents are emitted as plain strings
 * (TypedDocumentString), so no GraphQL runtime ships to the browser.
 */
const config: CodegenConfig = {
  documents: ["app/lib/linear/operations.ts"],
  generates: {
    "app/lib/linear/generated/": {
      config: {
        avoidOptionals: false,
        documentMode: "string",
        enumsAsTypes: true,
        scalars: {
          DateTime: "string",
          JSON: "unknown",
          JSONObject: "Record<string, unknown>",
          TimelessDate: "string",
        },
        skipTypename: true,
        useTypeImports: true,
      },
      preset: "client",
      presetConfig: {
        fragmentMasking: false,
      },
    },
  },
  ignoreNoDocuments: false,
  schema: "graphql/linear.schema.graphql",
};

export default config;
