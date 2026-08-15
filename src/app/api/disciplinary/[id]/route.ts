import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { authenticateApiRequest } from '@/lib/auth/rbac-guard-api';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await authenticateApiRequest(req, 'disciplinary_actions', 'read');
    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 503 });
    }

    const discCase = await prisma.disciplinaryCase.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!discCase) {
      return NextResponse.json({ success: false, error: 'Case not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { case: discCase } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await authenticateApiRequest(req, 'disciplinary_actions', 'update');
    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 503 });
    }

    const body = await req.json();
    const { currentStage, actionTaken, description, severity } = body;

    const updated = await prisma.disciplinaryCase.update({
      where: { id },
      data: {
        ...(currentStage && { currentStage }),
        ...(actionTaken !== undefined && { actionTaken }),
        ...(description !== undefined && { description }),
        ...(severity && { severity }),
      },
      include: { employee: true },
    });

    // Record audit trail in database
    const org = await prisma.organization.findFirst();
    if (org) {
      await prisma.auditLog.create({
        data: {
          organizationId: org.id,
          userName: authResult.userCtx.employeeName || 'Marcus Chen',
          userRole: authResult.userCtx.role as any,
          action: 'DISCIPLINARY_CASE_UPDATED',
          module: 'disciplinary_actions',
          resourceId: id,
          payloadAfter: { caseNumber: updated.caseNumber, currentStage: updated.currentStage, actionTaken: updated.actionTaken },
          integrityHash: `dc_upd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: 'Disciplinary case stage updated successfully in database',
      data: { case: updated },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await authenticateApiRequest(req, 'disciplinary_actions', 'delete');
    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 503 });
    }

    const deleted = await prisma.disciplinaryCase.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Disciplinary case removed',
      data: { case: deleted },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
