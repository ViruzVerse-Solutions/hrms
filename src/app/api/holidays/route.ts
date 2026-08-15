import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authenticateApiRequest } from '@/lib/auth/rbac-guard-api';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(req, 'attendance_leave', 'read');
    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ success: true, data: { holidays: [] } });
    }

    const holidays = await prisma.companyHoliday.findMany({
      where: { organizationId: org.id },
      orderBy: { date: 'asc' },
    });

    const formattedHolidays = holidays.map((h) => ({
      id: h.id,
      title: h.title,
      date: h.date.toISOString().split('T')[0],
      dayOfWeek: h.dayOfWeek,
      category: h.category,
      branchId: h.branchId,
      description: h.description,
      status: h.status,
      createdByName: h.createdByName,
      createdByRole: h.createdByRole,
      approvedByName: h.approvedByName,
      approvedByRole: h.approvedByRole,
      year: h.year,
    }));

    return NextResponse.json({
      success: true,
      data: {
        holidays: formattedHolidays,
        totalCount: formattedHolidays.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching holiday calendar:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch holiday calendar' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(req, 'attendance_leave', 'create');
    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const body = await req.json();
    const { title, date, category, description } = body;

    if (!title || !date) {
      return NextResponse.json({ success: false, error: 'Missing required holiday fields (title, date)' }, { status: 400 });
    }

    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    const holidayDate = new Date(date);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = dayNames[holidayDate.getUTCDay()];

    // Executive roles automatically approve upon creation, HR/Compliance creates in pending_approval state
    const isExecutive = ['managing_director', 'chairman'].includes(authResult.userCtx.role);
    const status = isExecutive ? 'approved' : 'pending_approval';

    const newHoliday = await prisma.companyHoliday.create({
      data: {
        organizationId: org.id,
        title,
        date: holidayDate,
        dayOfWeek,
        category: category || 'mandatory',
        description: description || '',
        status,
        createdById: authResult.userCtx.userId,
        createdByName: authResult.userCtx.employeeName || 'HR Operations',
        createdByRole: authResult.userCtx.role,
        approvedByName: isExecutive ? authResult.userCtx.employeeName : undefined,
        approvedByRole: isExecutive ? authResult.userCtx.role : undefined,
        year: holidayDate.getFullYear(),
      },
    });

    return NextResponse.json({
      success: true,
      message: isExecutive ? 'Holiday published & approved' : 'Holiday configured & sent for executive approval',
      data: { holiday: newHoliday },
    });
  } catch (error: any) {
    console.error('Error configuring company holiday:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to configure company holiday' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(req, 'attendance_leave', 'approve');
    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const body = await req.json();
    const { holidayId, action } = body; // action: "approve" | "reject"

    if (!holidayId) {
      return NextResponse.json({ success: false, error: 'Missing holidayId' }, { status: 400 });
    }

    const updatedHoliday = await prisma.companyHoliday.update({
      where: { id: holidayId },
      data: {
        status: action === 'approve' ? 'approved' : 'rejected',
        approvedById: authResult.userCtx.userId,
        approvedByName: authResult.userCtx.employeeName || 'Managing Director',
        approvedByRole: authResult.userCtx.role,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Holiday status updated to '${updatedHoliday.status}' by ${authResult.userCtx.role}`,
      data: { holiday: updatedHoliday },
    });
  } catch (error: any) {
    console.error('Error approving holiday:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to approve holiday' },
      { status: 500 }
    );
  }
}
