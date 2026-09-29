/* eslint-disable */
import * as types from './graphql';



/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  fragment TriageIssueFields on Issue {\n    id\n    identifier\n    title\n    priority\n    estimate\n    dueDate\n    createdAt\n    updatedAt\n    snoozedUntilAt\n    snoozedBy {\n      id\n    }\n    url\n    team {\n      id\n    }\n    state {\n      id\n    }\n    assignee {\n      id\n    }\n    project {\n      id\n    }\n    labels(first: 50) {\n      nodes {\n        id\n      }\n    }\n    creator {\n      id\n      displayName\n      avatarUrl\n    }\n    botActor {\n      name\n      avatarUrl\n    }\n    externalUserCreator {\n      name\n      avatarUrl\n    }\n    integrationSourceType\n  }\n": typeof types.TriageIssueFieldsFragmentDoc,
    "\n  query Viewer {\n    viewer {\n      id\n      name\n      displayName\n      email\n      avatarUrl\n    }\n    organization {\n      name\n      urlKey\n    }\n  }\n": typeof types.ViewerDocument,
    "\n  query Teams($after: String) {\n    teams(first: 100, after: $after) {\n      nodes {\n        id\n        key\n        name\n        color\n        icon\n        triageEnabled\n        requirePriorityToLeaveTriage\n        issueEstimationType\n        issueEstimationExtended\n        issueEstimationAllowZero\n        triageIssueState {\n          id\n        }\n        defaultIssueState {\n          id\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": typeof types.TeamsDocument,
    "\n  query WorkflowStates($after: String) {\n    workflowStates(first: 250, after: $after) {\n      nodes {\n        id\n        name\n        type\n        color\n        position\n        team {\n          id\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": typeof types.WorkflowStatesDocument,
    "\n  query IssueLabels($after: String) {\n    issueLabels(first: 250, after: $after) {\n      nodes {\n        id\n        name\n        color\n        isGroup\n        parent {\n          id\n        }\n        team {\n          id\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": typeof types.IssueLabelsDocument,
    "\n  query Projects($after: String) {\n    projects(\n      first: 100\n      after: $after\n      filter: { status: { type: { nin: [\"completed\", \"canceled\"] } } }\n    ) {\n      nodes {\n        id\n        name\n        color\n        icon\n        teams(first: 50) {\n          nodes {\n            id\n          }\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": typeof types.ProjectsDocument,
    "\n  query Users($after: String) {\n    users(first: 250, after: $after) {\n      nodes {\n        id\n        name\n        displayName\n        avatarUrl\n        active\n        isMe\n        app\n        guest\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": typeof types.UsersDocument,
    "\n  query TriageQueue($after: String) {\n    issues(\n      first: 100\n      after: $after\n      orderBy: createdAt\n      filter: { state: { type: { eq: \"triage\" } } }\n    ) {\n      nodes {\n        ...TriageIssueFields\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": typeof types.TriageQueueDocument,
    "\n  query IssueDetail($id: String!) {\n    issue(id: $id) {\n      ...TriageIssueFields\n      description\n      parent {\n        id\n        identifier\n        title\n      }\n      attachments(first: 25) {\n        nodes {\n          id\n          title\n          subtitle\n          url\n          sourceType\n        }\n      }\n      comments(first: 100) {\n        nodes {\n          id\n          body\n          createdAt\n          parent {\n            id\n          }\n          user {\n            id\n            displayName\n            avatarUrl\n          }\n          botActor {\n            name\n            avatarUrl\n          }\n          externalUser {\n            name\n            avatarUrl\n          }\n        }\n      }\n      relations(first: 25) {\n        nodes {\n          id\n          type\n          relatedIssue {\n            id\n            identifier\n            title\n            state {\n              id\n              name\n              type\n              color\n            }\n          }\n        }\n      }\n      inverseRelations(first: 25) {\n        nodes {\n          id\n          type\n          issue {\n            id\n            identifier\n            title\n            state {\n              id\n              name\n              type\n              color\n            }\n          }\n        }\n      }\n    }\n  }\n": typeof types.IssueDetailDocument,
    "\n  query IssueState($id: String!) {\n    issue(id: $id) {\n      id\n      identifier\n      snoozedUntilAt\n      state {\n        id\n        name\n        type\n      }\n    }\n  }\n": typeof types.IssueStateDocument,
    "\n  query SearchIssues($term: String!) {\n    searchIssues(term: $term, first: 20) {\n      nodes {\n        id\n        identifier\n        title\n        team {\n          id\n          key\n        }\n        state {\n          id\n          name\n          type\n          color\n        }\n      }\n    }\n  }\n": typeof types.SearchIssuesDocument,
    "\n  mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {\n    issueUpdate(id: $id, input: $input) {\n      success\n      issue {\n        ...TriageIssueFields\n      }\n    }\n  }\n": typeof types.UpdateIssueDocument,
    "\n  mutation CreateComment($input: CommentCreateInput!) {\n    commentCreate(input: $input) {\n      success\n      comment {\n        id\n      }\n    }\n  }\n": typeof types.CreateCommentDocument,
    "\n  mutation DeleteComment($id: String!) {\n    commentDelete(id: $id) {\n      success\n    }\n  }\n": typeof types.DeleteCommentDocument,
    "\n  mutation CreateIssueRelation($input: IssueRelationCreateInput!) {\n    issueRelationCreate(input: $input) {\n      success\n      issueRelation {\n        id\n        issue {\n          id\n          state {\n            id\n            name\n            type\n          }\n        }\n      }\n    }\n  }\n": typeof types.CreateIssueRelationDocument,
    "\n  mutation DeleteIssueRelation($id: String!) {\n    issueRelationDelete(id: $id) {\n      success\n    }\n  }\n": typeof types.DeleteIssueRelationDocument,
};
const documents: Documents = {
    "\n  fragment TriageIssueFields on Issue {\n    id\n    identifier\n    title\n    priority\n    estimate\n    dueDate\n    createdAt\n    updatedAt\n    snoozedUntilAt\n    snoozedBy {\n      id\n    }\n    url\n    team {\n      id\n    }\n    state {\n      id\n    }\n    assignee {\n      id\n    }\n    project {\n      id\n    }\n    labels(first: 50) {\n      nodes {\n        id\n      }\n    }\n    creator {\n      id\n      displayName\n      avatarUrl\n    }\n    botActor {\n      name\n      avatarUrl\n    }\n    externalUserCreator {\n      name\n      avatarUrl\n    }\n    integrationSourceType\n  }\n": types.TriageIssueFieldsFragmentDoc,
    "\n  query Viewer {\n    viewer {\n      id\n      name\n      displayName\n      email\n      avatarUrl\n    }\n    organization {\n      name\n      urlKey\n    }\n  }\n": types.ViewerDocument,
    "\n  query Teams($after: String) {\n    teams(first: 100, after: $after) {\n      nodes {\n        id\n        key\n        name\n        color\n        icon\n        triageEnabled\n        requirePriorityToLeaveTriage\n        issueEstimationType\n        issueEstimationExtended\n        issueEstimationAllowZero\n        triageIssueState {\n          id\n        }\n        defaultIssueState {\n          id\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": types.TeamsDocument,
    "\n  query WorkflowStates($after: String) {\n    workflowStates(first: 250, after: $after) {\n      nodes {\n        id\n        name\n        type\n        color\n        position\n        team {\n          id\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": types.WorkflowStatesDocument,
    "\n  query IssueLabels($after: String) {\n    issueLabels(first: 250, after: $after) {\n      nodes {\n        id\n        name\n        color\n        isGroup\n        parent {\n          id\n        }\n        team {\n          id\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": types.IssueLabelsDocument,
    "\n  query Projects($after: String) {\n    projects(\n      first: 100\n      after: $after\n      filter: { status: { type: { nin: [\"completed\", \"canceled\"] } } }\n    ) {\n      nodes {\n        id\n        name\n        color\n        icon\n        teams(first: 50) {\n          nodes {\n            id\n          }\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": types.ProjectsDocument,
    "\n  query Users($after: String) {\n    users(first: 250, after: $after) {\n      nodes {\n        id\n        name\n        displayName\n        avatarUrl\n        active\n        isMe\n        app\n        guest\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": types.UsersDocument,
    "\n  query TriageQueue($after: String) {\n    issues(\n      first: 100\n      after: $after\n      orderBy: createdAt\n      filter: { state: { type: { eq: \"triage\" } } }\n    ) {\n      nodes {\n        ...TriageIssueFields\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": types.TriageQueueDocument,
    "\n  query IssueDetail($id: String!) {\n    issue(id: $id) {\n      ...TriageIssueFields\n      description\n      parent {\n        id\n        identifier\n        title\n      }\n      attachments(first: 25) {\n        nodes {\n          id\n          title\n          subtitle\n          url\n          sourceType\n        }\n      }\n      comments(first: 100) {\n        nodes {\n          id\n          body\n          createdAt\n          parent {\n            id\n          }\n          user {\n            id\n            displayName\n            avatarUrl\n          }\n          botActor {\n            name\n            avatarUrl\n          }\n          externalUser {\n            name\n            avatarUrl\n          }\n        }\n      }\n      relations(first: 25) {\n        nodes {\n          id\n          type\n          relatedIssue {\n            id\n            identifier\n            title\n            state {\n              id\n              name\n              type\n              color\n            }\n          }\n        }\n      }\n      inverseRelations(first: 25) {\n        nodes {\n          id\n          type\n          issue {\n            id\n            identifier\n            title\n            state {\n              id\n              name\n              type\n              color\n            }\n          }\n        }\n      }\n    }\n  }\n": types.IssueDetailDocument,
    "\n  query IssueState($id: String!) {\n    issue(id: $id) {\n      id\n      identifier\n      snoozedUntilAt\n      state {\n        id\n        name\n        type\n      }\n    }\n  }\n": types.IssueStateDocument,
    "\n  query SearchIssues($term: String!) {\n    searchIssues(term: $term, first: 20) {\n      nodes {\n        id\n        identifier\n        title\n        team {\n          id\n          key\n        }\n        state {\n          id\n          name\n          type\n          color\n        }\n      }\n    }\n  }\n": types.SearchIssuesDocument,
    "\n  mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {\n    issueUpdate(id: $id, input: $input) {\n      success\n      issue {\n        ...TriageIssueFields\n      }\n    }\n  }\n": types.UpdateIssueDocument,
    "\n  mutation CreateComment($input: CommentCreateInput!) {\n    commentCreate(input: $input) {\n      success\n      comment {\n        id\n      }\n    }\n  }\n": types.CreateCommentDocument,
    "\n  mutation DeleteComment($id: String!) {\n    commentDelete(id: $id) {\n      success\n    }\n  }\n": types.DeleteCommentDocument,
    "\n  mutation CreateIssueRelation($input: IssueRelationCreateInput!) {\n    issueRelationCreate(input: $input) {\n      success\n      issueRelation {\n        id\n        issue {\n          id\n          state {\n            id\n            name\n            type\n          }\n        }\n      }\n    }\n  }\n": types.CreateIssueRelationDocument,
    "\n  mutation DeleteIssueRelation($id: String!) {\n    issueRelationDelete(id: $id) {\n      success\n    }\n  }\n": types.DeleteIssueRelationDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment TriageIssueFields on Issue {\n    id\n    identifier\n    title\n    priority\n    estimate\n    dueDate\n    createdAt\n    updatedAt\n    snoozedUntilAt\n    snoozedBy {\n      id\n    }\n    url\n    team {\n      id\n    }\n    state {\n      id\n    }\n    assignee {\n      id\n    }\n    project {\n      id\n    }\n    labels(first: 50) {\n      nodes {\n        id\n      }\n    }\n    creator {\n      id\n      displayName\n      avatarUrl\n    }\n    botActor {\n      name\n      avatarUrl\n    }\n    externalUserCreator {\n      name\n      avatarUrl\n    }\n    integrationSourceType\n  }\n"): typeof import('./graphql').TriageIssueFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Viewer {\n    viewer {\n      id\n      name\n      displayName\n      email\n      avatarUrl\n    }\n    organization {\n      name\n      urlKey\n    }\n  }\n"): typeof import('./graphql').ViewerDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Teams($after: String) {\n    teams(first: 100, after: $after) {\n      nodes {\n        id\n        key\n        name\n        color\n        icon\n        triageEnabled\n        requirePriorityToLeaveTriage\n        issueEstimationType\n        issueEstimationExtended\n        issueEstimationAllowZero\n        triageIssueState {\n          id\n        }\n        defaultIssueState {\n          id\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n"): typeof import('./graphql').TeamsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query WorkflowStates($after: String) {\n    workflowStates(first: 250, after: $after) {\n      nodes {\n        id\n        name\n        type\n        color\n        position\n        team {\n          id\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n"): typeof import('./graphql').WorkflowStatesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query IssueLabels($after: String) {\n    issueLabels(first: 250, after: $after) {\n      nodes {\n        id\n        name\n        color\n        isGroup\n        parent {\n          id\n        }\n        team {\n          id\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n"): typeof import('./graphql').IssueLabelsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Projects($after: String) {\n    projects(\n      first: 100\n      after: $after\n      filter: { status: { type: { nin: [\"completed\", \"canceled\"] } } }\n    ) {\n      nodes {\n        id\n        name\n        color\n        icon\n        teams(first: 50) {\n          nodes {\n            id\n          }\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n"): typeof import('./graphql').ProjectsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Users($after: String) {\n    users(first: 250, after: $after) {\n      nodes {\n        id\n        name\n        displayName\n        avatarUrl\n        active\n        isMe\n        app\n        guest\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n"): typeof import('./graphql').UsersDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query TriageQueue($after: String) {\n    issues(\n      first: 100\n      after: $after\n      orderBy: createdAt\n      filter: { state: { type: { eq: \"triage\" } } }\n    ) {\n      nodes {\n        ...TriageIssueFields\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n"): typeof import('./graphql').TriageQueueDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query IssueDetail($id: String!) {\n    issue(id: $id) {\n      ...TriageIssueFields\n      description\n      parent {\n        id\n        identifier\n        title\n      }\n      attachments(first: 25) {\n        nodes {\n          id\n          title\n          subtitle\n          url\n          sourceType\n        }\n      }\n      comments(first: 100) {\n        nodes {\n          id\n          body\n          createdAt\n          parent {\n            id\n          }\n          user {\n            id\n            displayName\n            avatarUrl\n          }\n          botActor {\n            name\n            avatarUrl\n          }\n          externalUser {\n            name\n            avatarUrl\n          }\n        }\n      }\n      relations(first: 25) {\n        nodes {\n          id\n          type\n          relatedIssue {\n            id\n            identifier\n            title\n            state {\n              id\n              name\n              type\n              color\n            }\n          }\n        }\n      }\n      inverseRelations(first: 25) {\n        nodes {\n          id\n          type\n          issue {\n            id\n            identifier\n            title\n            state {\n              id\n              name\n              type\n              color\n            }\n          }\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').IssueDetailDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query IssueState($id: String!) {\n    issue(id: $id) {\n      id\n      identifier\n      snoozedUntilAt\n      state {\n        id\n        name\n        type\n      }\n    }\n  }\n"): typeof import('./graphql').IssueStateDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SearchIssues($term: String!) {\n    searchIssues(term: $term, first: 20) {\n      nodes {\n        id\n        identifier\n        title\n        team {\n          id\n          key\n        }\n        state {\n          id\n          name\n          type\n          color\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').SearchIssuesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {\n    issueUpdate(id: $id, input: $input) {\n      success\n      issue {\n        ...TriageIssueFields\n      }\n    }\n  }\n"): typeof import('./graphql').UpdateIssueDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateComment($input: CommentCreateInput!) {\n    commentCreate(input: $input) {\n      success\n      comment {\n        id\n      }\n    }\n  }\n"): typeof import('./graphql').CreateCommentDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteComment($id: String!) {\n    commentDelete(id: $id) {\n      success\n    }\n  }\n"): typeof import('./graphql').DeleteCommentDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateIssueRelation($input: IssueRelationCreateInput!) {\n    issueRelationCreate(input: $input) {\n      success\n      issueRelation {\n        id\n        issue {\n          id\n          state {\n            id\n            name\n            type\n          }\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').CreateIssueRelationDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteIssueRelation($id: String!) {\n    issueRelationDelete(id: $id) {\n      success\n    }\n  }\n"): typeof import('./graphql').DeleteIssueRelationDocument;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
