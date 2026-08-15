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

    const newCase = await prisma.transferPromotionCase.create({
      data: {
        organizationId: org.id,
        employeeId,
        type: type || 'promotion',
        currentDepartment: currentDepartment || 'Quality Assurance',
        newDepartment,
        currentDesignation: currentDesignation || 'Chemist',
        newDesignation,
        currentBranch: currentBranch || 'HQ',
        newBranch: newBranch || currentBranch || 'HQ',
        effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
        initiatedBy: authResult.userCtx.employeeName || 'HR Operations',
        status: 'pending',
        approvalChain: [authResult.userCtx.employeeName || 'HR Head', 'Managing Director'],
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
