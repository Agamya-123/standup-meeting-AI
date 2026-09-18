import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import {
  Building2, Users, Shield, Plus, Edit3, Trash2, RefreshCw, X, Layers, Network, Crown, Mail, Search, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Department, DepartmentHierarchyNode } from '../types';
import { isAdmin } from '../utils/roles';

export const DepartmentsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [showHierarchyModal, setShowHierarchyModal] = useState<boolean>(false);
  const [hierarchyData, setHierarchyData] = useState<DepartmentHierarchyNode | null>(null);
  const [hierarchyLoading, setHierarchyLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Form states
  const [deptName, setDeptName] = useState<string>('');
  const [deptDescription, setDeptDescription] = useState<string>('');

  const canManage = isAdmin(currentUser?.role);

  const fetchDepartments = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const response = await api.get('/departments');
      setDepartments(response.data.departments || []);
    } catch (err: any) {
      console.error('Error fetching departments', err);
      showToast(err.response?.data?.message || 'Failed to fetch departments.', 'error');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchDepartments(true);
    setIsRefreshing(false);
    showToast('Department list refreshed!', 'success', 'Synced');
  };

  const openCreateModal = () => {
    setDeptName('');
    setDeptDescription('');
    setShowCreateModal(true);
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) {
      showToast('Department name is required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/departments', {
        name: deptName.trim(),
        description: deptDescription.trim() || undefined
      });
      showToast(res.data.message || 'Department created successfully.', 'success');
      setShowCreateModal(false);
      setDeptName('');
      setDeptDescription('');
      await fetchDepartments(true);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create department.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptDescription(dept.description || '');
    setShowEditModal(true);
  };

  const handleEditDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;
    if (!deptName.trim()) {
      showToast('Department name is required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await api.put(`/departments/${editingDept.id}`, {
        name: deptName.trim(),
        description: deptDescription.trim() || undefined,
        isActive: true
      });
      showToast(res.data.message || 'Department updated successfully.', 'success');
      setShowEditModal(false);
      setEditingDept(null);
      await fetchDepartments(true);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update department.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to deactivate ${name}? This will also deactivate all nested teams.`)) {
      return;
    }
    try {
      await api.delete(`/departments/${id}`);
      showToast('Department deactivated.', 'success');
      await fetchDepartments(true);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to deactivate department.', 'error');
    }
  };

  const openHierarchyModal = async (id: string) => {
    setShowHierarchyModal(true);
    setHierarchyLoading(true);
    setHierarchyData(null);
    try {
      const res = await api.get(`/departments/${id}/hierarchy`);
      setHierarchyData(res.data.hierarchy);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to fetch hierarchy.', 'error');
      setShowHierarchyModal(false);
    } finally {
      setHierarchyLoading(false);
    }
  };

  const filteredDepts = departments.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Shield className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Access Denied</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md">
          You do not have administrative privileges to manage departments.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 dark:text-slate-400">
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-bold">Loading departments overview...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/10 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-8 h-8 text-blue-500" />
            Departments
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Manage organization departments and view their hierarchical structure.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search departments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/50 dark:bg-white/[0.02] text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-blue-500 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            New Dept
          </button>
        </div>
      </div>

      {filteredDepts.length === 0 ? (
        <div className="p-8 rounded-2xl glass-panel border border-slate-200/80 dark:border-white/10 text-center text-sm text-slate-500">
          No active departments found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDepts.map((dept) => (
            <div key={dept.id} className="p-5 rounded-2xl glass-panel border border-slate-200/80 dark:border-white/10 flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {dept.name}
                  </h3>
                  {dept.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {dept.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openHierarchyModal(dept.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10" title="View Hierarchy">
                    <Network className="w-4 h-4" />
                  </button>
                  <button onClick={() => openEditModal(dept)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10" title="Edit">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeactivate(dept.id, dept.name)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10" title="Deactivate">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-slate-200/80 dark:border-white/10 grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                  <div className="text-lg font-black text-slate-700 dark:text-slate-200">{dept.stats?.totalTeams || 0}</div>
                  <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Teams</div>
                </div>
                <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                  <div className="text-lg font-black text-slate-700 dark:text-slate-200">{dept.stats?.totalManagers || 0}</div>
                  <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Managers</div>
                </div>
                <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                  <div className="text-lg font-black text-slate-700 dark:text-slate-200">{(dept.stats?.totalLeads || 0) + (dept.stats?.totalMembers || 0)}</div>
                  <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Staff</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 !m-0 !top-0 !left-0 !right-0 !bottom-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md"
          style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="w-full max-w-md glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-500" />
                Create Department
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateDepartment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Name</label>
                <input type="text" value={deptName} onChange={(e) => setDeptName(e.target.value)} className="glass-input w-full" placeholder="Engineering" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Description (optional)</label>
                <textarea value={deptDescription} onChange={(e) => setDeptDescription(e.target.value)} className="glass-input w-full resize-none h-20" placeholder="Core engineering and product development..." />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold disabled:opacity-50">
                  {saving ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingDept && (
        <div
          className="fixed inset-0 !m-0 !top-0 !left-0 !right-0 !bottom-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md"
          style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="w-full max-w-md glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-500" />
                Edit Department
              </h2>
              <button onClick={() => setShowEditModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEditDepartment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Name</label>
                <input type="text" value={deptName} onChange={(e) => setDeptName(e.target.value)} className="glass-input w-full" placeholder="Engineering" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Description (optional)</label>
                <textarea value={deptDescription} onChange={(e) => setDeptDescription(e.target.value)} className="glass-input w-full resize-none h-20" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hierarchy Modal */}
      {showHierarchyModal && (
        <div
          className="fixed inset-0 !m-0 !top-0 !left-0 !right-0 !bottom-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md"
          style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Network className="w-5 h-5 text-indigo-500" />
                Department Hierarchy
              </h2>
              <button onClick={() => setShowHierarchyModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {hierarchyLoading ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-xs font-bold">Loading org structure...</p>
              </div>
            ) : hierarchyData ? (
              <div className="space-y-6">
                <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20">
                  <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">
                    Department: {hierarchyData.name}
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-500">Managers:</div>
                    {hierarchyData.managers.length === 0 ? (
                      <div className="text-xs text-slate-400 italic">No managers assigned</div>
                    ) : (
                      hierarchyData.managers.map((m) => (
                        <div key={m.id} className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                          <Crown className="w-3.5 h-3.5 text-amber-500" />
                          <span>{m.name}</span>
                          <span className="text-slate-400">({m.email})</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Teams</div>
                  {hierarchyData.teams.length === 0 ? (
                    <div className="text-xs text-slate-400 italic p-4 text-center border border-dashed rounded-xl">No teams in this department</div>
                  ) : (
                    hierarchyData.teams.map((t) => (
                      <div key={t.id} className="p-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-500" />
                            {t.name}
                          </div>
                          {t.teamLead ? (
                            <div className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md border border-indigo-500/20 flex items-center gap-1">
                              <span>Lead: {t.teamLead.name}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No lead assigned</span>
                          )}
                        </div>

                        <div className="pl-6 border-l-2 border-slate-200 dark:border-slate-800 space-y-1">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Members ({t.members.length})</div>
                          {t.members.length === 0 ? (
                            <div className="text-xs text-slate-400 italic">No team members</div>
                          ) : (
                            t.members.map((mem) => (
                              <div key={mem.id} className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                <span>{mem.name}</span>
                                <span className="text-slate-400 text-[10px]">({mem.email})</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
