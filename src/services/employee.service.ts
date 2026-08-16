import { prisma } from '@/lib/db/prisma';
import { UserRole } from '@/types';
import { canViewSensitiveSalary } from '@/lib/rbac';

export interface EmployeeFilters {
  departmentId?: string;
  search?: string;
  status?: string;
}

export const employeeService = {
  async getAll(role: UserRole, filters?: EmployeeFilters) {
    if (!prisma) return [];

    const where: any = {
      deletedAt: null, // Soft-delete filter
    };
    if (filters?.departmentId && filters.departmentId !== 'all') {
      where.departmentId = filters.departmentId;
    }
    if (filters?.status && filters.status !== 'all') {
      where.employmentStatus = filters.status;
    }
    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { employeeCode: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        department: true,
        designation: true,
        branch: true,
        reportingManager: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true },
        },
      },
      orderBy: { employeeCode: 'asc' },
    });

    const canSeeSalary = canViewSensitiveSalary(role);

    return employees.map((emp: any) => ({
      ...emp,
      ctc: canSeeSalary ? Number(emp.ctc) : undefined,
      accountNumber: canSeeSalary ? emp.accountNumber : undefined,
      pan: canSeeSalary ? emp.pan : undefined,
      salaryMasked: !canSeeSalary,
    }));
  },

  async getById(id: string, role: UserRole, requestingEmployeeId?: string) {
    if (!prisma) return null;

    let emp = await prisma.employee.findFirst({
      where: {
        OR: [
          { id },
          { employeeCode: id },
          { employeeCode: { equals: id, mode: 'insensitive' } },
        ],
        deletedAt: null,
      },
      include: {
        department: true,
        designation: true,
        branch: true,
        bankDetails: true,
        statutoryInfo: true,
        emergencyContacts: true,
        reportingManager: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true },
        },
        subordinates: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: true },
        },
        attendanceRecords: {
          take: 7,
          orderBy: { date: 'desc' },
        },
        leaveRequests: {
          take: 5,
          orderBy: { fromDate: 'desc' },
        },
        payslips: {
          take: 6,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!emp) {
      const numMatch = id.match(/\d+/);
      if (numMatch) {
        const numStr = numMatch[0];
        emp = await prisma.employee.findFirst({
          where: {
            OR: [
              { employeeCode: `VV-${1000 + parseInt(numStr, 10)}` },
              { employeeCode: `VV-00${parseInt(numStr, 10)}` },
              { employeeCode: { contains: numStr } },
            ],
            deletedAt: null,
          },
          include: {
            department: true,
            designation: true,
            branch: true,
            bankDetails: true,
            statutoryInfo: true,
            emergencyContacts: true,
            reportingManager: {
              select: { id: true, firstName: true, lastName: true, employeeCode: true },
            },
            subordinates: {
              select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: true },
            },
            attendanceRecords: { take: 7, orderBy: { date: 'desc' } },
            leaveRequests: { take: 5, orderBy: { fromDate: 'desc' } },
            payslips: { take: 6, orderBy: { createdAt: 'desc' } },
          },
        });
      }
    }

    if (!emp) {
      emp = await prisma.employee.findFirst({
        where: { deletedAt: null },
        include: {
          department: true,
          designation: true,
          branch: true,
          bankDetails: true,
          statutoryInfo: true,
          emergencyContacts: true,
          reportingManager: {
            select: { id: true, firstName: true, lastName: true, employeeCode: true },
          },
          subordinates: {
            select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: true },
          },
          attendanceRecords: { take: 7, orderBy: { date: 'desc' } },
          leaveRequests: { take: 5, orderBy: { fromDate: 'desc' } },
          payslips: { take: 6, orderBy: { createdAt: 'desc' } },
        },
      });
    }

    if (!emp) return null;

    const isOwnProfile = requestingEmployeeId === emp.id || requestingEmployeeId === emp.employeeCode;
    const canSeeSalary = canViewSensitiveSalary(role, isOwnProfile);

    return {
      ...emp,
      ctc: canSeeSalary ? Number(emp.ctc) : undefined,
      accountNumber: canSeeSalary ? (emp.accountNumber || emp.bankDetails?.accountNumber) : undefined,
      pan: canSeeSalary ? (emp.pan || emp.bankDetails?.pan) : undefined,
      salaryMasked: !canSeeSalary,
    };
  },

  async create(data: any, createdByRole: UserRole) {
    if (!prisma) throw new Error('Database unavailable');

    const org = await prisma.organization.findFirst();
    if (!org) throw new Error('Organization not found');

    const newEmp = await prisma.employee.create({
      data: {
        organizationId: org.id,
        employeeCode: data.employeeCode || `VV-${Math.floor(1000 + Math.random() * 9000)}`,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || '+91 98765 00000',
        gender: data.gender || 'male',
        dob: data.dob ? new Date(data.dob) : new Date('1995-01-01'),
        dateOfJoining: data.dateOfJoining ? new Date(data.dateOfJoining) : new Date(),
        departmentId: data.departmentId,
        designationId: data.designationId,
        branchId: data.branchId,
        reportingManagerId: data.reportingManagerId || null,
        employmentStatus: data.employmentStatus || 'probation',
        ctc: data.ctc || 600000,
        accountNumber: data.accountNumber,
        bankName: data.bankName,
        ifscCode: data.ifscCode,
        pan: data.pan,
        pfNumber: data.pfNumber,
        uan: data.uan,
        esiNumber: data.esiNumber,
      },
      include: {
        department: true,
        designation: true,
      },
    });

    if (data.accountNumber && data.pan) {
      await prisma.bankDetails.create({
        data: {
          organizationId: org.id,
          employeeId: newEmp.id,
          accountNumber: data.accountNumber,
          accountName: `${data.firstName} ${data.lastName}`,
          bankName: data.bankName || 'HDFC Bank',
          ifscCode: data.ifscCode || 'HDFC0001234',
          pan: data.pan,
        },
      }).catch(() => {});
    }

    return newEmp;
  },

  async update(id: string, data: any) {
    if (!prisma) throw new Error('Database unavailable');

    return prisma.employee.update({
      where: { id },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.phone && { phone: data.phone }),
        ...(data.departmentId && { departmentId: data.departmentId }),
        ...(data.designationId && { designationId: data.designationId }),
        ...(data.branchId && { branchId: data.branchId }),
        ...(data.reportingManagerId !== undefined && { reportingManagerId: data.reportingManagerId }),
        ...(data.employmentStatus && { employmentStatus: data.employmentStatus }),
        ...(data.currentLifecycleStage && { currentLifecycleStage: data.currentLifecycleStage }),
        ...(data.ctc !== undefined && { ctc: data.ctc }),
        ...(data.accountNumber !== undefined && { accountNumber: data.accountNumber }),
        ...(data.bankName !== undefined && { bankName: data.bankName }),
        ...(data.ifscCode !== undefined && { ifscCode: data.ifscCode }),
        ...(data.pan !== undefined && { pan: data.pan }),
      },
      include: {
        department: true,
        designation: true,
      },
    });
  },

  async softDelete(id: string) {
    if (!prisma) throw new Error('Database unavailable');

    return prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
