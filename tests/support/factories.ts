/**
 * Test data shaped like syn's real workspace: two triage-enabled teams
 * (MYR and SHS) with identical workflows and same-named, team-scoped
 * labels, plus a label group. Every factory accepts overrides.
 */
import type {
  Label,
  Project,
  Team,
  TriageIssue,
  User,
  WorkflowState,
  WorkspaceSnapshot,
} from "~/lib/linear/types";

export const makeTeam = (overrides: Partial<Team> = {}): Team => ({
  color: "#5e6ad2",
  defaultIssueState: { id: "myr-backlog" },
  icon: "Brain",
  id: "team-myr",
  issueEstimationAllowZero: false,
  issueEstimationExtended: false,
  issueEstimationType: "tShirt",
  key: "MYR",
  name: "myriad",
  requirePriorityToLeaveTriage: false,
  triageEnabled: true,
  triageIssueState: { id: "myr-triage" },
  ...overrides,
});

export const makeState = (
  overrides: Partial<WorkflowState> & Pick<WorkflowState, "id" | "type">
): WorkflowState => ({
  color: "#999999",
  name: overrides.type,
  position: 0,
  team: { id: "team-myr" },
  ...overrides,
});

/** The workflow every team in syn's workspace uses, in position order. */
export const workflowFor = (teamId: string, prefix: string): WorkflowState[] =>
  (
    [
      ["triage", "Triage", "triage"],
      ["backlog", "Backlog", "backlog"],
      ["scheduled", "Scheduled", "unstarted"],
      ["in-progress", "In Progress", "started"],
      ["in-review", "In Review", "started"],
      ["done", "Done", "completed"],
      ["canceled", "Canceled", "canceled"],
      ["duplicate", "Duplicate", "duplicate"],
    ] as const
  ).map(([suffix, name, type], index) =>
    makeState({
      id: `${prefix}-${suffix}`,
      name,
      position: index,
      team: { id: teamId },
      type,
    })
  );

export const makeLabel = (
  overrides: Partial<Label> & Pick<Label, "id" | "name">
): Label => ({
  color: "#bbbbbb",
  isGroup: false,
  parent: null,
  team: { id: "team-myr" },
  ...overrides,
});

export const makeProject = (
  overrides: Partial<Project> & Pick<Project, "id" | "name">
): Project => ({
  color: "#123456",
  icon: null,
  teams: { nodes: [{ id: "team-myr" }] },
  ...overrides,
});

export const makeUser = (
  overrides: Partial<User> & Pick<User, "id">
): User => ({
  active: true,
  app: false,
  avatarUrl: null,
  displayName: overrides.id,
  guest: false,
  isMe: false,
  name: overrides.id,
  ...overrides,
});

export const makeIssue = (
  overrides: Partial<TriageIssue> = {}
): TriageIssue => ({
  assignee: null,
  botActor: null,
  createdAt: "2026-09-20T10:00:00.000Z",
  creator: { avatarUrl: null, displayName: "syn", id: "user-syn" },
  dueDate: null,
  estimate: null,
  externalUserCreator: null,
  id: "issue-1",
  identifier: "MYR-1",
  integrationSourceType: null,
  labels: { nodes: [] },
  priority: 0,
  project: null,
  snoozedBy: null,
  snoozedUntilAt: null,
  state: { id: "myr-triage" },
  team: { id: "team-myr" },
  title: "An idea",
  updatedAt: "2026-09-20T10:00:00.000Z",
  url: "https://linear.app/synmux/issue/MYR-1/an-idea",
  ...overrides,
});

const labelsFor = (teamId: string, prefix: string): Label[] => [
  makeLabel({ id: `${prefix}-bug`, name: "bug", team: { id: teamId } }),
  makeLabel({
    id: `${prefix}-enhancement`,
    name: "enhancement",
    team: { id: teamId },
  }),
  makeLabel({
    id: `${prefix}-administrative`,
    isGroup: true,
    name: "Administrative",
    team: { id: teamId },
  }),
  makeLabel({
    id: `${prefix}-enrich`,
    name: "Enrich",
    parent: { id: `${prefix}-administrative` },
    team: { id: teamId },
  }),
  makeLabel({
    id: `${prefix}-sunsama`,
    name: "Sunsama",
    parent: { id: `${prefix}-administrative` },
    team: { id: teamId },
  }),
];

/** A two-team workspace modelled on syn's. */
export const makeWorkspace = (): WorkspaceSnapshot => ({
  labels: [
    ...labelsFor("team-myr", "myr"),
    ...labelsFor("team-shs", "shs"),
    makeLabel({ id: "shs-devops", name: "DevOps", team: { id: "team-shs" } }),
    makeLabel({ id: "workspace-urgent", name: "Customer", team: null }),
  ],
  projects: [
    makeProject({ id: "project-myr", name: "Myriad thing" }),
    makeProject({
      id: "project-shared",
      name: "Shared thing",
      teams: { nodes: [{ id: "team-myr" }, { id: "team-shs" }] },
    }),
  ],
  states: [
    ...workflowFor("team-myr", "myr"),
    ...workflowFor("team-shs", "shs"),
  ],
  teams: [
    makeTeam(),
    makeTeam({
      color: "#26b5ce",
      defaultIssueState: { id: "shs-backlog" },
      icon: "Dino",
      id: "team-shs",
      key: "SHS",
      name: "syn-horse",
      triageIssueState: { id: "shs-triage" },
    }),
  ],
  users: [
    makeUser({ displayName: "syn", id: "user-syn", isMe: true }),
    makeUser({ app: true, displayName: "GitHub", id: "user-github" }),
  ],
});
