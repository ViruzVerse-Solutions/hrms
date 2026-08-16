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
      employmentStatus: { not: 'terminated' },
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

    const includeRelations = {
      department: true,
      designation: true,
      branch: true,
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
        orderBy: { date: 'desc' as const },
      },
      leaveRequests: {
        take: 5,
        orderBy: { fromDate: 'desc' as const },
      },
      payslips: {
        take: 6,
        orderBy: { createdAt: 'desc' as const },
      },
    };

    let emp: any = await prisma.employee.findFirst({
      where: {
        OR: [
          { id },
          { employeeCode: id },
          { employeeCode: { equals: id, mode: 'insensitive' } },
        ],
        employmentStatus: { not: 'terminated' },
      },
      include: includeRelations,
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
            employmentStatus: { not: 'terminated' },
          },
          include: includeRelations,
        });
      }
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

    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: 'Viruzverse Solutions',
          code: 'VV-ORG',
        },
      });
    }

    // 1. Resolve Department
    let deptId = data.departmentId;
    if (!deptId) {
      const firstDept = await prisma.department.findFirst({ where: { organizationId: org.id } });
      if (firstDept) {
        deptId = firstDept.id;
      } else {
        const createdDept = await prisma.department.create({
          data: {
            organizationId: org.id,
            name: 'Operations & Quality',
            code: 'OPS-QUAL',
          },
        });
        deptId = createdDept.id;
      }
    }

    // 2. Resolve Designation
    let desigId = data.designationId;
    if (!desigId) {
      const title = data.designationTitle || 'Staff Member';
      let desig = await prisma.designation.findFirst({
        where: {
          organizationId: org.id,
          title: { equals: title, mode: 'insensitive' },
        },
      });
      if (!desig) {
        desig = await prisma.designation.findFirst({
          where: {
            organizationId: org.id,
            departmentId: deptId,
          },
        });
      }
      if (!desig) {
        desig = await prisma.designation.create({
          data: {
            organizationId: org.id,
            departmentId: deptId,
            title: title,
            code: (title.toUpperCase().replace(/\s+/g, '_').slice(0, 10) + '_' + Math.floor(100 + Math.random() * 900)),
          },
        });
      }
      desigId = desig.id;
    }

    // 3. Resolve Branch
    let branchId = data.branchId;
    if (!branchId) {
      let branch = await prisma.branch.findFirst({ where: { organizationId: org.id } });
      if (!branch) {
        branch = await prisma.branch.create({
          data: {
            organizationId: org.id,
            name: 'Corporate HQ & Plant 1',
            code: 'HQ-PLANT1',
            city: 'Chennai',
            state: 'Tamil Nadu',
            isHeadquarters: true,
          },
        });
      }
      branchId = branch.id;
    }

    const employeeCode = data.employeeCode || `VV-${Math.floor(1000 + Math.random() * 9000)}`;

    const newEmp = await prisma.employee.create({
      data: {
        organization: { connect: { id: org.id } },
        department: { connect: { id: deptId } },
        designation: { connect: { id: desigId } },
        branch: { connect: { id: branchId } },
        employeeCode,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || '',
        gender: (data.gender as any) || 'other',
        dob: data.dob ? new Date(data.dob) : new Date(),
        dateOfJoining: data.dateOfJoining ? new Date(data.dateOfJoining) : new Date(),
        reportingManager: data.reportingManagerId ? { connect: { id: data.reportingManagerId } } : undefined,
        employmentStatus: (data.employmentStatus as any) || 'probation',
        currentLifecycleStage: 'onboarding',
        ctc: data.ctc ? Number(data.ctc) : 0,
        accountNumber: data.accountNumber || null,
        bankName: data.bankName || null,
        ifscCode: data.ifscCode || null,
        pan: data.pan || null,
        pfNumber: data.pfNumber || null,
        uan: data.uan || null,
        esiNumber: data.esiNumber || null,
        emergencyContactName: data.emergencyContactName || null,
        emergencyContactPhone: data.emergencyContactPhone || null,
        emergencyContactRelation: data.emergencyContactRelation || null,
      },
      include: {
        department: true,
        designation: true,
        branch: true,
      },
    });

    if (data.accountNumber && data.pan && (prisma as any).bankDetails) {
      await (prisma as any).bankDetails.create({
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

    let designationId = data.designationId;
    if (!designationId && data.designationTitle) {
      const existing = await prisma.employee.findUnique({ where: { id }, select: { organizationId: true, departmentId: true } });
      if (existing) {
        let desig = await prisma.designation.findFirst({
          where: { organizationId: existing.organizationId, title: { equals: data.designationTitle, mode: 'insensitive' } },
        });
        if (!desig) {
          desig = await prisma.designation.create({
            data: {
              organizationId: existing.organizationId,
              departmentId: data.departmentId || existing.departmentId,
              title: data.designationTitle,
              code: (data.designationTitle.toUpperCase().replace(/\s+/g, '_').slice(0, 10) + '_' + Math.floor(100 + Math.random() * 900)),
            },
          });
        }
        designationId = desig.id;
      }
    }

    return prisma.employee.update({
      where: { id },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.email && { email: data.email }),
        ...(data.phone && { phone: data.phone }),
        ...(data.gender && { gender: data.gender as any }),
        ...(data.dob && { dob: new Date(data.dob) }),
        ...(data.dateOfJoining && { dateOfJoining: new Date(data.dateOfJoining) }),
        ...(data.departmentId && { departmentId: data.departmentId }),
        ...(designationId && { designationId }),
        ...(data.branchId && { branchId: data.branchId }),
        ...(data.reportingManagerId !== undefined && { reportingManagerId: data.reportingManagerId }),
        ...(data.employmentStatus && { employmentStatus: data.employmentStatus }),
        ...(data.currentLifecycleStage && { currentLifecycleStage: data.currentLifecycleStage }),
        ...(data.ctc !== undefined && { ctc: Number(data.ctc) }),
        ...(data.accountNumber !== undefined && { accountNumber: data.accountNumber }),
        ...(data.bankName !== undefined && { bankName: data.bankName }),
        ...(data.ifscCode !== undefined && { ifscCode: data.ifscCode }),
        ...(data.pan !== undefined && { pan: data.pan }),
        ...(data.pfNumber !== undefined && { pfNumber: data.pfNumber }),
        ...(data.uan !== undefined && { uan: data.uan }),
        ...(data.esiNumber !== undefined && { esiNumber: data.esiNumber }),
        ...(data.emergencyContactName !== undefined && { emergencyContactName: data.emergencyContactName }),
        ...(data.emergencyContactPhone !== undefined && { emergencyContactPhone: data.emergencyContactPhone }),
        ...(data.emergencyContactRelation !== undefined && { emergencyContactRelation: data.emergencyContactRelation }),
      },
      include: {
        department: true,
        designation: true,
        branch: true,
      },
    });
  },

  async softDelete(id: string) {
    if (!prisma) throw new Error('Database unavailable');

    return prisma.employee.update({
      where: { id },
      data: { employmentStatus: 'terminated' },
    });
  },
};
