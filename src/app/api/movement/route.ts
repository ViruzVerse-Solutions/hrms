import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { authenticateApiRequest } from '@/lib/auth/rbac-guard-api';

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(req, 'transfer_promotion', 'read');
    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ success: true, data: { transfers: [] } });
    }

    const cases = await prisma.transferPromotionCase.findMany({
      where: { organizationId: org.id },
      include: { employee: true },
      orderBy: { createdAt: 'desc' },
    });

    const formattedCases = cases.map((c: any) => ({
      id: c.id,
      employeeId: c.employeeId,
      employeeName: c.employee ? `${c.employee.firstName} ${c.employee.lastName}` : 'Employee',
      type: c.type,
      currentDepartment: c.currentDepartment,
      newDepartment: c.newDepartment,
      currentDesignation: c.currentDesignation,
      newDesignation: c.newDesignation,
      currentBranch: c.currentBranch,
      newBranch: c.newBranch,
      effectiveDate: c.effectiveDate.toISOString().split('T')[0],
      initiatedBy: c.initiatedBy,
      status: c.status,
      approvalChain: c.approvalChain,
    }));

    return NextResponse.json({
      success: true,
      data: { transfers: formattedCases },
    });
  } catch (error: any) {
    console.error('Error fetching transfer & promotion cases:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transfer/promotion cases' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(req, 'transfer_promotion', 'create');
    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const body = await req.json();
    const {
      employeeId,
      type,
      currentDepartment,
      newDepartment,
      currentDesignation,
      newDesignation,
      currentBranch,
      newBranch,
      effectiveDate,
    } = body;

    if (!employeeId || !type || !newDepartment || !newDesignation) {
      return NextResponse.json({ success: false, error: 'Missing required transfer fields' }, { status: 400 });
    }

    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    const depts = await prisma.department.findMany();
    const desigs = await prisma.designation.findMany();
    const branches = await prisma.branch.findMany();
    const user = await prisma.user.findFirst();

    const currDeptId = depts.find((d: any) => d.name === currentDepartment || d.id === currentDepartment)?.id || depts[0]?.id || '';
    const newDeptId = depts.find((d: any) => d.name === newDepartment || d.id === newDepartment)?.id || depts[0]?.id || '';
    const currDesigId = desigs.find((d: any) => d.title === currentDesignation || d.id === currentDesignation)?.id || desigs[0]?.id || '';
    const newDesigId = desigs.find((d: any) => d.title === newDesignation || d.id === newDesignation)?.id || desigs[0]?.id || '';
    const currBranchId = branches.find((b: any) => b.name === currentBranch || b.id === currentBranch)?.id || branches[0]?.id || '';
    const newBranchId = branches.find((b: any) => b.name === newBranch || b.id === newBranch)?.id || currBranchId;

    const newCase = await prisma.transferPromotionCase.create({
      data: {
        organizationId: org.id,
        employeeId,
        type: type || 'promotion',
        currentDepartmentId: currDeptId,
        newDepartmentId: newDeptId,
        currentDesignationId: currDesigId,
        newDesignationId: newDesigId,
        currentBranchId: currBranchId,
        newBranchId: newBranchId,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
        initiatedById: authResult.userCtx.userId || user?.id || '',
        status: 'pending',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Transfer/Promotion case initiated successfully',
      data: { transfer: newCase },
    });
  } catch (error: any) {
    console.error('Error initiating transfer/promotion:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initiate transfer/promotion' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(req, 'transfer_promotion', 'approve');
    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const body = await req.json();
    const { transferId, action } = body; // action: "approve" | "reject"

    if (!transferId) {
      return NextResponse.json({ success: false, error: 'Missing transferId' }, { status: 400 });
    }

    const updated = await prisma.transferPromotionCase.update({
      where: { id: transferId },
      data: {
        status: action === 'approve' ? 'approved' : 'rejected',
      },
    });

    return NextResponse.json({
      success: true,
      message: `Transfer/Promotion case marked as ${updated.status}`,
      data: { transfer: updated },
    });
  } catch (error: any) {
    console.error('Error updating transfer status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update transfer status' },
      { status: 500 }
    );
  }
}

