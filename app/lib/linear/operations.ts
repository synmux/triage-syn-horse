/**
 * Every GraphQL operation the app sends to Linear.
 *
 * `pnpm codegen` turns these into typed `TypedDocumentString`s in
 * `./generated`, validating them against `graphql/linear.schema.graphql`.
 * The five mutations here are the complete set of writes the app can make.
 */
import { graphql } from "./generated";

/** The fields the triage queue needs for each issue row. */
export const TriageIssueFields = graphql(`
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
`);

export const ViewerQuery = graphql(`
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
`);

export const TeamsQuery = graphql(`
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
`);

export const WorkflowStatesQuery = graphql(`
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
`);

export const IssueLabelsQuery = graphql(`
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
`);

export const ProjectsQuery = graphql(`
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
`);

export const UsersQuery = graphql(`
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
`);

export const TriageQueueQuery = graphql(`
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
`);

/** Send with signed file URLs so images in the description load without auth. */
export const IssueDetailQuery = graphql(`
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
`);

/** Minimal read used to confirm nothing changed before an undo is applied. */
export const IssueStateQuery = graphql(`
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
`);

export const SearchIssuesQuery = graphql(`
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
`);

export const UpdateIssueMutation = graphql(`
  mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $id, input: $input) {
      success
      issue {
        ...TriageIssueFields
      }
    }
  }
`);

export const CreateCommentMutation = graphql(`
  mutation CreateComment($input: CommentCreateInput!) {
    commentCreate(input: $input) {
      success
      comment {
        id
      }
    }
  }
`);

export const DeleteCommentMutation = graphql(`
  mutation DeleteComment($id: String!) {
    commentDelete(id: $id) {
      success
    }
  }
`);

export const CreateIssueRelationMutation = graphql(`
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
`);

export const DeleteIssueRelationMutation = graphql(`
  mutation DeleteIssueRelation($id: String!) {
    issueRelationDelete(id: $id) {
      success
    }
  }
`);
