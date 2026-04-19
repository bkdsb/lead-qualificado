import { createAdminClient } from '@/lib/supabase/admin';
import type { AuditEntityType, AuditAction } from '@/types/database';

interface AuditLogEntry {
  entityType: AuditEntityType;
  entityId?: string;
  action: AuditAction;
  details?: Record<string, unknown>;
  actorId?: string;
  ipAddress?: string;
  environment?: string;
}

/**
 * Write an entry to the audit log.
 * Uses the admin client to bypass RLS.
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from('audit_logs').insert({
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    action: entry.action,
    details: entry.details || {},
    actor_id: entry.actorId,
    ip_address: entry.ipAddress,
    environment: entry.environment,
  });

  if (error) {
    // Don't throw — audit logging should never break the main flow
    console.error('[AUDIT] Failed to write audit log:', error.message);
  }
}

/**
 * Log a lead creation event.
 */
export async function auditLeadCreate(leadId: string, actorId: string, details?: Record<string, unknown>) {
  return writeAuditLog({
    entityType: 'lead',
    entityId: leadId,
    action: 'create',
    actorId,
    details,
  });
}

/**
 * Log a stage change event.
 */
export async function auditStageChange(
  leadId: string,
  actorId: string,
  fromStage: string,
  toStage: string,
  reason?: string
) {
  return writeAuditLog({
    entityType: 'lead',
    entityId: leadId,
    action: 'stage_change',
    actorId,
    details: { from_stage: fromStage, to_stage: toStage, reason },
  });
}

/**
 * Log a score change event.
 */
export async function auditScoreChange(
  leadId: string,
  actorId: string,
  eventType: string,
  points: number,
  newTotal: number
) {
  return writeAuditLog({
    entityType: 'lead',
    entityId: leadId,
    action: 'score_change',
    actorId,
    details: { event_type: eventType, points, new_total: newTotal },
  });
}

/**
 * Log a Meta dispatch event.
 */
export async function auditDispatch(
  dispatchId: string,
  leadId: string,
  actorId: string,
  eventName: string,
  environment: string,
  success: boolean
) {
  return writeAuditLog({
    entityType: 'dispatch',
    entityId: dispatchId,
    action: 'dispatch',
    actorId,
    environment,
    details: { lead_id: leadId, event_name: eventName, success },
  });
}

/**
 * Log a dual-confirm action.
 */
export async function auditConfirm(
  leadId: string,
  actorId: string,
  eventName: string,
  environment: string
) {
  return writeAuditLog({
    entityType: 'lead',
    entityId: leadId,
    action: 'confirm',
    actorId,
    environment,
    details: { event_name: eventName },
  });
}
