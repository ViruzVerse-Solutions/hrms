import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getApiUserContextAsync } from '@/lib/auth/rbac-guard-api';
import {
  ApprovalCategory,
  canUserApproveCategory,
  canUserViewApprovalCategory,
} from '@/lib/rbac';
import { auditService } from '@/services/audit.service';
import { attendanceService } from '@/services/attendance.service';
import { serverCache } from '@/lib/server-cache';
import { getApprovalItemDetails } from '@/lib/leave-utils';

export async function GET(req: NextRequest) {
  try {
    const userCtx = await getApiUserContextAsync(req);
    if (!prisma) {
      return NextResponse.json({ success: true, data: { items: [], counts: {} } });
    }

    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ success: true, data: { items: [], counts: {} } });
    }

    const role = userCtx.role;

    const [
      leaves,
      reqs,
      transfers,
      runs,
      exits,
      holidays,
      discCases,
    ] = await Promise.all([
      // 1. Pending Leave Requests
      canUserViewApprovalCategory(role, 'leaves')
        ? prisma.leaveRequest.findMany({
            where: { status: 'pending' },
            include: { employee: true },
            orderBy: { createdAt: 'desc' },
          }).catch(() => [])
        : Promise.resolve([]),

      // 2. Pending Job Requisitions
      canUserViewApprovalCategory(role, 'requisitions')
        ? prisma.jobRequisition.findMany({
            where: { status: { in: ['active', 'pending_approval'] } },
            include: { department: true, designation: true },
            orderBy: { createdAt: 'desc' },
          }).catch(() => [])
        : Promise.resolve([]),

      // 3. Pending Transfers & Promotions
      canUserViewApprovalCategory(role, 'transfers')
        ? prisma.transferPromotionCase.findMany({
            where: { status: 'pending' },
            include: { employee: true },
            orderBy: { createdAt: 'desc' },
          }).catch(() => [])
        : Promise.resolve([]),

      // 4. Pending Payroll Runs
      canUserViewApprovalCategory(role, 'payroll')
        ? prisma.payrollRun.findMany({
            where: { status: { in: ['draft', 'calculated', 'verified', 'approved'] } },
            orderBy: { createdAt: 'desc' },
          }).catch(() => [])
        : Promise.resolve([]),

      // 5. Pending Exit Clearance Cases
      canUserViewApprovalCategory(role, 'exits')
        ? prisma.resignationExitCase.findMany({
            where: { fnfStatus: { in: ['pending', 'draft'] } },
            include: { employee: true },
            orderBy: { createdAt: 'desc' },
          }).catch(() => [])
        : Promise.resolve([]),

      // 6. Pending Holidays
      canUserViewApprovalCategory(role, 'holidays')
        ? prisma.companyHoliday.findMany({
            where: { status: 'proposed' },
            orderBy: { date: 'asc' },
          }).catch(() => [])
        : Promise.resolve([]),

      // 7. Pending Disciplinary Cases
      canUserViewApprovalCategory(role, 'disciplinary')
        ? prisma.disciplinaryCase.findMany({
            where: { currentStage: { in: ['show_cause_notice', 'investigation', 'hearing'] } },
            include: { employee: true },
            orderBy: { createdAt: 'desc' },
          }).catch(() => [])
        : Promise.resolve([]),
    ]);

    const pendingLeaves = leaves.map((l: any) => {
      const details = getApprovalItemDetails(l);
      const isOd = details.isOd;
      return {
        id: l.id,
        category: details.category,
        categoryTitle: details.categoryTitle,
        title: details.title,
        applicantName: l.employee ? `${l.employee.firstName} ${l.employee.lastName}` : 'Employee',
        applicantId: l.employee?.employeeCode || l.employeeId,
        details: `From ${l.fromDate ? (l.fromDate instanceof Date ? l.fromDate.toISOString().split('T')[0] : String(l.fromDate).split('T')[0]) : '—'} to ${l.toDate ? (l.toDate instanceof Date ? l.toDate.toISOString().split('T')[0] : String(l.toDate).split('T')[0]) : '—'} • Reason: ${l.reason || 'Personal'}`,
        date: l.createdAt ? (l.createdAt instanceof Date ? l.createdAt.toISOString() : String(l.createdAt)) : new Date().toISOString(),
        targetUrl: isOd ? '/leaves?tab=od_requests' : '/leaves',
        canApprove: canUserApproveCategory(role, 'leaves'),
        meta: { leaveType: l.leaveType, daysCount: Number(l.daysCount || 1), reason: l.reason, isOd },
        raw: l,
      };
    });

    const pendingRequisitions = reqs.map((r: any) => ({
      id: r.id,
      category: 'requisitions',
      categoryTitle: 'Job Requisition',
      title: `Manpower Requisition: ${r.title} (${r.headcount} Openings)`,
      applicantName: r.department?.name || 'Department Head',
      applicantId: r.department?.code || r.departmentId,
      details: `Experience: ${r.experienceMin}-${r.experienceMax} Yrs • Department: ${r.department?.name || 'General'}`,
      date: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
      targetUrl: '/recruitment',
      canApprove: canUserApproveCategory(role, 'requisitions'),
      meta: { headcount: r.headcount, experience: `${r.experienceMin}-${r.experienceMax} Yrs` },
      raw: r,
    }));

    const pendingTransfers = transfers.map((t: any) => ({
      id: t.id,
      category: 'transfers',
      categoryTitle: 'Transfer / Promotion',
      title: `${(t.type || 'Transfer').toUpperCase()}: ${t.newDesignation || 'New Designation'}`,
      applicantName: t.employee ? `${t.employee.firstName} ${t.employee.lastName}` : 'Employee',
      applicantId: t.employee?.employeeCode || t.employeeId,
      details: `${t.currentDepartment || 'Current Dept'} → ${t.newDepartment || 'New Dept'} • Initiated by: ${t.initiatedBy || 'HR'}`,
      date: t.createdAt ? t.createdAt.toISOString() : new Date().toISOString(),
      targetUrl: '/movement',
      canApprove: canUserApproveCategory(role, 'transfers'),
      meta: { type: t.type, currentRole: t.currentDesignation, proposedRole: t.newDesignation },
      raw: t,
    }));

    const pendingPayrollRuns = runs.map((p: any) => ({
      id: p.id,
      category: 'payroll',
      categoryTitle: 'Payroll Disbursal Run',
      title: `Payroll Disbursal Cycle (${p.monthYear})`,
      applicantName: `Calculated by ${p.calculatedBy || 'HR Head'}`,
      applicantId: p.calculatedBy || 'hr',
      details: `Total Employees: ${p.totalEmployees} • Gross: ₹${Number(p.totalGross || 0).toLocaleString()} • Net Pay: ₹${Number(p.totalNet || 0).toLocaleString()}`,
      date: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
      targetUrl: '/payroll',
      canApprove: canUserApproveCategory(role, 'payroll'),
      meta: { cycle: p.monthYear, headcount: p.totalEmployees },
      raw: p,
    }));

    const pendingExits = exits.map((e: any) => ({
      id: e.id,
      category: 'exits',
      categoryTitle: 'Resignation & Exit Clearance',
      title: `Resignation Exit: LWD ${e.lastWorkingDay ? e.lastWorkingDay.toISOString().split('T')[0] : '—'}`,
      applicantName: e.employee ? `${e.employee.firstName} ${e.employee.lastName}` : 'Employee',
      applicantId: e.employee?.employeeCode || e.employeeId,
      details: `Reason: ${e.reason} • F&F Settlement Amount: ₹${Number(e.fnfAmount || 0).toLocaleString()}`,
      date: e.createdAt ? e.createdAt.toISOString() : new Date().toISOString(),
      targetUrl: '/resignation',
      canApprove: canUserApproveCategory(role, 'exits'),
      meta: { reason: e.reason, fnfAmount: `₹${Number(e.fnfAmount || 0).toLocaleString()}` },
      raw: e,
    }));

    const pendingHolidays = holidays.map((h: any) => ({
      id: h.id,
      category: 'holidays',
      categoryTitle: 'Company Holiday Calendar',
      title: `Holiday Entry: ${h.title} (${h.date ? h.date.toISOString().split('T')[0] : '—'})`,
      applicantName: h.createdByName || 'HR Head',
      applicantId: h.createdById || 'hr',
      details: `Category: ${h.category} • Configured by ${h.createdByName || 'HR Head'}`,
      date: h.createdAt ? h.createdAt.toISOString() : new Date().toISOString(),
      targetUrl: '/leaves?tab=holidays',
      canApprove: canUserApproveCategory(role, 'holidays'),
      meta: { holidayTitle: h.title, category: h.category },
      raw: h,
    }));

    const pendingDisciplinary = discCases.map((dc: any) => ({
      id: dc.id,
      category: 'disciplinary',
      categoryTitle: 'Disciplinary Case Review',
      title: `Disciplinary Review: ${dc.caseNumber} (${(dc.violationType || 'Policy').toUpperCase()})`,
      applicantName: dc.employee ? `${dc.employee.firstName} ${dc.employee.lastName}` : 'Employee',
      applicantId: dc.employee?.employeeCode || dc.employeeId,
      details: `Severity: ${(dc.severity || 'Medium').toUpperCase()} • Reported By: ${dc.reportedBy || 'Compliance'} • ${dc.description || 'Action Pending'}`,
      date: dc.createdAt ? dc.createdAt.toISOString() : new Date().toISOString(),
      targetUrl: '/disciplinary',
      canApprove: canUserApproveCategory(role, 'disciplinary'),
      meta: { caseNumber: dc.caseNumber, violation: dc.violationType, severity: dc.severity },
      raw: dc,
    }));

    const allItems = [
      ...pendingLeaves,
      ...pendingRequisitions,
      ...pendingTransfers,
      ...pendingPayrollRuns,
      ...pendingExits,
      ...pendingHolidays,
      ...pendingDisciplinary,
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const counts = {
      all: allItems.length,
      leaves: pendingLeaves.length,
      requisitions: pendingRequisitions.length,
      transfers: pendingTransfers.length,
      payroll: pendingPayrollRuns.length,
      exits: pendingExits.length,
      holidays: pendingHolidays.length,
      disciplinary: pendingDisciplinary.length,
    };

    return NextResponse.json({
      success: true,
      data: {
        items: allItems,
        counts,
      },
    });
  } catch (error: any) {
    console.error('Error fetching pending approvals:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch pending approval items' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userCtx = await getApiUserContextAsync(req);
    const body = await req.json();
    const { itemId, category, action, rejectionReason } = body; // action: "approve" | "reject"

    if (!itemId || !category || !action) {
      return NextResponse.json({ success: false, error: 'Missing required approval fields' }, { status: 400 });
    }

    // Role-based action authorization check
    if (!canUserApproveCategory(userCtx.role, category as ApprovalCategory)) {
      return NextResponse.json(
        {
          success: false,
          error: `Access Denied: Role '${userCtx.role}' lacks authorization to approve or reject '${category}' requests.`,
        },
        { status: 403 }
      );
    }

    if (action === 'reject' && (!rejectionReason || !rejectionReason.trim())) {
      return NextResponse.json(
        { success: false, error: 'Mandatory rejection description / reason is required for cancellation.' },
        { status: 400 }
      );
    }

    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 503 });
    }

    let actionDetail = '';
    let updatedRecord: any = null;

    // 1. Process Leaves and Outdoor Duty
    if (category === 'leaves' || category === 'outdoor_duty') {
      const status = action === 'approve' ? 'approved' : 'rejected';
      const comment = action === 'approve' ? 'Approved by Approvals Hub' : `Rejected: ${rejectionReason}`;
      updatedRecord = await attendanceService.updateLeaveStatus(
        itemId,
        status,
        userCtx.employeeId || userCtx.userId,
        comment
      );
      actionDetail = action === 'approve'
        ? `Approved application for ${updatedRecord.leaveType}`
        : `Rejected application: ${rejectionReason}`;
    }
    // 2. Process Requisitions
    else if (category === 'requisitions') {
      const status = action === 'approve' ? 'approved' : 'rejected';
      updatedRecord = await prisma.jobRequisition.update({
        where: { id: itemId },
        data: { status },
      });
      actionDetail = action === 'approve'
        ? `Approved job requisition for ${updatedRecord.title}`
        : `Rejected job requisition: ${rejectionReason}`;
    }
    // 3. Process Transfers
    else if (category === 'transfers') {
      const status = action === 'approve' ? 'approved' : 'rejected';
      updatedRecord = await prisma.transferPromotionCase.update({
        where: { id: itemId },
        data: { status },
      });
      actionDetail = action === 'approve'
        ? `Approved transfer/promotion case ${updatedRecord.id}`
        : `Rejected transfer/promotion case: ${rejectionReason}`;
    }
    // 4. Process Payroll Runs
    else if (category === 'payroll') {
      const status = action === 'approve' ? 'approved' : 'draft';
      const user = await prisma.user.findFirst({
        where: { OR: [{ id: userCtx.userId }, { activeRole: userCtx.role }] },
      });
      updatedRecord = await prisma.payrollRun.update({
        where: { id: itemId },
        data: {
          status,
          approvedBy: action === 'approve' ? (user?.name || userCtx.employeeName || userCtx.userId) : null,
        } as any,
      });
      actionDetail = action === 'approve'
        ? `Approved payroll run ${updatedRecord.monthYear} for disbursement`
        : `Cancelled payroll run approval: ${rejectionReason}`;
    }
    // 5. Process Exit Cases
    else if (category === 'exits') {
      updatedRecord = await prisma.resignationExitCase.update({
        where: { id: itemId },
        data: {
          fnfStatus: action === 'approve' ? 'processed' : 'disputed',
        },
      });
      actionDetail = action === 'approve'
        ? `Approved exit clearance and F&F settlement for case ${itemId}`
        : `Rejected exit clearance: ${rejectionReason}`;
    }
    // 6. Process Company Holidays
    else if (category === 'holidays') {
      const user = await prisma.user.findFirst({
        where: { OR: [{ id: userCtx.userId }, { activeRole: userCtx.role }] },
      });
      updatedRecord = await prisma.companyHoliday.update({
        where: { id: itemId },
        data: {
          status: action === 'approve' ? 'approved' : 'rejected',
          approvedById: user?.id,
          approvedByName: userCtx.employeeName,
          approvedByRole: userCtx.role,
        },
      });
      actionDetail = action === 'approve'
        ? `Approved company holiday ${updatedRecord.title}`
        : `Rejected company holiday: ${rejectionReason}`;
    }
    // 7. Process Disciplinary Cases
    else if (category === 'disciplinary') {
      updatedRecord = await prisma.disciplinaryCase.update({
        where: { id: itemId },
        data: {
          currentStage: action === 'approve' ? 'closed' : 'action_taken',
          actionTaken: action === 'approve' ? 'written_warning' : 'exonerated',
        },
      });
      actionDetail = action === 'approve'
        ? `Closed disciplinary case ${updatedRecord.caseNumber} with formal warning`
        : `Exonerated / cancelled disciplinary notice: ${rejectionReason}`;
    }

    // Persist SHA-256 cryptographic chained Audit Log entry
    await auditService.logAction({
      userName: userCtx.employeeName || 'Approver',
      userRole: userCtx.role,
      action: action === 'approve' ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED',
      module: category,
      resourceId: itemId,
      payloadAfter: {
        action,
        detail: actionDetail,
        rejectionReason: action === 'reject' ? rejectionReason : undefined,
      },
    });

    // Invalidate server cache tags for immediate DB consistency
    serverCache.invalidateTags(['approvals', 'leaves', 'recruitment', 'payroll', 'dashboard', 'reports']);

    return NextResponse.json({
      success: true,
      message: action === 'approve'
        ? 'Request approved and audit log saved successfully'
        : 'Request cancelled and rejection reason logged in audit trail',
      data: { updatedRecord },
    });
  } catch (error: any) {
    console.error('Error processing approval action:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to process approval action' },
      { status: 500 }
    );
  }
}
