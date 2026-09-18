export type Role = 'ADMIN' | 'MANAGER' | 'TEAM_LEAD' | 'TEAM_MEMBER';
export type BlockerLevel = 'NONE' | 'MINOR' | 'CRITICAL';
export type BlockerStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export interface Company {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
  logo?: string | null;
  createdAt?: string;
}

export interface Department {
  id: string;
  companyId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  stats?: {
    totalTeams: number;
    totalManagers: number;
    totalLeads: number;
    totalMembers: number;
    totalUsers: number;
  };
  teams?: Team[];
  managers?: User[];
  leads?: User[];
  members?: User[];
}

export interface DepartmentHierarchyNode {
  id: string;
  name: string;
  type: 'DEPARTMENT';
  managers: {
    id: string;
    name: string;
    email: string;
    employeeId?: string | null;
    avatar?: string | null;
    role: 'MANAGER';
  }[];
  teams: {
    id: string;
    name: string;
    type: 'TEAM';
    teamLead: {
      id: string;
      name: string;
      email: string;
      avatar?: string | null;
      role: 'TEAM_LEAD';
    } | null;
    members: {
      id: string;
      name: string;
      email: string;
      employeeId?: string | null;
      avatar?: string | null;
      role: 'TEAM_MEMBER';
    }[];
  }[];
}

export interface User {
  id: string;
  companyId?: string;
  employeeId?: string | null;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  departmentId?: string | null;
  teamId?: string | null;
  isActive?: boolean;
  createdAt?: string;
  company?: Company;
  department?: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
  team?: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
  memberships?: {
    team: {
      id: string;
      name: string;
      department?: string | null;
      description?: string;
    };
  }[];
}

export interface UserTeamAccessResult {
  allowed: boolean;
  reason: 'ADMIN_GLOBAL' | 'DEPARTMENT_MANAGER' | 'TEAM_LEAD' | 'DIRECT_MEMBER' | 'TEMPORARY_ACCESS_GRANTED' | 'RESTRICTED' | 'ADMIN_OR_MANAGER' | 'CROSS_DEPARTMENT_LEAD';
  isMember: boolean;
  isLead: boolean;
  hasTempAccess: boolean;
  expiresAt: string | null;
  grantId?: string;
  pendingRequest?: {
    id: string;
    createdAt: string;
    durationHours: number;
    reason: string | null;
  } | null;
}

export interface Team {
  id: string;
  companyId: string;
  departmentId?: string | null;
  name: string;
  department?: string | null;
  description?: string | null;
  managerId?: string | null;
  teamLeadId?: string | null;
  isActive?: boolean;
  dept?: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
  manager?: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    employeeId?: string | null;
  } | null;
  teamLead?: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    employeeId?: string | null;
  } | null;
  members?: {
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
      avatar?: string | null;
      employeeId?: string | null;
    };
  }[];
  userMembers?: User[];
  userAccess?: UserTeamAccessResult;
}

export interface DepartmentAccessRequest {
  id: string;
  teamId: string;
  userId: string;
  grantedById?: string | null;
  reason?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';
  durationHours: number;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  team: {
    id: string;
    name: string;
    department?: string | null;
  };
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    employeeId?: string | null;
    role?: Role;
  };
  grantedBy?: {
    id: string;
    name: string;
  } | null;
}

export interface LookupUser {
  id: string;
  name: string;
  email: string;
  employeeId?: string | null;
  avatar?: string | null;
  role: Role;
  department?: { id: string; name: string } | null;
  team?: { id: string; name: string } | null;
}

export interface LookupMatch {
  user: LookupUser;
  company: Company;
}

export interface LookupResponse {
  found: boolean;
  multiple?: boolean;
  user?: LookupUser;
  company?: Company;
  matches?: LookupMatch[];
  message?: string;
}

export interface ReactionReactor {
  id: string;
  name: string;
  avatar?: string;
}

export interface StandupReaction {
  id: string;
  standupId: string;
  userId: string;
  emoji: string;
  createdAt: string;
  user: ReactionReactor;
}

export interface DailyStandup {
  id: string;
  userId: string;
  teamId: string;
  date: string;
  yesterdayUpdates: string; // JSON string array
  todayPlans: string;       // JSON string array
  blockers?: string;        // JSON string array
  blockerLevel: BlockerLevel;
  blockerStatus?: BlockerStatus;
  blockerResolutionNote?: string | null;
  blockerResolvedAt?: string | null;
  blockerResolvedById?: string | null;
  submittedAt: string;
  updatedAt: string;
  user?: User;
  team?: {
    id: string;
    name: string;
    department?: string | null;
  };
  resolvedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  reactions?: StandupReaction[];
}

export interface TeamMemberFeedItem {
  user: User;
  hasSubmitted: boolean;
  submission: DailyStandup | null;
  status: 'SUBMITTED' | 'PENDING';
  blockerLevel: BlockerLevel;
}

export interface PriorityBlocker {
  id: string;
  userId?: string;
  userName: string;
  userAvatar?: string;
  employeeId?: string | null;
  teamName?: string;
  blockerLevel: BlockerLevel;
  blockerStatus: BlockerStatus;
  blockerResolutionNote?: string | null;
  blockerResolvedAt?: string | null;
  resolvedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  blockers: string;
  submittedAt: string;
}

export interface ManagerDashboardData {
  restricted?: boolean;
  date: string;
  team?: {
    id: string;
    name: string;
    department?: string | null;
    description?: string | null;
    manager?: {
      id: string;
      name: string;
      email: string;
      avatar?: string | null;
    } | null;
    teamLead?: {
      id: string;
      name: string;
      email: string;
      avatar?: string | null;
    } | null;
  } | null;
  userAccess?: UserTeamAccessResult;
  stats?: {
    totalMembers: number;
    submittedCount: number;
    pendingCount: number;
    activeBlockersCount: number;
    criticalBlockersCount: number;
    minorBlockersCount: number;
    submissionRate: number;
  };
  priorityBlockers?: PriorityBlocker[];
  teamMembersFeed?: TeamMemberFeedItem[];
}

export interface AISummaryData {
  date: string;
  totalMembers: number;
  submittedCount: number;
  pendingCount: number;
  submissionRate: number;
  totalBlockers: number;
  criticalBlockersCount: number;
  minorBlockersCount: number;
  executiveSummary: string;
  implicitBlockers: {
    userName: string;
    detectedPhrase: string;
    text: string;
  }[];
  identifiedRisks: string[];
  recommendations: string[];
  generatedAt: string;
}

export interface AuditLog {
  id: string;
  companyId: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  departmentId?: string | null;
  teamId?: string | null;
  metadata?: any;
  timestamp: string;
  actor?: {
    id: string;
    name: string;
    email: string;
    role: Role;
    avatar?: string | null;
    employeeId?: string | null;
  };
  department?: { id: string; name: string } | null;
  team?: { id: string; name: string } | null;
}

export interface AppNotification {
  id: string;
  userId: string;
  senderId?: string | null;
  title: string;
  message: string;
  type: 'BLOCKER_RESOLVED' | 'BLOCKER_ACKNOWLEDGED' | 'REACTION' | 'REMINDER' | 'INFO';
  link?: string | null;
  read: boolean;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
    avatar?: string | null;
    role?: string;
  } | null;
}
