import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authenticateApiRequest } from '@/lib/auth/rbac-guard-api';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(req, 'disciplinary_actions', 'read');
    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ success: true, data: { cases: [] } });
    }

    const cases = await prisma.disciplinaryCase.findMany({
      where: { organizationId: org.id },
      include: { employee: true },
      orderBy: { createdAt: 'desc' },
    });

    const formattedCases = cases.map((c) => ({
      id: c.id,
      caseNumber: c.caseNumber,
      employeeId: c.employeeId,
      employeeName: c.employee ? `${c.employee.firstName} ${c.employee.lastName}` : 'Employee',
      violationType: c.violationType,
      incidentDate: c.incidentDate.toISOString().split('T')[0],
      reportedBy: c.reportedBy,
      severity: c.severity,
      currentStage: c.currentStage,
      actionTaken: c.actionTaken,
      createdAt: c.createdAt.toISOString().split('T')[0],
    }));

    return NextResponse.json({
      success: true,
      data: { cases: formattedCases },
    });
  } catch (error: any) {
    console.error('Error fetching disciplinary cases:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch disciplinary cases' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(req, 'disciplinary_actions', 'create');
    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const body = await req.json();
    const { employeeId, violationType, incidentDate, severity, description } = body;

    if (!employeeId || !violationType) {
      return NextResponse.json({ success: false, error: 'Missing required disciplinary fields' }, { status: 400 });
    }

    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    const caseCount = await prisma.disciplinaryCase.count({ where: { organizationId: org.id } });
    const caseNumber = `DC-${new Date().getFullYear()}-${String(caseCount + 1).padStart(3, '0')}`;

    const newCase = await prisma.disciplinaryCase.create({
      data: {
        organizationId: org.id,
        caseNumber,
        employeeId,
        violationType,
        incidentDate: incidentDate ? new Date(incidentDate) : new Date(),
        reportedBy: authResult.userCtx.employeeName || 'Supervisor',
        severity: severity || 'medium',
        currentStage: 'show_cause_notice',
        description: description || '',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Show Cause Notice / Disciplinary Case registered successfully',
      data: { case: newCase },
    });
  } catch (error: any) {
    console.error('Error creating disciplinary case:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create disciplinary case' },
      { status: 500 }
    );
  }
}
