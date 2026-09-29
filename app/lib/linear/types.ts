/**
 * Domain types derived from the generated GraphQL result types, so the
 * shapes the app works with always match what the queries select.
 */
import type {
  IssueDetailQuery,
  IssueLabelsQuery,
  ProjectsQuery,
  SearchIssuesQuery,
  TeamsQuery,
  TriageIssueFieldsFragment,
  UsersQuery,
  ViewerQuery,
  WorkflowStatesQuery,
} from "./generated/graphql";

export type Team = TeamsQuery["teams"]["nodes"][number];
export type WorkflowState =
  WorkflowStatesQuery["workflowStates"]["nodes"][number];
export type Label = IssueLabelsQuery["issueLabels"]["nodes"][number];
export type Project = ProjectsQuery["projects"]["nodes"][number];
export type User = UsersQuery["users"]["nodes"][number];
export type Viewer = ViewerQuery["viewer"];
export type Organisation = ViewerQuery["organization"];
export type TriageIssue = TriageIssueFieldsFragment;
export type IssueDetail = IssueDetailQuery["issue"];
export type SearchResult = SearchIssuesQuery["searchIssues"]["nodes"][number];
export type { IssueUpdateInput } from "./generated/graphql";

/** Workflow state categories, from `WorkflowState.type`'s documentation. */
export type WorkflowStateType =
  | "triage"
  | "backlog"
  | "unstarted"
  | "started"
  | "completed"
  | "canceled"
  | "duplicate";

/** Everything about the workspace the app needs to render and plan actions. */
export interface WorkspaceSnapshot {
  labels: Label[];
  projects: Project[];
  states: WorkflowState[];
  teams: Team[];
  users: User[];
}
