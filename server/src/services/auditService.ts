import { prisma } from '../config/prisma.js';

export interface CreateAuditLogParams {
  companyId: string;
  actorId: string;
  action: string;
  targetType: 'DEPARTMENT' | 'TEAM' | 'USER' | 'STANDUP' | 'ACCESS_GRANT';
  targetId?: string | null;
  departmentId?: string | null;
  teamId?: string | null;
  metadata?: any;
}

export const logAuditEvent = async (params: CreateAuditLogParams): Promise<void> => {
  try {
    const metadataString = params.metadata ? JSON.stringify(params.metadata) : null;
    await prisma.auditLog.create({
      data: {
        companyId: params.companyId,
        actorId: params.actorId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId || null,
        departmentId: params.departmentId || null,
        teamId: params.teamId || null,
        metadata: metadataString,
        timestamp: new Date()
      }
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
    // Audit log failure should not crash the request, but is logged on console
  }
};
