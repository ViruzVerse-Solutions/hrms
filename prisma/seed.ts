import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Viruzverse HRM Database Seed...');

  try {
    // 1. Create Organization
    const org = await prisma.organization.upsert({
      where: { code: 'VV' },
      update: {},
      create: {
        name: 'Viruzverse Solutions Private Limited',
        code: 'VV',
        domain: 'viruzverse.com',
        taxId: 'AAACV1234F',
      },
    });
    console.log(`✅ Organization created: ${org.name}`);

    // 2. Create Branches
    const branchBlr = await prisma.branch.upsert({
      where: { code: 'BR_BLR' },
      update: {},
      create: {
        organizationId: org.id,
        name: 'Tech Operations Center (HQ)',
        code: 'BR_BLR',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'India',
        isHeadquarters: true,
      },
    });

    await prisma.branch.upsert({
      where: { code: 'BR_HYD' },
      update: {},
      create: {
        organizationId: org.id,
        name: 'Central Complex (Campus 2)',
        code: 'BR_HYD',
        city: 'Hyderabad',
        state: 'Telangana',
        country: 'India',
        isHeadquarters: false,
      },
    });
    console.log('✅ Branches seeded');

    // 3. Create Departments
    const deptMap: Record<string, string> = {};
    const departmentsData = [
      { code: 'dept_hr', name: 'Human Resources & Industrial Relations' },
      { code: 'dept_qc', name: 'Quality Assurance & Analytical Lab' },
      { code: 'dept_prod', name: 'Production & Manufacturing Ops' },
      { code: 'dept_eng', name: 'Plant Engineering & Utilities' },
      { code: 'dept_fin', name: 'Finance, Costing & Accounts' },
    ];

    for (const dept of departmentsData) {
      const d = await prisma.department.upsert({
        where: { code: dept.code },
        update: {},
        create: {
          organizationId: org.id,
          name: dept.name,
          code: dept.code,
        },
      });
      deptMap[dept.code] = d.id;
    }
    console.log('✅ Departments seeded');

    // 4. Create Designations
    const designationsData = [
      { code: 'des_hr_dir', title: 'VP of Human Resources & IR', deptCode: 'dept_hr' },
      { code: 'des_hr_exec', title: 'HR Operations & Compliance Officer', deptCode: 'dept_hr' },
      { code: 'des_fin_lead', title: 'Principal Payroll & Plant Cost Lead', deptCode: 'dept_fin' },
      { code: 'des_qc_dir', title: 'VP of Quality & Process Standards', deptCode: 'dept_qc' },
      { code: 'des_qc_sr', title: 'Senior Analytical Chemist & QC Lead', deptCode: 'dept_qc' },
      { code: 'des_prod_eng', title: 'Process & Batch Operations Engineer', deptCode: 'dept_prod' },
    ];

    const desigMap: Record<string, string> = {};
    for (const des of designationsData) {
      const d = await prisma.designation.upsert({
        where: { code: des.code },
        update: {},
        create: {
          organizationId: org.id,
          departmentId: deptMap[des.deptCode],
          title: des.title,
          code: des.code,
        },
      });
      desigMap[des.code] = d.id;
    }
    console.log('✅ Designations seeded');

    // 5. Seed Core Personas
    const employeesData = [
      {
        code: 'VV-1001',
        firstName: 'Eleanor',
        lastName: 'Vance',
        email: 'eleanor.vance@viruzverse.com',
        phone: '+91 98765 43210',
        gender: 'female' as const,
        deptCode: 'dept_hr',
        desigCode: 'des_hr_dir',
        ctc: 3200000,
        role: 'hr_admin' as const,
      },
      {
        code: 'VV-1002',
        firstName: 'Priya',
        lastName: 'Sharma',
        email: 'priya.sharma@viruzverse.com',
        phone: '+91 98765 43211',
        gender: 'female' as const,
        deptCode: 'dept_hr',
        desigCode: 'des_hr_exec',
        ctc: 950000,
        role: 'hr_executive' as const,
      },
      {
        code: 'VV-1003',
        firstName: 'Marcus',
        lastName: 'Chen',
        email: 'marcus.chen@viruzverse.com',
        phone: '+91 98765 43212',
        gender: 'male' as const,
        deptCode: 'dept_fin',
        desigCode: 'des_fin_lead',
        ctc: 2100000,
        role: 'payroll_officer' as const,
      },
      {
        code: 'VV-1004',
        firstName: 'Dr. Vikramaditya',
        lastName: 'Rathore',
        email: 'vikram.rathore@viruzverse.com',
        phone: '+91 98765 43213',
        gender: 'male' as const,
        deptCode: 'dept_qc',
        desigCode: 'des_qc_dir',
        ctc: 4800000,
        role: 'reporting_manager' as const,
      },
      {
        code: 'VV-1005',
        firstName: 'Ananya',
        lastName: 'Deshmukh',
        email: 'ananya.deshmukh@viruzverse.com',
        phone: '+91 98765 43214',
        gender: 'female' as const,
        deptCode: 'dept_qc',
        desigCode: 'des_qc_sr',
        ctc: 1850000,
        role: 'employee' as const,
      },
    ];

    for (const emp of employeesData) {
      const employee = await prisma.employee.upsert({
        where: { employeeCode: emp.code },
        update: {},
        create: {
          organizationId: org.id,
          employeeCode: emp.code,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          phone: emp.phone,
          gender: emp.gender,
          dob: new Date('1990-01-01'),
          dateOfJoining: new Date('2023-01-15'),
          departmentId: deptMap[emp.deptCode],
          designationId: desigMap[emp.desigCode],
          branchId: branchBlr.id,
          employmentStatus: 'active',
          currentLifecycleStage: 'performance',
          ctc: emp.ctc,
        },
      });

      // Create User account
      await prisma.user.upsert({
        where: { email: emp.email },
        update: {},
        create: {
          organizationId: org.id,
          email: emp.email,
          name: `${emp.firstName} ${emp.lastName}`,
          passwordHash: '$2b$10$dummyhashedpasswordforlivemvpseed123',
          roles: [emp.role],
          activeRole: emp.role,
          employeeId: employee.id,
        },
      });

      // Seed Leave Allocations (Casual, Sick, Earned)
      await prisma.leaveAllocation.upsert({
        where: {
          employeeId_leaveType_year: {
            employeeId: employee.id,
            leaveType: 'casual',
            year: 2026,
          },
        },
        update: {},
        create: {
          employeeId: employee.id,
          leaveType: 'casual',
          year: 2026,
          allocatedDays: 12,
          usedDays: 3,
          pendingDays: 2,
          balanceDays: 7,
        },
      });
    }
    console.log('✅ Personas, Users & Leave Allocations seeded successfully');
    console.log('🎉 Seed completed! Database is demo-ready.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('❌ Seed execution failed:', e);
});
