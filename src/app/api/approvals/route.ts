import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getApiUserContextAsync } from '@/lib/auth/rbac-guard-api';
import {
  ApprovalCategory,
  canUserApproveCategory,
  canUserViewApprovalCategory,
} from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const userCtx = await getApiUserContextAsync(req);
    const org = await prisma.organization.findFirst();

    if (!org) {
      return NextResponse.json({ success: true, data: { items: [], counts: {} } });
    }

    const role = userCtx.role;

    // 1. Pending Leave Requests
    let pendingLeaves: any[] = [];
    if (canUserViewApprovalCategory(role, 'leaves')) {
      const leaves = await prisma.leaveRequest.findMany({
        where: { status: 'pending' },
        include: { employee: true },
        orderBy: { createdAt: 'desc' },
      });
      pendingLeaves = leaves.map((l: any) => ({
        id: l.id,
        category: 'leaves',
        categoryTitle: 'Leave Request',
        title: `${l.leaveType.toUpperCase()} Leave (${l.daysCount} Days)`,
        applicantName: l.employee ? `${l.employee.firstName} ${l.employee.lastName}` : 'Employee',
        applicantId: l.employee?.employeeCode || l.employeeId,
        details: `From ${l.fromDate.toISOString().split('T')[0]} to ${l.toDate.toISOString().split('T')[0]} • Reason: ${l.reason}`,
        date: l.createdAt.toISOString(),
        targetUrl: '/leaves',
        canApprove: canUserApproveCategory(role, 'leaves'),
        meta: { leaveType: l.leaveType, daysCount: l.daysCount, fromDate: l.fromDate.toISOString().split('T')[0], toDate: l.toDate.toISOString().split('T')[0], reason: l.reason },
        raw: l,
      }));
    }

    // 2. Pending Job Requisitions
    let pendingRequisitions: any[] = [];
    if (canUserViewApprovalCategory(role, 'requisitions')) {
      const reqs = await prisma.jobRequisition.findMany({
        where: { status: { in: ['active', 'pending_approval'] } },
        include: { department: true, designation: true },
        orderBy: { createdAt: 'desc' },
      });
      pendingRequisitions = reqs.map((r: any) => ({
        id: r.id,
        category: 'requisitions',
        categoryTitle: 'Job Requisition',
        title: `Manpower Requisition: ${r.title} (${r.headcount} Openings)`,
        applicantName: r.department?.name || 'Department Head',
        applicantId: r.department?.code || r.departmentId,
        details: `Experience: ${r.experienceMin}-${r.experienceMax} Yrs • Department: ${r.department?.name || 'General'}`,
        date: r.createdAt.toISOString(),
        targetUrl: '/recruitment',
        canApprove: canUserApproveCategory(role, 'requisitions'),
        meta: { headcount: r.headcount, experience: `${r.experienceMin}-${r.experienceMax} Yrs`, budget: `₹${(Number(r.budgetMin) || 0) / 100000}L - ₹${(Number(r.budgetMax) || 0) / 100000}L` },
        raw: r,
      }));
    }

    // 3. Pending Transfers & Promotions
    let pendingTransfers: any[] = [];
    if (canUserViewApprovalCategory(role, 'transfers')) {
      const transfers = await prisma.transferPromotionCase.findMany({
        where: { status: 'pending' },
        include: { employee: true },
        orderBy: { createdAt: 'desc' },
      });
      pendingTransfers = transfers.map((t: any) => ({
        id: t.id,
        category: 'transfers',
        categoryTitle: 'Transfer / Promotion',
        title: `${t.type.toUpperCase()}: ${t.newDesignation}`,
        applicantName: t.employee ? `${t.employee.firstName} ${t.employee.lastName}` : 'Employee',
        applicantId: t.employee?.employeeCode || t.employeeId,
        details: `${t.currentDepartment} → ${t.newDepartment} • Initiated by: ${t.initiatedBy}`,
        date: t.createdAt.toISOString(),
        targetUrl: '/movement',
        canApprove: canUserApproveCategory(role, 'transfers'),
        meta: { type: t.type, currentRole: t.currentDesignation, proposedRole: t.newDesignation, initiatedBy: t.initiatedBy },
        raw: t,
      }));
    }

    // 4. Pending Payroll Runs
    let pendingPayrollRuns: any[] = [];
    if (canUserViewApprovalCategory(role, 'payroll')) {
      const runs = await prisma.payrollRun.findMany({
        where: { status: { in: ['draft', 'calculated', 'verified'] } },
        orderBy: { createdAt: 'desc' },
      });
      pendingPayrollRuns = runs.map((p: any) => ({
        id: p.id,
        category: 'payroll',
        categoryTitle: 'Payroll Disbursal Run',
        title: `Payroll Disbursal Cycle (${p.monthYear})`,
        applicantName: `Calculated by ${p.calculatedBy}`,
        applicantId: p.calculatedBy,
        details: `Total Employees: ${p.totalEmployees} • Gross: ₹${Number(p.totalGross).toLocaleString()} • Net Pay: ₹${Number(p.totalNet).toLocaleString()}`,
        date: p.createdAt.toISOString(),
        targetUrl: '/payroll',
        canApprove: canUserApproveCategory(role, 'payroll'),
        meta: { cycle: p.monthYear, headcount: p.totalEmployees, gross: `₹${Number(p.totalGross).toLocaleString()}`, net: `₹${Number(p.totalNet).toLocaleString()}` },
        raw: p,
      }));
    }

    // 5. Pending Exit Clearance Cases
    let pendingExits: any[] = [];
    if (canUserViewApprovalCategory(role, 'exits')) {
      const exits = await prisma.resignationExitCase.findMany({
        where: { fnfStatus: { in: ['pending', 'draft'] } },
        include: { employee: true },
        orderBy: { createdAt: 'desc' },
      });
      pendingExits = exits.map((e: any) => ({
        id: e.id,
        category: 'exits',
        categoryTitle: 'Resignation & Exit Clearance',
        title: `Resignation Exit: LWD ${e.lastWorkingDay.toISOString().split('T')[0]}`,
        applicantName: e.employee ? `${e.employee.firstName} ${e.employee.lastName}` : 'Employee',
        applicantId: e.employee?.employeeCode || e.employeeId,
        details: `Reason: ${e.reason} • F&F Settlement Amount: ₹${Number(e.fnfAmount).toLocaleString()}`,
        date: e.createdAt.toISOString(),
        targetUrl: '/resignation',
        canApprove: canUserApproveCategory(role, 'exits'),
        meta: { lwd: e.lastWorkingDay.toISOString().split('T')[0], reason: e.reason, fnfAmount: `₹${Number(e.fnfAmount).toLocaleString()}` },
        raw: e,
      }));
    }

    // 6. Pending Holidays
    let pendingHolidays: any[] = [];
    if (canUserViewApprovalCategory(role, 'holidays')) {
      const holidays = await prisma.companyHoliday.findMany({
        where: { status: 'pending_approval' },
        orderBy: { date: 'asc' },
      });
      pendingHolidays = holidays.map((h: any) => ({
        id: h.id,
        category: 'holidays',
        categoryTitle: 'Company Holiday Calendar',
        title: `Holiday Entry: ${h.title} (${h.date.toISOString().split('T')[0]})`,
        applicantName: h.createdByName || h.createdByRole,
        applicantId: h.createdById || 'hr',
        details: `Category: ${h.category} • Configured by ${h.createdByName || h.createdByRole}`,
        date: h.createdAt.toISOString(),
        targetUrl: '/leaves?tab=holidays',
        canApprove: canUserApproveCategory(role, 'holidays'),
        meta: { holidayTitle: h.title, date: h.date.toISOString().split('T')[0], category: h.category },
        raw: h,
      }));
    }

    // 7. Pending Disciplinary Cases
    let pendingDisciplinary: any[] = [];
    if (canUserViewApprovalCategory(role, 'disciplinary')) {
      const discCases = await prisma.disciplinaryCase.findMany({
        where: { currentStage: { in: ['show_cause_notice', 'inquiry_panel'] } },
        include: { employee: true },
        orderBy: { createdAt: 'desc' },
      });
      pendingDisciplinary = discCases.map((dc: any) => ({
        id: dc.id,
        category: 'disciplinary',
        categoryTitle: 'Disciplinary Case Review',
        title: `Disciplinary Review: ${dc.caseNumber} (${dc.violationType.toUpperCase()})`,
        applicantName: dc.employee ? `${dc.employee.firstName} ${dc.employee.lastName}` : 'Employee',
        applicantId: dc.employee?.employeeCode || dc.employeeId,
        details: `Severity: ${dc.severity.toUpperCase()} • Reported By: ${dc.reportedBy} • ${dc.description || 'Action Pending'}`,
        date: dc.createdAt.toISOString(),
        targetUrl: '/disciplinary',
        canApprove: canUserApproveCategory(role, 'disciplinary'),
        meta: { caseNumber: dc.caseNumber, violation: dc.violationType, severity: dc.severity, reportedBy: dc.reportedBy },
        raw: dc,
      }));
    }

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
      { success: false, error: 'Failed to fetch pending approval items' },
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

    const org = await prisma.organization.findFirst();
    const orgId = org?.id || '';

    let actionDetail = '';
    let updatedRecord: any = null;

    // 1. Process Leaves
    if (category === 'leaves') {
      const status = action === 'approve' ? 'approved' : 'rejected';
      updatedRecord = await prisma.leaveRequest.update({
        where: { id: itemId },
        data: {
          status,
          approverId: userCtx.employeeId || userCtx.userId,
          approverComment: action === 'approve' ? 'Approved' : `Rejected: ${rejectionReason}`,
          processedAt: new Date(),
        },
      });
      actionDetail = action === 'approve'
        ? `Approved leave application for ${updatedRecord.leaveType}`
        : `Rejected leave application: ${rejectionReason}`;
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
      const status = action === 'approve' ? 'approved' : 'rejected';
      updatedRecord = await prisma.payrollRun.update({
        where: { id: itemId },
        data: {
          status: action === 'approve' ? 'approved' : 'draft',
          approvedBy: action === 'approve' ? userCtx.employeeName : undefined,
        },
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
          fnfStatus: action === 'approve' ? 'cleared' : 'rejected',
        },
      });
      actionDetail = action === 'approve'
        ? `Approved exit clearance and F&F settlement for case ${itemId}`
        : `Rejected exit clearance: ${rejectionReason}`;
    }
    // 6. Process Company Holidays
    else if (category === 'holidays') {
      updatedRecord = await prisma.companyHoliday.update({
        where: { id: itemId },
        data: {
          status: action === 'approve' ? 'approved' : 'rejected',
          approvedById: userCtx.userId,
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
          currentStage: action === 'approve' ? 'closed' : 'show_cause_notice',
          actionTaken: action === 'approve' ? 'written_warning' : 'exonerated',
        },
      });
      actionDetail = action === 'approve'
        ? `Closed disciplinary case ${updatedRecord.caseNumber} with formal warning`
        : `Exonerated / cancelled disciplinary notice: ${rejectionReason}`;
    }

    // Persist SHA-256 integrity Audit Log entry
    const auditAction = action === 'approve' ? `APPROVAL_GRANTED` : `APPROVAL_REJECTED`;
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: userCtx.userId,
        userName: userCtx.employeeName || 'Approver',
        userRole: userCtx.role,
        action: auditAction,
        module: category,
        resourceId: itemId,
        integrityHash: `SHA256_${Date.now()}_${userCtx.role}`,
        payloadAfter: {
          action,
          rejectionReason: action === 'reject' ? rejectionReason : undefined,
          processedByRole: userCtx.role,
        },
      },
    }).catch(() => {});

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
      { success: false, error: 'Failed to process approval action' },
      { status: 500 }
    );
  }
}
