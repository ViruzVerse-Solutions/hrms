import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getApiUserContextAsync } from '@/lib/auth/rbac-guard-api';
import { auditService } from '@/services/audit.service';

export async function GET(req: NextRequest) {
  try {
    const userCtx = await getApiUserContextAsync(req);

    if (!prisma) {
      return NextResponse.json({
        success: true,
        data: {
          policyRef: 'HR-C&B-2026',
          status: 'approved',
          sanctionedBy: 'Dr. Vikramaditya Rathore (Managing Director)',
          sanctionedAt: new Date().toISOString(),
          frameworks: [
            {
              id: 'metro_tier1',
              name: 'Tier-1 Metro Corporate Grade',
              description: 'Applicable for Chennai, Bangalore, Mumbai & Delhi operations',
              basicPercent: 40,
              hraPercent: 50,
              conveyance: 1600,
              medical: 1250,
              pfPercent: 12,
              esiPercent: 0.75,
              gratuityPercent: 4.81,
              status: 'approved',
            },
            {
              id: 'plant_operations',
              name: 'Plant & Operations Grade',
              description: 'Applicable for Manufacturing Units & Warehouses',
              basicPercent: 50,
              hraPercent: 40,
              plantAllowance: 2000,
              attendanceIncentive: 1000,
              pfPercent: 12,
              esiPercent: 0.75,
              gratuityPercent: 4.81,
              status: 'approved',
            },
            {
              id: 'executive_leadership',
              name: 'Executive Leadership Grade',
              description: 'Applicable for Senior Executives & Department Heads',
              basicPercent: 40,
              hraPercent: 50,
              corporateNpsPercent: 10,
              pfPercent: 12,
              status: 'approved',
            },
          ],
        },
      });
    }

    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    // Query DB for Corporate Salary Structure Policy
    let policy = await prisma.companyPolicy.findFirst({
      where: {
        organizationId: org.id,
        category: 'compensation_structure',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!policy) {
      // Seed default active corporate compensation policy in DB
      policy = await prisma.companyPolicy.create({
        data: {
          organizationId: org.id,
          title: 'Corporate Salary Structure & Compensation Framework',
          category: 'compensation_structure',
          version: 'v2026.1',
          effectiveDate: new Date(),
          status: 'active',
          createdByName: 'HR Operations',
          createdByRole: 'hr_head',
          content: JSON.stringify({
            policyRef: 'HR-C&B-2026',
            status: 'approved',
            sanctionedBy: 'Dr. Vikramaditya Rathore (Managing Director)',
            sanctionedAt: new Date().toISOString(),
          }),
        },
      });
    }

    const parsedContent = policy.content ? JSON.parse(policy.content) : {};

    return NextResponse.json({
      success: true,
      data: {
        id: policy.id,
        policyRef: parsedContent.policyRef || 'HR-C&B-2026',
        status: policy.status === 'active' ? 'approved' : 'pending_approval',
        sanctionedBy: parsedContent.sanctionedBy || 'Managing Director',
        sanctionedAt: parsedContent.sanctionedAt || policy.updatedAt.toISOString(),
        version: policy.version,
        updatedAt: policy.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error fetching salary structure policy:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch salary structure' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userCtx = await getApiUserContextAsync(req);

    // Only HR Head or MD can propose structure revisions
    if (!['hr_head', 'managing_director'].includes(userCtx.role)) {
      return NextResponse.json(
        { success: false, error: `Access Denied: Role '${userCtx.role}' cannot propose compensation structures.` },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { policyRef, notes, frameworks } = body;

    if (!prisma) {
      return NextResponse.json({ success: true, message: 'Structure revision submitted to MD.' });
    }

    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    const updatedPolicy = await prisma.companyPolicy.create({
      data: {
        organizationId: org.id,
        title: `Compensation Policy Revision: ${policyRef || 'HR-C&B-2026'}`,
        category: 'compensation_structure',
        version: `v2026.${Date.now().toString().slice(-4)}`,
        effectiveDate: new Date(),
        status: 'draft', // Pending MD Approval
        createdByName: userCtx.employeeName || 'HR Head',
        createdByRole: 'hr_head',
        content: JSON.stringify({
          policyRef: policyRef || 'HR-C&B-2026',
          status: 'pending_approval',
          notes: notes || 'Revised statutory allowances and grade allocations',
          frameworks,
          submittedBy: userCtx.employeeName || 'HR Head',
          submittedAt: new Date().toISOString(),
        }),
      },
    });

    await auditService.logAction({
      userName: userCtx.employeeName || 'HR Head',
      userRole: userCtx.role,
      action: 'SALARY_STRUCTURE_REVISION_SUBMITTED',
      module: 'payroll_benefits',
      resourceId: updatedPolicy.id,
      payloadAfter: { policyRef, status: 'pending_approval' },
    });

    return NextResponse.json({
      success: true,
      data: updatedPolicy,
      message: 'Salary structure revision submitted to Managing Director for executive approval.',
    });
  } catch (error: any) {
    console.error('Error proposing structure revision:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to submit revision' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userCtx = await getApiUserContextAsync(req);

    // Only Managing Director or Chairman can sanction and approve salary structures
    if (!['managing_director', 'chairman'].includes(userCtx.role)) {
      return NextResponse.json(
        { success: false, error: `Access Denied: Only Managing Director or Board can sanction corporate salary policies.` },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { policyId, action } = body; // action: "approve" | "reject"

    if (!prisma) {
      return NextResponse.json({ success: true, message: 'Policy sanctioned by Managing Director.' });
    }

    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    // Find the latest policy
    const policy = policyId
      ? await prisma.companyPolicy.findUnique({ where: { id: policyId } })
      : await prisma.companyPolicy.findFirst({
          where: { organizationId: org.id, category: 'compensation_structure' },
          orderBy: { createdAt: 'desc' },
        });

    if (policy) {
      await prisma.companyPolicy.update({
        where: { id: policy.id },
        data: {
          status: action === 'reject' ? 'archived' : 'active',
          content: JSON.stringify({
            policyRef: 'HR-C&B-2026',
            status: action === 'reject' ? 'rejected' : 'approved',
            sanctionedBy: `${userCtx.employeeName || 'Executive'} (${userCtx.role.toUpperCase()})`,
            sanctionedAt: new Date().toISOString(),
          }),
        },
      });
    }

    await auditService.logAction({
      userName: userCtx.employeeName || 'Managing Director',
      userRole: userCtx.role,
      action: action === 'reject' ? 'SALARY_STRUCTURE_REJECTED' : 'SALARY_STRUCTURE_SANCTIONED',
      module: 'payroll_benefits',
      resourceId: policy?.id || 'policy_global',
      payloadAfter: { action, role: userCtx.role, status: 'active_sanctioned' },
    });

    return NextResponse.json({
      success: true,
      message: action === 'reject'
        ? 'Corporate salary structure rejected by executive authority.'
        : 'Corporate salary structure policy officially sanctioned and approved by Managing Director.',
    });
  } catch (error: any) {
    console.error('Error approving salary structure:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to approve salary structure' },
      { status: 500 }
    );
  }
}
