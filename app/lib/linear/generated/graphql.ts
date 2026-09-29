/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
/** Input for creating a new comment. */
export type CommentCreateInput = {
  /** The comment content in markdown format. */
  body?: string | null | undefined;
  /** [Internal] The comment content as a Prosemirror document. */
  bodyData?: unknown;
  /** Create comment as a user with the provided name. This option is only available to OAuth applications creating comments in `actor=app` mode. */
  createAsUser?: string | null | undefined;
  /** Flag to indicate this comment should be created on the issue's synced Slack comment thread. If no synced Slack comment thread exists, the mutation will fail. If there are multiple synced Slack threads on the issue, the oldest one will be targeted. */
  createOnSyncedSlackThread?: boolean | null | undefined;
  /** The time at which the comment was created (e.g. if importing from another system). Must be a time in the past. If none is provided, the backend will generate the time as now. */
  createdAt?: string | null | undefined;
  /** Provide an external user avatar URL. Can only be used in conjunction with the `createAsUser` options. This option is only available to OAuth applications creating comments in `actor=app` mode. */
  displayIconUrl?: string | null | undefined;
  /** Flag to prevent auto subscription to the issue the comment is created on. */
  doNotSubscribeToIssue?: boolean | null | undefined;
  /** The document content to associate the comment with. */
  documentContentId?: string | null | undefined;
  /** The identifier in UUID v4 format. If none is provided, the backend will generate one. */
  id?: string | null | undefined;
  /** The initiative to associate the comment with. Can be a UUID or initiative identifier (e.g., 'I-12'). */
  initiativeId?: string | null | undefined;
  /** The initiative update to associate the comment with. */
  initiativeUpdateId?: string | null | undefined;
  /** The issue to associate the comment with. Can be a UUID or issue identifier (e.g., 'LIN-123'). */
  issueId?: string | null | undefined;
  /** The parent comment under which to nest a current comment. */
  parentId?: string | null | undefined;
  /** The post to associate the comment with. */
  postId?: string | null | undefined;
  /** The project to associate the comment with. Can be a UUID or project identifier (e.g., 'P-LIN-123'). */
  projectId?: string | null | undefined;
  /** The project update to associate the comment with. */
  projectUpdateId?: string | null | undefined;
  /** The text that this comment references. Only defined for inline comments. */
  quotedText?: string | null | undefined;
  /** [INTERNAL] The identifiers of the users subscribing to this comment thread. */
  subscriberIds?: Array<string> | null | undefined;
};

/** Linear supported integration services. */
export type IntegrationService =
  | 'airbyte'
  | 'asksWeb'
  | 'datadog'
  | 'discord'
  | 'email'
  | 'figma'
  | 'figmaPlugin'
  | 'front'
  | 'github'
  | 'githubCodeAccessPersonal'
  | 'githubCommit'
  | 'githubEnterpriseServer'
  | 'githubImport'
  | 'githubPersonal'
  | 'gitlab'
  | 'gong'
  | 'googleCalendarPersonal'
  | 'googleSheets'
  | 'intercom'
  | 'jira'
  | 'jiraPersonal'
  | 'launchDarkly'
  | 'launchDarklyPersonal'
  | 'loom'
  | 'mcpServer'
  | 'mcpServerPersonal'
  | 'microsoftPersonal'
  | 'microsoftTeams'
  | 'microsoftTeamsProjectPost'
  | 'notion'
  | 'opsgenie'
  | 'origin'
  | 'pagerDuty'
  | 'salesforce'
  | 'sentry'
  | 'slack'
  | 'slackAsks'
  | 'slackCustomViewNotifications'
  | 'slackInitiativePost'
  | 'slackOrgInitiativeUpdatesPost'
  | 'slackOrgProjectUpdatesPost'
  | 'slackPersonal'
  | 'slackPost'
  | 'slackProjectPost'
  | 'slackProjectUpdatesPost'
  | 'zendesk';

/** Input for creating a new issue relation between two issues. Both the source issue and related issue must be specified along with the relationship type. */
export type IssueRelationCreateInput = {
  /** The identifier in UUID v4 format. If none is provided, the backend will generate one. */
  id?: string | null | undefined;
  /** The identifier of the issue that is related to another issue. Can be a UUID or issue identifier (e.g., 'LIN-123'). */
  issueId: string;
  /** The identifier of the related issue. Can be a UUID or issue identifier (e.g., 'LIN-123'). */
  relatedIssueId: string;
  /** The type of relation of the issue to the related issue. */
  type: IssueRelationType;
};

/** The type of the issue relation. */
export type IssueRelationType =
  | 'blocks'
  | 'duplicate'
  | 'related'
  | 'similar';

/** Input for updating an existing issue. All fields are optional; only provided fields will be updated. Setting a field to null (where supported) will clear the value. */
export type IssueUpdateInput = {
  /** The identifiers of the issue labels to be added to this issue. */
  addedLabelIds?: Array<string> | null | undefined;
  /** The identifiers of the releases to be added to this issue. */
  addedReleaseIds?: Array<string> | null | undefined;
  /** The identifier of the user to assign the issue to. */
  assigneeId?: string | null | undefined;
  /** Whether the issue was automatically closed because its parent issue was closed. */
  autoClosedByParentClosing?: boolean | null | undefined;
  /** The cycle associated with the issue. */
  cycleId?: string | null | undefined;
  /** The identifier of the agent user to delegate the issue to. */
  delegateId?: string | null | undefined;
  /** The issue description in markdown format. */
  description?: string | null | undefined;
  /** [Internal] The issue description as a Prosemirror document. */
  descriptionData?: unknown;
  /** The date at which the issue is due. */
  dueDate?: string | null | undefined;
  /** The estimated complexity of the issue. */
  estimate?: number | null | undefined;
  /** Whether this issue should inherit shared access from its parent issue. */
  inheritsSharedAccess?: boolean | null | undefined;
  /** The identifiers of the issue labels associated with this ticket. */
  labelIds?: Array<string> | null | undefined;
  /** The ID of the last template applied to the issue. */
  lastAppliedTemplateId?: string | null | undefined;
  /** The identifier of the parent issue. Can be a UUID or issue identifier (e.g., 'LIN-123'). */
  parentId?: string | null | undefined;
  /** The priority of the issue. 0 = No priority, 1 = Urgent, 2 = High, 3 = Medium, 4 = Low. */
  priority?: number | null | undefined;
  /** The position of the issue related to other issues, when ordered by priority. */
  prioritySortOrder?: number | null | undefined;
  /** The project associated with the issue. Can be a UUID or project identifier (e.g., 'P-LIN-123'). */
  projectId?: string | null | undefined;
  /** The project milestone associated with the issue. */
  projectMilestoneId?: string | null | undefined;
  /** The identifiers of the releases associated with this issue. */
  releaseIds?: Array<string> | null | undefined;
  /** The identifiers of the issue labels to be removed from this issue. */
  removedLabelIds?: Array<string> | null | undefined;
  /** The identifiers of the releases to be removed from this issue. */
  removedReleaseIds?: Array<string> | null | undefined;
  /** [Internal] The time at which an issue will be considered in breach of SLA. */
  slaBreachesAt?: string | null | undefined;
  /** [Internal] The time at which the issue's SLA was started. */
  slaStartedAt?: string | null | undefined;
  /** The SLA day count type for the issue. Whether SLA should be business days only or calendar days (default). */
  slaType?: SlaDayCountType | null | undefined;
  /** The identifier of the user who snoozed the issue. */
  snoozedById?: string | null | undefined;
  /** The time until which the issue will be snoozed in Triage view. */
  snoozedUntilAt?: string | null | undefined;
  /** The position of the issue related to other issues. */
  sortOrder?: number | null | undefined;
  /** The team state of the issue. */
  stateId?: string | null | undefined;
  /** The position of the issue in parent's sub-issue list. */
  subIssueSortOrder?: number | null | undefined;
  /** The identifiers of the users subscribing to this ticket. */
  subscriberIds?: Array<string> | null | undefined;
  /** The identifier of the team associated with the issue. */
  teamId?: string | null | undefined;
  /** The issue title. */
  title?: string | null | undefined;
  /** Whether the issue has been trashed. Set to true to trash, or null to restore. */
  trashed?: boolean | null | undefined;
  /** [Internal] Whether this issue has been explicitly marked as trusted. */
  trusted?: boolean | null | undefined;
};

/** Which day count to use for SLA calculations. */
export type SlaDayCountType =
  | 'all'
  | 'onlyBusinessDays';

export type TriageIssueFieldsFragment = { id: string, identifier: string, title: string, priority: number, estimate: number | null, createdAt: string, updatedAt: string, snoozedUntilAt: string | null, url: string, integrationSourceType: IntegrationService | null, snoozedBy: { id: string } | null, team: { id: string }, state: { id: string }, assignee: { id: string } | null, project: { id: string } | null, labels: { nodes: Array<{ id: string }> }, creator: { id: string, displayName: string, avatarUrl: string | null } | null, botActor: { name: string | null, avatarUrl: string | null } | null, externalUserCreator: { name: string, avatarUrl: string | null } | null };

export type ViewerQueryVariables = Exact<{ [key: string]: never; }>;


export type ViewerQuery = { viewer: { id: string, name: string, displayName: string, email: string, avatarUrl: string | null }, organization: { name: string, urlKey: string } };

export type TeamsQueryVariables = Exact<{
  after?: string | null | undefined;
}>;


export type TeamsQuery = { teams: { nodes: Array<{ id: string, key: string, name: string, color: string | null, icon: string | null, triageEnabled: boolean, requirePriorityToLeaveTriage: boolean, issueEstimationType: string, issueEstimationExtended: boolean, issueEstimationAllowZero: boolean, triageIssueState: { id: string } | null, defaultIssueState: { id: string } | null }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } } };

export type WorkflowStatesQueryVariables = Exact<{
  after?: string | null | undefined;
}>;


export type WorkflowStatesQuery = { workflowStates: { nodes: Array<{ id: string, name: string, type: string, color: string, position: number, team: { id: string } }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } } };

export type IssueLabelsQueryVariables = Exact<{
  after?: string | null | undefined;
}>;


export type IssueLabelsQuery = { issueLabels: { nodes: Array<{ id: string, name: string, color: string, isGroup: boolean, parent: { id: string } | null, team: { id: string } | null }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } } };

export type ProjectsQueryVariables = Exact<{
  after?: string | null | undefined;
}>;


export type ProjectsQuery = { projects: { nodes: Array<{ id: string, name: string, color: string, icon: string | null, teams: { nodes: Array<{ id: string }> } }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } } };

export type UsersQueryVariables = Exact<{
  after?: string | null | undefined;
}>;


export type UsersQuery = { users: { nodes: Array<{ id: string, name: string, displayName: string, avatarUrl: string | null, active: boolean, isMe: boolean, app: boolean, guest: boolean }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } } };

export type TriageQueueQueryVariables = Exact<{
  after?: string | null | undefined;
}>;


export type TriageQueueQuery = { issues: { nodes: Array<{ id: string, identifier: string, title: string, priority: number, estimate: number | null, createdAt: string, updatedAt: string, snoozedUntilAt: string | null, url: string, integrationSourceType: IntegrationService | null, snoozedBy: { id: string } | null, team: { id: string }, state: { id: string }, assignee: { id: string } | null, project: { id: string } | null, labels: { nodes: Array<{ id: string }> }, creator: { id: string, displayName: string, avatarUrl: string | null } | null, botActor: { name: string | null, avatarUrl: string | null } | null, externalUserCreator: { name: string, avatarUrl: string | null } | null }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } } };

export type IssueDetailQueryVariables = Exact<{
  id: string;
}>;


export type IssueDetailQuery = { issue: { description: string | null, id: string, identifier: string, title: string, priority: number, estimate: number | null, createdAt: string, updatedAt: string, snoozedUntilAt: string | null, url: string, integrationSourceType: IntegrationService | null, parent: { id: string, identifier: string, title: string } | null, attachments: { nodes: Array<{ id: string, title: string, subtitle: string | null, url: string, sourceType: string | null }> }, comments: { nodes: Array<{ id: string, body: string, createdAt: string, parent: { id: string } | null, user: { id: string, displayName: string, avatarUrl: string | null } | null, botActor: { name: string | null, avatarUrl: string | null } | null, externalUser: { name: string, avatarUrl: string | null } | null }> }, relations: { nodes: Array<{ id: string, type: string, relatedIssue: { id: string, identifier: string, title: string, state: { id: string, name: string, type: string, color: string } } }> }, inverseRelations: { nodes: Array<{ id: string, type: string, issue: { id: string, identifier: string, title: string, state: { id: string, name: string, type: string, color: string } } }> }, snoozedBy: { id: string } | null, team: { id: string }, state: { id: string }, assignee: { id: string } | null, project: { id: string } | null, labels: { nodes: Array<{ id: string }> }, creator: { id: string, displayName: string, avatarUrl: string | null } | null, botActor: { name: string | null, avatarUrl: string | null } | null, externalUserCreator: { name: string, avatarUrl: string | null } | null } };

export type IssueStateQueryVariables = Exact<{
  id: string;
}>;


export type IssueStateQuery = { issue: { id: string, identifier: string, snoozedUntilAt: string | null, state: { id: string, name: string, type: string } } };

export type SearchIssuesQueryVariables = Exact<{
  term: string;
}>;


export type SearchIssuesQuery = { searchIssues: { nodes: Array<{ id: string, identifier: string, title: string, team: { id: string, key: string }, state: { id: string, name: string, type: string, color: string } }> } };

export type UpdateIssueMutationVariables = Exact<{
  id: string;
  input: IssueUpdateInput;
}>;


export type UpdateIssueMutation = { issueUpdate: { success: boolean, issue: { id: string, identifier: string, title: string, priority: number, estimate: number | null, createdAt: string, updatedAt: string, snoozedUntilAt: string | null, url: string, integrationSourceType: IntegrationService | null, snoozedBy: { id: string } | null, team: { id: string }, state: { id: string }, assignee: { id: string } | null, project: { id: string } | null, labels: { nodes: Array<{ id: string }> }, creator: { id: string, displayName: string, avatarUrl: string | null } | null, botActor: { name: string | null, avatarUrl: string | null } | null, externalUserCreator: { name: string, avatarUrl: string | null } | null } | null } };

export type CreateCommentMutationVariables = Exact<{
  input: CommentCreateInput;
}>;


export type CreateCommentMutation = { commentCreate: { success: boolean, comment: { id: string } } };

export type DeleteCommentMutationVariables = Exact<{
  id: string;
}>;


export type DeleteCommentMutation = { commentDelete: { success: boolean } };

export type CreateIssueRelationMutationVariables = Exact<{
  input: IssueRelationCreateInput;
}>;


export type CreateIssueRelationMutation = { issueRelationCreate: { success: boolean, issueRelation: { id: string, issue: { id: string, state: { id: string, name: string, type: string } } } } };

export type DeleteIssueRelationMutationVariables = Exact<{
  id: string;
}>;


export type DeleteIssueRelationMutation = { issueRelationDelete: { success: boolean } };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}
export const TriageIssueFieldsFragmentDoc = new TypedDocumentString(`
    fragment TriageIssueFields on Issue {
  id
  identifier
  title
  priority
  estimate
  createdAt
  updatedAt
  snoozedUntilAt
  snoozedBy {
    id
  }
  url
  team {
    id
  }
  state {
    id
  }
  assignee {
    id
  }
  project {
    id
  }
  labels(first: 50) {
    nodes {
      id
    }
  }
  creator {
    id
    displayName
    avatarUrl
  }
  botActor {
    name
    avatarUrl
  }
  externalUserCreator {
    name
    avatarUrl
  }
  integrationSourceType
}
    `, {"fragmentName":"TriageIssueFields"}) as unknown as TypedDocumentString<TriageIssueFieldsFragment, unknown>;
export const ViewerDocument = new TypedDocumentString(`
    query Viewer {
  viewer {
    id
    name
    displayName
    email
    avatarUrl
  }
  organization {
    name
    urlKey
  }
}
    `) as unknown as TypedDocumentString<ViewerQuery, ViewerQueryVariables>;
export const TeamsDocument = new TypedDocumentString(`
    query Teams($after: String) {
  teams(first: 100, after: $after) {
    nodes {
      id
      key
      name
      color
      icon
      triageEnabled
      requirePriorityToLeaveTriage
      issueEstimationType
      issueEstimationExtended
      issueEstimationAllowZero
      triageIssueState {
        id
      }
      defaultIssueState {
        id
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
    `) as unknown as TypedDocumentString<TeamsQuery, TeamsQueryVariables>;
export const WorkflowStatesDocument = new TypedDocumentString(`
    query WorkflowStates($after: String) {
  workflowStates(first: 250, after: $after) {
    nodes {
      id
      name
      type
      color
      position
      team {
        id
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
    `) as unknown as TypedDocumentString<WorkflowStatesQuery, WorkflowStatesQueryVariables>;
export const IssueLabelsDocument = new TypedDocumentString(`
    query IssueLabels($after: String) {
  issueLabels(first: 250, after: $after) {
    nodes {
      id
      name
      color
      isGroup
      parent {
        id
      }
      team {
        id
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
    `) as unknown as TypedDocumentString<IssueLabelsQuery, IssueLabelsQueryVariables>;
export const ProjectsDocument = new TypedDocumentString(`
    query Projects($after: String) {
  projects(
    first: 100
    after: $after
    filter: { status: { type: { nin: ["completed", "canceled"] } } }
  ) {
    nodes {
      id
      name
      color
      icon
      teams(first: 50) {
        nodes {
          id
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
    `) as unknown as TypedDocumentString<ProjectsQuery, ProjectsQueryVariables>;
export const UsersDocument = new TypedDocumentString(`
    query Users($after: String) {
  users(first: 250, after: $after) {
    nodes {
      id
      name
      displayName
      avatarUrl
      active
      isMe
      app
      guest
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
    `) as unknown as TypedDocumentString<UsersQuery, UsersQueryVariables>;
export const TriageQueueDocument = new TypedDocumentString(`
    query TriageQueue($after: String) {
  issues(
    first: 100
    after: $after
    orderBy: createdAt
    filter: { state: { type: { eq: "triage" } } }
  ) {
    nodes {
      ...TriageIssueFields
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
    fragment TriageIssueFields on Issue {
  id
  identifier
  title
  priority
  estimate
  createdAt
  updatedAt
  snoozedUntilAt
  snoozedBy {
    id
  }
  url
  team {
    id
  }
  state {
    id
  }
  assignee {
    id
  }
  project {
    id
  }
  labels(first: 50) {
    nodes {
      id
    }
  }
  creator {
    id
    displayName
    avatarUrl
  }
  botActor {
    name
    avatarUrl
  }
  externalUserCreator {
    name
    avatarUrl
  }
  integrationSourceType
}`) as unknown as TypedDocumentString<TriageQueueQuery, TriageQueueQueryVariables>;
export const IssueDetailDocument = new TypedDocumentString(`
    query IssueDetail($id: String!) {
  issue(id: $id) {
    ...TriageIssueFields
    description
    parent {
      id
      identifier
      title
    }
    attachments(first: 25) {
      nodes {
        id
        title
        subtitle
        url
        sourceType
      }
    }
    comments(first: 100) {
      nodes {
        id
        body
        createdAt
        parent {
          id
        }
        user {
          id
          displayName
          avatarUrl
        }
        botActor {
          name
          avatarUrl
        }
        externalUser {
          name
          avatarUrl
        }
      }
    }
    relations(first: 25) {
      nodes {
        id
        type
        relatedIssue {
          id
          identifier
          title
          state {
            id
            name
            type
            color
          }
        }
      }
    }
    inverseRelations(first: 25) {
      nodes {
        id
        type
        issue {
          id
          identifier
          title
          state {
            id
            name
            type
            color
          }
        }
      }
    }
  }
}
    fragment TriageIssueFields on Issue {
  id
  identifier
  title
  priority
  estimate
  createdAt
  updatedAt
  snoozedUntilAt
  snoozedBy {
    id
  }
  url
  team {
    id
  }
  state {
    id
  }
  assignee {
    id
  }
  project {
    id
  }
  labels(first: 50) {
    nodes {
      id
    }
  }
  creator {
    id
    displayName
    avatarUrl
  }
  botActor {
    name
    avatarUrl
  }
  externalUserCreator {
    name
    avatarUrl
  }
  integrationSourceType
}`) as unknown as TypedDocumentString<IssueDetailQuery, IssueDetailQueryVariables>;
export const IssueStateDocument = new TypedDocumentString(`
    query IssueState($id: String!) {
  issue(id: $id) {
    id
    identifier
    snoozedUntilAt
    state {
      id
      name
      type
    }
  }
}
    `) as unknown as TypedDocumentString<IssueStateQuery, IssueStateQueryVariables>;
export const SearchIssuesDocument = new TypedDocumentString(`
    query SearchIssues($term: String!) {
  searchIssues(term: $term, first: 20) {
    nodes {
      id
      identifier
      title
      team {
        id
        key
      }
      state {
        id
        name
        type
        color
      }
    }
  }
}
    `) as unknown as TypedDocumentString<SearchIssuesQuery, SearchIssuesQueryVariables>;
export const UpdateIssueDocument = new TypedDocumentString(`
    mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
  issueUpdate(id: $id, input: $input) {
    success
    issue {
      ...TriageIssueFields
    }
  }
}
    fragment TriageIssueFields on Issue {
  id
  identifier
  title
  priority
  estimate
  createdAt
  updatedAt
  snoozedUntilAt
  snoozedBy {
    id
  }
  url
  team {
    id
  }
  state {
    id
  }
  assignee {
    id
  }
  project {
    id
  }
  labels(first: 50) {
    nodes {
      id
    }
  }
  creator {
    id
    displayName
    avatarUrl
  }
  botActor {
    name
    avatarUrl
  }
  externalUserCreator {
    name
    avatarUrl
  }
  integrationSourceType
}`) as unknown as TypedDocumentString<UpdateIssueMutation, UpdateIssueMutationVariables>;
export const CreateCommentDocument = new TypedDocumentString(`
    mutation CreateComment($input: CommentCreateInput!) {
  commentCreate(input: $input) {
    success
    comment {
      id
    }
  }
}
    `) as unknown as TypedDocumentString<CreateCommentMutation, CreateCommentMutationVariables>;
export const DeleteCommentDocument = new TypedDocumentString(`
    mutation DeleteComment($id: String!) {
  commentDelete(id: $id) {
    success
  }
}
    `) as unknown as TypedDocumentString<DeleteCommentMutation, DeleteCommentMutationVariables>;
export const CreateIssueRelationDocument = new TypedDocumentString(`
    mutation CreateIssueRelation($input: IssueRelationCreateInput!) {
  issueRelationCreate(input: $input) {
    success
    issueRelation {
      id
      issue {
        id
        state {
          id
          name
          type
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<CreateIssueRelationMutation, CreateIssueRelationMutationVariables>;
export const DeleteIssueRelationDocument = new TypedDocumentString(`
    mutation DeleteIssueRelation($id: String!) {
  issueRelationDelete(id: $id) {
    success
  }
}
    `) as unknown as TypedDocumentString<DeleteIssueRelationMutation, DeleteIssueRelationMutationVariables>;