import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authenticateApiRequest } from '@/lib/auth/rbac-guard-api';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(req, 'policy_compliance', 'read');
    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ success: true, data: { policies: [] } });
    }

    const policies = await prisma.companyPolicy.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: 'desc' },
    });

    const totalEmployees = await prisma.employee.count({
      where: { organizationId: org.id, employmentStatus: { in: ['active', 'probation'] } },
    });

    const formattedPolicies = policies.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      version: p.version,
      effectiveDate: p.effectiveDate.toISOString().split('T')[0],
      acknowledgedCount: p.acknowledgedCount,
      totalEmployees: totalEmployees || 110,
      status: p.status,
      fileUrl: p.fileUrl || '#',
      createdByName: p.createdByName,
      createdByRole: p.createdByRole,
    }));

    return NextResponse.json({
      success: true,
      data: {
        policies: formattedPolicies,
        totalEmployees,
      },
    });
  } catch (error: any) {
    console.error('Error fetching compliance policies:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch compliance policies' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(req, 'policy_compliance', 'create');
    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const body = await req.json();
    const { title, category, version, effectiveDate, content } = body;

    if (!title || !category || !version) {
      return NextResponse.json({ success: false, error: 'Missing required policy fields' }, { status: 400 });
    }

    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    const newPolicy = await prisma.companyPolicy.create({
      data: {
        organizationId: org.id,
        title,
        category,
        version: version.startsWith('v') ? version : `v${version}`,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
        content: content || '',
        createdById: authResult.userCtx.userId,
        createdByName: authResult.userCtx.employeeName || 'HR Policy Admin',
        createdByRole: authResult.userCtx.role,
        status: 'active',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Company policy published successfully',
      data: { policy: newPolicy },
    });
  } catch (error: any) {
    console.error('Error publishing compliance policy:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to publish compliance policy' },
      { status: 500 }
    );
  }
}
