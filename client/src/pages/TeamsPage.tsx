import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../services/api';
import {
  Users,
  Shield,
  Plus,
  RefreshCw,
  X,
  Lock,
  UserPlus,
  Building2,
  Crown,
  Layers,
  Edit2,
  Mail,
  Fingerprint
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AccessRequestsPanel } from '../components/department/AccessRequestsPanel';
import { UserTeamAccessResult, Role, Department, User, Team } from '../types';
import { roleShortLabel } from '../utils/roles';

interface TeamData {
  id: string;
  name: string;
  departmentId?: string | null;
  dept?: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
  department?: string | null;
  description: string;
  managerId?: string | null;
  manager?: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    employeeId?: string | null;
  };
  teamLead?: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    employeeId?: string | null;
  } | null;
  members: {
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      avatar: string;
      employeeId?: string | null;
    };
  }[];
  userAccess?: UserTeamAccessResult;
}

const emptyEmployeeForm = {
  name: '',
  email: '',
  employeeId: '',
  password: '',
  role: 'TEAM_MEMBER' as Role,
  departmentId: '',
  teamId: ''
};


const emptyTeamForm = {
  name: '',
  description: '',
  departmentId: '',
  teamLeadId: ''
};

/**
 * Roles the current actor is allowed to provision, mirroring the backend
 * privilege hierarchy in `addEmployee` (cannot escalate to a peer or above).
 */
const assignableRolesFor = (actorRole?: Role): { value: Role; label: string }[] => {
  switch (actorRole) {
    case 'ADMIN':
      return [
        { value: 'TEAM_MEMBER', label: 'Team Member' },
        { value: 'TEAM_LEAD', label: 'Team Lead' },
        { value: 'MANAGER', label: 'Department Manager' },
        { value: 'ADMIN', label: 'Administrator' }
      ];
    case 'MANAGER':
      return [
        { value: 'TEAM_MEMBER', label: 'Team Member' },
        { value: 'TEAM_LEAD', label: 'Team Lead' }
      ];
    case 'TEAM_LEAD':
      return [{ value: 'TEAM_MEMBER', label: 'Team Member' }];
    default:
      return [];
  }
};

export const TeamsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);
  const [form, setForm] = useState(emptyEmployeeForm);
  const [teamForm, setTeamForm] = useState(emptyTeamForm);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [savingEditMember, setSavingEditMember] = useState(false);
  const [editMemberForm, setEditMemberForm] = useState({
    name: '',
    role: 'TEAM_MEMBER' as Role,
    departmentId: '',
    teamId: ''
  });

  // ADMIN, MANAGER and TEAM_LEAD can all provision accounts (backend enforces the
  // hierarchy — a Manager cannot create Managers/Admins, a Lead cannot create Leads).
  const canManageEmployees =
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'MANAGER' ||
    currentUser?.role === 'TEAM_LEAD';

  const assignableRoles = assignableRolesFor(currentUser?.role);
  const canCreateTeams = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';

  const canEditSelectedMember = useMemo(() => {
    if (!selectedMember || !currentUser) return false;
    if (currentUser.role === 'ADMIN') return true;
    if (currentUser.role === 'MANAGER') {
      if (selectedMember.role === 'ADMIN') return false;
      if (selectedMember.role === 'MANAGER' && selectedMember.id !== currentUser.id) return false;
      if (selectedMember.departmentId && selectedMember.departmentId !== currentUser.departmentId) return false;
      return true;
    }
    return false;
  }, [selectedMember, currentUser]);

  const openMemberModal = (memberOrUser: any) => {
    if (!memberOrUser?.id) return;
    const fullUser =
      employees.find((e) => e.id === memberOrUser.id) ||
      (memberOrUser as User);

    setSelectedMember(fullUser);
    setEditMemberForm({
      name: fullUser.name || '',
      role: (fullUser.role as Role) || 'TEAM_MEMBER',
      departmentId: fullUser.departmentId || '',
      teamId: fullUser.teamId || ''
    });
    setShowEditMemberModal(true);
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    setSavingEditMember(true);
    try {
      const payload = {
        name: editMemberForm.name.trim(),
        role: editMemberForm.role,
        departmentId: editMemberForm.departmentId || null,
        teamId: editMemberForm.teamId || null
      };

      const res = await api.patch(`/auth/employees/${selectedMember.id}`, payload);
      showToast(res.data.message || 'Member assignment updated successfully.', 'success');
      setShowEditMemberModal(false);
      setSelectedMember(null);
      await fetchTeams(true);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update member assignment.', 'error');
    } finally {
      setSavingEditMember(false);
    }
  };

  const fetchTeams = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [teamsRes, deptsRes, empRes] = await Promise.allSettled([
        api.get('/teams'),
        api.get('/departments'),
        api.get('/auth/employees')
      ]);

      if (teamsRes.status === 'fulfilled') {
        setTeams(teamsRes.value.data.teams || []);
      }
      if (deptsRes.status === 'fulfilled') {
        setDepartments(deptsRes.value.data.departments || []);
      }
      if (empRes.status === 'fulfilled') {
        setEmployees(empRes.value.data.employees || []);
      }
    } catch (err) {
      console.error('Error fetching teams and departments', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  const refreshAfterAccessUpdate = async () => {
    await fetchTeams(true);
    showToast('Access status synced.', 'success', 'Updated');
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchTeams(true);
    setIsRefreshing(false);
    showToast('Team roster refreshed!', 'success', 'Synced');
  };

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const openAddModal = (departmentIdOverride?: string) => {
    let defaultDeptId = departmentIdOverride || '';

    if (!defaultDeptId && currentUser?.role === 'MANAGER' && currentUser.departmentId) {
      defaultDeptId = currentUser.departmentId;
    }

    setForm({
      ...emptyEmployeeForm,
      departmentId: defaultDeptId
    });
    setShowAddModal(true);
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      showToast('Name, email, and password are required.', 'error');
      return;
    }
    if (form.password.length < 8) {
      showToast('Password must be at least 8 characters.', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await api.post('/auth/employees', {
        name: form.name.trim(),
        email: form.email.trim(),
        employeeId: form.employeeId.trim() || undefined,
        password: form.password,
        role: form.role,
        departmentId: form.departmentId || undefined
      });
      showToast(res.data.message || 'Employee added successfully.', 'success');
      setShowAddModal(false);
      setForm(emptyEmployeeForm);
      await fetchTeams(true);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to add employee.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openCreateTeamModal = (departmentId?: string) => {
    const defaultDepartmentId =
      departmentId ||
      (currentUser?.role === 'MANAGER' ? currentUser.departmentId : undefined) ||
      departments[0]?.id ||
      '';

    setTeamForm({ name: '', description: '', departmentId: defaultDepartmentId, teamLeadId: '' });
    setShowCreateTeamModal(true);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamForm.name.trim() || !teamForm.departmentId) {
      showToast('A team name and department are required.', 'error');
      return;
    }

    setSavingTeam(true);
    try {
      const res = await api.post('/teams', {
        name: teamForm.name.trim(),
        description: teamForm.description.trim() || undefined,
        departmentId: teamForm.departmentId,
        teamLeadId: teamForm.teamLeadId || undefined
      });
      showToast(res.data.message || 'Team created successfully.', 'success');
      setShowCreateTeamModal(false);
      await fetchTeams(true);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create team.', 'error');
    } finally {
      setSavingTeam(false);
    }
  };

  const hierarchy = useMemo(() => {
    // Merge departments list with any department metadata attached to teams
    const deptMap = new Map<string, Department>();
    departments.forEach((d) => deptMap.set(d.id, d));
    teams.forEach((t) => {
      if (t.dept && !deptMap.has(t.dept.id)) {
        deptMap.set(t.dept.id, {
          id: t.dept.id,
          name: t.dept.name,
          description: t.dept.description || '',
          isActive: true,
          companyId: '',
          createdAt: '',
          updatedAt: ''
        });
      }
    });

    const teamsByDepartment = new Map<string, TeamData[]>();
    const unassignedTeams: TeamData[] = [];

    teams.forEach((team) => {
      const departmentId = team.dept?.id || team.departmentId;
      if (departmentId && deptMap.has(departmentId)) {
        teamsByDepartment.set(departmentId, [...(teamsByDepartment.get(departmentId) || []), team]);
      } else {
        unassignedTeams.push(team);
      }
    });

    const departmentNodes = Array.from(deptMap.values()).map((department) => {
      const departmentTeams = teamsByDepartment.get(department.id) || [];
      const departmentTeamIds = new Set(departmentTeams.map((team) => team.id));
      const managers = employees.filter(
        (employee) => employee.departmentId === department.id && employee.role === 'MANAGER'
      );
      const directStaff = employees.filter(
        (employee) =>
          employee.departmentId === department.id &&
          employee.role !== 'ADMIN' &&
          employee.role !== 'MANAGER' &&
          (!employee.teamId || !departmentTeamIds.has(employee.teamId)) &&
          !employee.memberships?.some((membership) => departmentTeamIds.has(membership.team.id))
      );

      return { department, teams: departmentTeams, managers, directStaff };
    });

    const allDepartmentTeamIds = new Set(teams.flatMap((team) => [team.id]));
    const unassignedStaff = employees.filter(
      (employee) =>
        employee.role !== 'ADMIN' &&
        !employee.departmentId &&
        (!employee.teamId || !allDepartmentTeamIds.has(employee.teamId))
    );

    return {
      admins: employees.filter((employee) => employee.role === 'ADMIN'),
      departments: departmentNodes,
      unassignedTeams,
      unassignedStaff
    };
  }, [departments, employees, teams]);

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 dark:text-slate-400">
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-bold">Loading team roster...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Workspace Overview */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Organization & Teams
            </h1>
            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              {currentUser?.company?.name || 'Workspace'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Complete hierarchy of your organization: Workspace Leadership, Departments, Managers, Teams, and Members.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          {canCreateTeams && (
            <button
              onClick={() => openCreateTeamModal()}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Create Team</span>
            </button>
          )}

          {canManageEmployees && (
            <button
              onClick={() => openAddModal()}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 hover:opacity-95 transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Employee</span>
            </button>
          )}
        </div>
      </div>

      {hierarchy.departments.length === 0 && hierarchy.unassignedTeams.length === 0 && (
        <div className="p-8 rounded-2xl glass-panel border border-slate-200/80 dark:border-white/10 text-center text-sm text-slate-500">
          No departments or teams found for this company yet.
        </div>
      )}

      <AccessRequestsPanel
        teams={teams as unknown as Team[]}
        onUpdated={refreshAfterAccessUpdate}
      />

      {hierarchy.admins.length > 0 && (
        <div className="p-6 rounded-2xl glass-panel border border-amber-500/20 bg-amber-500/[0.03] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              Organization Admins
            </h2>
            <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              {hierarchy.admins.length} Admins
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {hierarchy.admins.map((admin) => (
              <div 
                key={admin.id} 
                className="p-3.5 rounded-xl glass-card border border-amber-500/30 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
                onClick={() => openMemberModal(admin)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img src={admin.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(admin.name)}`} alt={admin.name} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-amber-500/60 p-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{admin.name}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{admin.employeeId ? `${admin.employeeId} • ${admin.email}` : admin.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canManageEmployees && (
                    <button 
                      className="p-1.5 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-all rounded-md hover:bg-amber-50 dark:hover:bg-amber-500/10"
                      onClick={(e) => { e.stopPropagation(); openMemberModal(admin); }}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-600 text-white shrink-0">ADMIN</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hierarchy.departments.map(({ department, teams: deptTeams, managers, directStaff }) => (
        <div key={department.id} className="p-6 sm:p-7 rounded-2xl glass-panel border border-slate-200/80 dark:border-white/10 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-500" />
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{department.name}</h2>
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">DEPARTMENT</span>
              </div>
              {department.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{department.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              {canCreateTeams && (
                <button onClick={() => openCreateTeamModal(department.id)} className="px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-bold flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add Team
                </button>
              )}
              {canManageEmployees && (
                <button onClick={() => openAddModal(department.id)} className="px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-bold flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" /> Add Personnel
                </button>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-purple-500" /> Department Managers ({managers.length})
            </h3>
            {managers.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-xs text-slate-400">No manager assigned to this department yet.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {managers.map((manager) => (
                  <div 
                    key={manager.id} 
                    className="p-3.5 rounded-xl glass-card border border-purple-500/30 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
                    onClick={() => openMemberModal(manager)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={manager.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(manager.name)}`} alt={manager.name} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-purple-500/60 p-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{manager.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{manager.employeeId ? `${manager.employeeId} • ${manager.email}` : manager.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canManageEmployees && (
                        <button 
                          className="p-1.5 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-all rounded-md hover:bg-purple-50 dark:hover:bg-purple-500/10"
                          onClick={(e) => { e.stopPropagation(); openMemberModal(manager); }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-600 text-white shrink-0">MANAGER</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-500" /> Teams ({deptTeams.length})
            </h3>
            {deptTeams.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-xs text-slate-400">
                No teams created in this department yet.
              </div>
            ) : (
              deptTeams.map((team) => {
                const teamLead =
                  team.teamLead ||
                  employees.find(
                    (employee) =>
                      employee.teamId === team.id && employee.role === 'TEAM_LEAD'
                  );
                const members = team.members?.map((member) => member.user) || [];
                return (
                  <div
                    key={team.id}
                    className="p-4 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {team.name}
                        </h4>
                        {team.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {team.description}
                          </p>
                        )}
                      </div>
                      {canManageEmployees && (
                        <button
                          onClick={() => openAddModal(department.id)}
                          className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-bold"
                        >
                          Add Member
                        </button>
                      )}
                    </div>
                    {teamLead && (
                      <div 
                        className="p-3 rounded-lg glass-card border border-indigo-500/30 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
                        onClick={() => openMemberModal(teamLead)}
                      >
                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {teamLead.name}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {teamLead.email}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {canManageEmployees && (
                            <button 
                              className="p-1.5 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                              onClick={(e) => { e.stopPropagation(); openMemberModal(teamLead); }}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-600 text-white">
                            TEAM LEAD
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {members.map((member: any) => (
                        <div
                          key={member.id}
                          className="p-2.5 rounded-lg glass-card border border-slate-200/80 dark:border-white/10 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
                          onClick={() => openMemberModal(member)}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate block group-hover:text-blue-500 transition-colors">
                              {member.name}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate block">
                              {member.email}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {canManageEmployees && (
                              <button
                                className="p-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all rounded"
                                onClick={(e) => { e.stopPropagation(); openMemberModal(member); }}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                              {roleShortLabel(member.role)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {directStaff.length > 0 && (
            <div>
              <h3 className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-500" /> Direct Department Staff ({directStaff.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {directStaff.map((staff) => (
                  <div
                    key={staff.id}
                    className="p-3.5 rounded-xl glass-card border border-slate-200/80 dark:border-white/10 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
                    onClick={() => openMemberModal(staff)}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate block group-hover:text-blue-500 transition-colors">
                        {staff.name}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate block">
                        {staff.email}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {canManageEmployees && (
                        <button 
                          className="p-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all rounded hover:bg-blue-50 dark:hover:bg-blue-500/10"
                          onClick={(e) => { e.stopPropagation(); openMemberModal(staff); }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                        {roleShortLabel(staff.role)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {(hierarchy.unassignedTeams.length > 0 || hierarchy.unassignedStaff.length > 0) && (
        <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Cross-Functional & General Workspace
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Teams and personnel not assigned to a specific department
                </p>
              </div>
            </div>
          </div>

          {hierarchy.unassignedTeams.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" /> Unassigned Teams ({hierarchy.unassignedTeams.length})
              </h3>
              <div className="space-y-3">
                {hierarchy.unassignedTeams.map((team) => {
                  const teamLead =
                    team.teamLead ||
                    employees.find(
                      (emp) => emp.teamId === team.id && emp.role === 'TEAM_LEAD'
                    );
                  const members = team.members?.map((m) => m.user) || [];
                  return (
                    <div
                      key={team.id}
                      className="p-4 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {team.name}
                          </h4>
                          {team.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {team.description}
                            </p>
                          )}
                        </div>
                        {canManageEmployees && (
                          <button
                            onClick={() => openAddModal()}
                            className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-bold"
                          >
                            Add Member
                          </button>
                        )}
                      </div>
                      {teamLead && (
                        <div 
                          className="p-3 rounded-lg glass-card border border-indigo-500/30 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
                          onClick={() => openMemberModal(teamLead)}
                        >
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {teamLead.name}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              {teamLead.email}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {canManageEmployees && (
                              <button 
                                className="p-1.5 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                                onClick={(e) => { e.stopPropagation(); openMemberModal(teamLead); }}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-600 text-white">
                              TEAM LEAD
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {members.map((member: any) => (
                          <div
                            key={member.id}
                            className="p-2.5 rounded-lg glass-card border border-slate-200/80 dark:border-white/10 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
                            onClick={() => openMemberModal(member)}
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <span className="font-bold text-xs text-slate-900 dark:text-white truncate block group-hover:text-blue-500 transition-colors">
                                {member.name}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate block">
                                {member.email}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {canManageEmployees && (
                                <button 
                                  className="p-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all rounded"
                                  onClick={(e) => { e.stopPropagation(); openMemberModal(member); }}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                                {roleShortLabel(member.role)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {hierarchy.unassignedStaff.length > 0 && (
            <div>
              <h3 className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500" /> General Staff ({hierarchy.unassignedStaff.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {hierarchy.unassignedStaff.map((staff) => (
                  <div
                    key={staff.id}
                    className="p-3.5 rounded-xl glass-card border border-slate-200/80 dark:border-white/10 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
                    onClick={() => openMemberModal(staff)}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate block group-hover:text-blue-500 transition-colors">
                        {staff.name}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate block">
                        {staff.email}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {canManageEmployees && (
                        <button 
                          className="p-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all rounded hover:bg-slate-100 dark:hover:bg-white/10"
                          onClick={(e) => { e.stopPropagation(); openMemberModal(staff); }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/20 shrink-0">
                        {roleShortLabel(staff.role)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <div
          className="fixed inset-0 !m-0 !top-0 !left-0 !right-0 !bottom-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md"
          style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="w-full max-w-lg glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-500" />
                  Add Employee
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Create credentials for a teammate. They will log in with email or employee ID, then password.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="glass-input w-full"
                  placeholder="Priya Singh"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Work Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="glass-input w-full"
                    placeholder="priya@company.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Employee ID (optional)
                  </label>
                  <input
                    type="text"
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    className="glass-input w-full font-mono"
                    placeholder={`Auto ${(currentUser?.company?.slug?.replace(/[^a-zA-Z0-9]/g, '') || 'EMP').slice(0, 4).toUpperCase()}-00X`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Temporary Password
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="glass-input w-full"
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Role
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                    className="glass-input w-full cursor-pointer"
                  >
                    {assignableRoles.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Department Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>Assign to Department</span>
                </label>
                <select
                  value={form.departmentId}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      departmentId: e.target.value
                    });
                  }}
                  className="glass-input w-full cursor-pointer"
                  disabled={currentUser?.role === 'MANAGER' && !!currentUser.departmentId}
                >
                  {departments.length === 0 ? (
                    <option value="">No departments created</option>
                  ) : (
                    <>
                      {currentUser?.role === 'ADMIN' && (
                        <option value="">-- No Department (Direct Company) --</option>
                      )}
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Employee Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateTeamModal && (
        <div
          className="fixed inset-0 !m-0 !top-0 !left-0 !right-0 !bottom-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md"
          style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="w-full max-w-lg glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" />
                  Create New Team
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Create a team scoped to a department to organize daily standups and engineering tracks.
                </p>
              </div>
              <button
                onClick={() => setShowCreateTeamModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Team Name
                </label>
                <input
                  type="text"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                  className="glass-input w-full"
                  placeholder="e.g., Frontend Core, API Platform"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Description (optional)
                </label>
                <textarea
                  value={teamForm.description}
                  onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                  className="glass-input w-full resize-none h-20 text-xs"
                  placeholder="What does this team focus on?"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>Department</span>
                  </label>
                  <select
                    value={teamForm.departmentId}
                    onChange={(e) => setTeamForm({ ...teamForm, departmentId: e.target.value })}
                    className="glass-input w-full cursor-pointer"
                    disabled={currentUser?.role === 'MANAGER' && !!currentUser.departmentId}
                    required
                  >
                    <option value="" disabled>Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-500" />
                    <span>Team Lead (optional)</span>
                  </label>
                  <select
                    value={teamForm.teamLeadId}
                    onChange={(e) => setTeamForm({ ...teamForm, teamLeadId: e.target.value })}
                    className="glass-input w-full cursor-pointer"
                  >
                    <option value="">-- No Lead Assigned --</option>
                    {employees
                      .filter(
                        (emp) =>
                          !teamForm.departmentId ||
                          emp.departmentId === teamForm.departmentId ||
                          emp.role === 'ADMIN'
                      )
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.role})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateTeamModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTeam}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold disabled:opacity-50"
                >
                  {savingTeam ? 'Creating Team...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Assignment & Details Modal */}
      {showEditMemberModal && selectedMember && (
        <div
          className="fixed inset-0 !m-0 !top-0 !left-0 !right-0 !bottom-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md"
          style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="w-full max-w-lg glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl p-6">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <img
                  src={selectedMember.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(selectedMember.name)}`}
                  alt={selectedMember.name}
                  className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-blue-500/40 p-0.5"
                />
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{selectedMember.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      {roleShortLabel(selectedMember.role)}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {selectedMember.email}</span>
                    {selectedMember.employeeId && (
                      <span className="flex items-center gap-1 font-mono"><Fingerprint className="w-3 h-3" /> {selectedMember.employeeId}</span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowEditMemberModal(false); setSelectedMember(null); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {canEditSelectedMember ? (
              <form onSubmit={handleUpdateMember} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editMemberForm.name}
                    onChange={(e) => setEditMemberForm({ ...editMemberForm, name: e.target.value })}
                    className="glass-input w-full"
                    required
                  />
                </div>

                {currentUser?.role === 'ADMIN' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Role / Position
                    </label>
                    <select
                      value={editMemberForm.role}
                      onChange={(e) => setEditMemberForm({ ...editMemberForm, role: e.target.value as Role })}
                      className="glass-input w-full cursor-pointer"
                    >
                      {assignableRoles.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-500" />
                      <span>Assign to Department</span>
                    </label>
                    <select
                      value={editMemberForm.departmentId}
                      onChange={(e) => {
                        const departmentId = e.target.value;
                        const teamStillBelongsToDepartment = teams.some(
                          (team) =>
                            team.id === editMemberForm.teamId &&
                            (team.dept?.id || team.departmentId) === departmentId
                        );
                        setEditMemberForm({
                          ...editMemberForm,
                          departmentId,
                          teamId: teamStillBelongsToDepartment ? editMemberForm.teamId : ''
                        });
                      }}
                      className="glass-input w-full cursor-pointer"
                      disabled={currentUser?.role === 'MANAGER' && !!currentUser.departmentId}
                    >
                      {departments.length === 0 ? (
                        <option value="">No departments created</option>
                      ) : (
                        <>
                          <option value="">-- No Department (Direct Company) --</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Primary Team</span>
                    </label>
                    <select
                      value={editMemberForm.teamId}
                      onChange={(e) => setEditMemberForm({ ...editMemberForm, teamId: e.target.value })}
                      className="glass-input w-full cursor-pointer"
                    >
                      <option value="">-- No Team Assignment --</option>
                      {teams
                        .filter((team) => {
                          const teamDepartmentId = team.dept?.id || team.departmentId;
                          return !editMemberForm.departmentId || teamDepartmentId === editMemberForm.departmentId;
                        })
                        .map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => { setShowEditMemberModal(false); setSelectedMember(null); }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEditMember}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {savingEditMember ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Department:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {selectedMember.department?.name || departments.find(d => d.id === selectedMember.departmentId)?.name || 'Direct Company (None)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Role:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {selectedMember.role}
                    </span>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowEditMemberModal(false); setSelectedMember(null); }}
                    className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-white/10 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-white/20"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
