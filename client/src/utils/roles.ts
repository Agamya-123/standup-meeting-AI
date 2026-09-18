import { Role } from '../types';

/**
 * Human-readable label for a role. The raw enum (`TEAM_MEMBER`) is never shown
 * to users — the UI always renders through this helper.
 */
export const roleLabel = (role?: Role | string | null): string => {
  switch (role) {
    case 'ADMIN':
      return 'Administrator';
    case 'MANAGER':
      return 'Department Manager';
    case 'TEAM_LEAD':
      return 'Team Lead';
    case 'TEAM_MEMBER':
    case 'MEMBER':
      return 'Team Member';
    default:
      return 'Team Member';
  }
};

/** Short label for tight badges where the full title would wrap. */
export const roleShortLabel = (role?: Role | string | null): string => {
  switch (role) {
    case 'ADMIN':
      return 'Admin';
    case 'MANAGER':
      return 'Manager';
    case 'TEAM_LEAD':
      return 'Lead';
    default:
      return 'Member';
  }
};

export const isAdmin = (role?: Role | string | null): boolean => role === 'ADMIN';

export const isManager = (role?: Role | string | null): boolean => role === 'MANAGER';

export const isTeamLead = (role?: Role | string | null): boolean => role === 'TEAM_LEAD';

export const isTeamMember = (role?: Role | string | null): boolean =>
  role === 'TEAM_MEMBER' || role === 'MEMBER';

/**
 * Roles that see the management overview (whole-team / whole-department
 * analytics) rather than the personal standup workspace.
 */
export const isManagerOrAdmin = (role?: Role | string | null): boolean =>
  isAdmin(role) || isManager(role);

/**
 * Roles that can provision employees — mirrors the backend hierarchy in
 * `addEmployee`. A Team Lead may only add Team Members to their own team.
 */
export const canProvisionEmployees = (role?: Role | string | null): boolean =>
  isAdmin(role) || isManager(role) || isTeamLead(role);

/** Roles allowed to view team standups and blockers across their scope. */
export const canViewTeamFeed = (role?: Role | string | null): boolean =>
  isAdmin(role) || isManager(role) || isTeamLead(role);
