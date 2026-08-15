import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { authenticateApiRequest } from '@/lib/auth/rbac-guard-api';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await authenticateApiRequest(req, 'policy_compliance', 'read');
    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 503 });
    }

    const policy = await prisma.companyPolicy.findUnique({
      where: { id },
    });

    if (!policy) {
      return NextResponse.json({ success: false, error: 'Policy not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { policy } });
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
    const authResult = await authenticateApiRequest(req, 'policy_compliance', 'update');
    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 503 });
    }

    const body = await req.json();
    const { title, category, version, effectiveDate, content, status } = body;

    const updated = await prisma.companyPolicy.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(category && { category }),
        ...(version && { version }),
        ...(effectiveDate && { effectiveDate: new Date(effectiveDate) }),
        ...(content !== undefined && { content }),
        ...(status && { status }),
      },
    });

    // Record audit log for the policy update
    const org = await prisma.organization.findFirst();
    if (org) {
      await prisma.auditLog.create({
        data: {
          organizationId: org.id,
          userName: authResult.userCtx.employeeName || 'Marcus Chen',
          userRole: authResult.userCtx.role as any,
          action: 'POLICY_UPDATED',
          module: 'policy_compliance',
          resourceId: id,
          payloadAfter: { title: updated.title, version: updated.version, status: updated.status },
          integrityHash: `pol_upd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: 'Policy updated successfully in database',
      data: { policy: updated },
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
    const authResult = await authenticateApiRequest(req, 'policy_compliance', 'delete');
    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 503 });
    }

    const deleted = await prisma.companyPolicy.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Policy deleted successfully',
      data: { policy: deleted },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
