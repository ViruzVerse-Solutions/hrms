/**
 * Centralized Leave and Outdoor Duty (OD) Utilities
 * Provides consistent categorization, formatting, and quota rules across all HRMS modules.
 */

export interface LeaveOrOdItem {
  id?: string;
  leaveType?: string | null;
  reason?: string | null;
  category?: string | null;
  status?: string | null;
  daysCount?: number | string | null;
  [key: string]: any;
}

/**
 * Determines if a given record is an Outdoor Duty (OD) assignment
 */
export function isOdRecord(record?: LeaveOrOdItem | null): boolean {
  if (!record) return false;
  if (record.category === 'outdoor_duty') return true;
  if (record.leaveType === 'on_duty' || record.leaveType === 'od') return true;
  if (typeof record.reason === 'string') {
    if (
      record.reason.startsWith('[ON DUTY') ||
      record.reason.includes('[OD]') ||
      record.reason.includes('ON DUTY (OD)')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Returns formatted human-readable display label for Leave or OD
 */
export function formatLeaveTypeLabel(type?: string | null, reason?: string | null): string {
  if (isOdRecord({ leaveType: type, reason })) {
    return 'Outdoor Duty (OD)';
  }
  switch (type) {
    case 'casual':
      return 'Casual Leave (CL)';
    case 'sick':
      return 'Sick Leave (SL)';
    case 'earned':
      return 'Earned Leave (EL)';
    case 'maternity':
      return 'Maternity Leave';
    case 'paternity':
      return 'Paternity Leave';
    case 'bereavement':
      return 'Bereavement Leave';
    case 'compensatory_off':
      return 'Compensatory Off';
    case 'unpaid':
      return 'Unpaid Leave';
    default:
      return type ? type.replace(/_/g, ' ') : 'Leave';
  }
}

/**
 * Formats approval queue title and category for Approvals Hub
 */
export function getApprovalItemDetails(item: LeaveOrOdItem): {
  category: 'leaves' | 'outdoor_duty';
  categoryTitle: string;
  title: string;
  isOd: boolean;
} {
  const isOd = isOdRecord(item);
  const days = Number(item.daysCount || 1);
  if (isOd) {
    return {
      category: 'outdoor_duty',
      categoryTitle: 'Outdoor Duty (OD)',
      title: `Outdoor Duty Assignment (${days} ${days === 1 ? 'Day' : 'Days'})`,
      isOd: true,
    };
  }
  const label = formatLeaveTypeLabel(item.leaveType, item.reason);
  return {
    category: 'leaves',
    categoryTitle: 'Leave Request',
    title: `${label} (${days} ${days === 1 ? 'Day' : 'Days'})`,
    isOd: false,
  };
}

/**
 * Strictly deterministic, multi-tiered comparator for Leave and OD lists.
 * Tier 1: Creation timestamp (newest on top)
 * Tier 2: Start Date (furthest future on top)
 * Tier 3: Unique ID (deterministic tie-breaker)
 */
export function compareLeavesChronologically(a: any, b: any): number {
  const getTimestamp = (item: any) => {
    const raw = item?.createdAt || item?.appliedAt;
    if (raw) {
      const parsed = new Date(raw).getTime();
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    if (item?.fromDate) {
      const parsed = new Date(`${item.fromDate}T00:00:00`).getTime();
      if (!isNaN(parsed)) return parsed;
    }
    return 0;
  };

  const timeA = getTimestamp(a);
  const timeB = getTimestamp(b);
  if (timeB !== timeA) return timeB - timeA;

  const fromA = a?.fromDate ? new Date(`${a.fromDate}T00:00:00`).getTime() : 0;
  const fromB = b?.fromDate ? new Date(`${b.fromDate}T00:00:00`).getTime() : 0;
  if (fromB !== fromA) return fromB - fromA;

  return String(b?.id || '').localeCompare(String(a?.id || ''));
}
