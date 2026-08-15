import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { authenticateApiRequest } from '@/lib/auth/rbac-guard-api';

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(req, 'disciplinary_actions', 'read');
    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    if (!prisma) {
      return NextResponse.json({ success: true, data: { cases: [] } });
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

    const formattedCases = (cases || []).map((c: any) => {
      let incidentDateStr = new Date().toISOString().split('T')[0];
      if (c.incidentDate) {
        if (c.incidentDate instanceof Date) {
          incidentDateStr = c.incidentDate.toISOString().split('T')[0];
        } else if (typeof c.incidentDate === 'string') {
          incidentDateStr = c.incidentDate.split('T')[0];
        }
      }

      let createdAtStr = new Date().toISOString().split('T')[0];
      if (c.createdAt) {
        if (c.createdAt instanceof Date) {
          createdAtStr = c.createdAt.toISOString().split('T')[0];
        } else if (typeof c.createdAt === 'string') {
          createdAtStr = c.createdAt.split('T')[0];
        }
      }

      return {
        id: c.id,
        caseNumber: c.caseNumber || `DC-2026-${c.id.slice(-3)}`,
        employeeId: c.employeeId,
        employeeName: c.employee ? `${c.employee.firstName} ${c.employee.lastName}` : 'Employee',
        violationType: c.violationType || 'breach_of_policy',
        incidentDate: incidentDateStr,
        reportedBy: c.reportedBy || 'Plant Supervisor',
        severity: c.severity || 'medium',
        currentStage: c.currentStage || 'show_cause_notice',
        actionTaken: c.actionTaken || '',
        description: c.description || '',
        createdAt: createdAtStr,
      };
    });

    return NextResponse.json({
      success: true,
      data: { cases: formattedCases },
    });
  } catch (error: any) {
    console.error('Error fetching disciplinary cases:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch disciplinary cases', data: { cases: [] } },
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

    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 503 });
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
      { success: false, error: error?.message || 'Failed to create disciplinary case' },
      { status: 500 }
    );
  }
}
