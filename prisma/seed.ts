import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Viruzverse HRM Database Seed...');

  try {
    // Clean up dynamic tables to avoid duplicate key conflicts or connection drops
    await prisma.candidate.deleteMany().catch(() => {});
    await prisma.jobRequisition.deleteMany().catch(() => {});
    await prisma.payslip.deleteMany().catch(() => {});
    await prisma.payrollRun.deleteMany().catch(() => {});
    await prisma.attendanceRecord.deleteMany().catch(() => {});
    await prisma.leaveRequest.deleteMany().catch(() => {});
    await prisma.performanceReview.deleteMany().catch(() => {});
    await prisma.grievanceTicket.deleteMany().catch(() => {});
    await prisma.auditLog.deleteMany().catch(() => {});

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

    const branchHyd = await prisma.branch.upsert({
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

    // 5. Seed Core Personas / Employees
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

    const empObjMap: Record<string, any> = {};

    for (const emp of employeesData) {
      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.firstName + ' ' + emp.lastName)}&background=4f46e5&color=ffffff`;

      const employee = await prisma.employee.upsert({
        where: { employeeCode: emp.code },
        update: { avatarUrl },
        create: {
          organizationId: org.id,
          employeeCode: emp.code,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          phone: emp.phone,
          avatarUrl,
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
      empObjMap[emp.code] = employee;

      // Create User account
      await prisma.user.upsert({
        where: { email: emp.email },
        update: { avatarUrl },
        create: {
          organizationId: org.id,
          email: emp.email,
          name: `${emp.firstName} ${emp.lastName}`,
          avatarUrl,
          passwordHash: '$2b$10$dummyhashedpasswordforlivemvpseed123',
          roles: [emp.role],
          activeRole: emp.role,
          employeeId: employee.id,
        },
      });

      // Seed Bank Details
      await prisma.bankDetails.upsert({
        where: { employeeId: employee.id },
        update: {},
        create: {
          employeeId: employee.id,
          accountNumber: '91802004512984',
          accountName: `${emp.firstName} ${emp.lastName}`,
          bankName: 'HDFC Bank Ltd',
          ifscCode: 'HDFC0000240',
          branchName: 'MG Road Bengaluru',
          pan: 'ABCDE1234F',
        },
      });

      // Seed Statutory Info
      await prisma.statutoryInfo.upsert({
        where: { employeeId: employee.id },
        update: {},
        create: {
          employeeId: employee.id,
          pfNumber: 'KN/BLR/0049201/000/1001',
          uan: '101294810293',
          esiNumber: '31004918270001',
          ptState: 'Karnataka',
          lwfNumber: 'LWF-KA-2026-94',
        },
      });

      // Seed Leave Allocations (Casual, Sick, Earned)
      const leaveTypes = [
        { type: 'casual' as const, allocated: 12, used: 3, pending: 2, balance: 7 },
        { type: 'sick' as const, allocated: 10, used: 2, pending: 0, balance: 8 },
        { type: 'earned' as const, allocated: 15, used: 4, pending: 0, balance: 11 },
      ];

      for (const lt of leaveTypes) {
        await prisma.leaveAllocation.upsert({
          where: {
            employeeId_leaveType_year: {
              employeeId: employee.id,
              leaveType: lt.type,
              year: 2026,
            },
          },
          update: {},
          create: {
            employeeId: employee.id,
            leaveType: lt.type,
            year: 2026,
            allocatedDays: lt.allocated,
            usedDays: lt.used,
            pendingDays: lt.pending,
            balanceDays: lt.balance,
          },
        });
      }
    }
    console.log('✅ Personas, Users, Bank, Statutory & Allocations seeded');

    // Link Manager Relationships
    await prisma.employee.update({
      where: { employeeCode: 'VV-1005' }, // Ananya reports to Dr. Vikramaditya
      data: { reportingManagerId: empObjMap['VV-1004'].id },
    });
    await prisma.employee.update({
      where: { employeeCode: 'VV-1002' }, // Priya reports to Eleanor
      data: { reportingManagerId: empObjMap['VV-1001'].id },
    });
    await prisma.employee.update({
      where: { employeeCode: 'VV-1003' }, // Marcus reports to Eleanor
      data: { reportingManagerId: empObjMap['VV-1001'].id },
    });

    // 6. Seed Sample Leave Requests
    const sampleLeaves = [
      {
        employeeId: empObjMap['VV-1005'].id,
        leaveType: 'casual' as const,
        fromDate: new Date('2026-08-20'),
        toDate: new Date('2026-08-21'),
        daysCount: 2,
        reason: 'Personal family event in Pune',
        status: 'pending' as const,
        approverId: empObjMap['VV-1004'].id,
      },
      {
        employeeId: empObjMap['VV-1002'].id,
        leaveType: 'sick' as const,
        fromDate: new Date('2026-08-05'),
        toDate: new Date('2026-08-06'),
        daysCount: 2,
        reason: 'Viral flu and doctor advised rest',
        status: 'approved' as const,
        approverId: empObjMap['VV-1001'].id,
        approverComment: 'Approved. Get well soon!',
      },
      {
        employeeId: empObjMap['VV-1003'].id,
        leaveType: 'earned' as const,
        fromDate: new Date('2026-07-10'),
        toDate: new Date('2026-07-14'),
        daysCount: 5,
        reason: 'Annual vacation leave',
        status: 'approved' as const,
        approverId: empObjMap['VV-1001'].id,
      },
    ];

    for (const lr of sampleLeaves) {
      await prisma.leaveRequest.create({
        data: lr,
      });
    }
    console.log('✅ Leave requests seeded');

    // 7. Seed Attendance Records for past 5 days + today
    const today = new Date();
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      for (const empCode of ['VV-1001', 'VV-1002', 'VV-1003', 'VV-1004', 'VV-1005']) {
        const emp = empObjMap[empCode];
        await prisma.attendanceRecord.upsert({
          where: {
            employeeId_date: {
              employeeId: emp.id,
              date: new Date(dateStr),
            },
          },
          update: {},
          create: {
            employeeId: emp.id,
            date: new Date(dateStr),
            inTime: new Date(`${dateStr}T09:00:00Z`),
            outTime: new Date(`${dateStr}T17:30:00Z`),
            totalHours: 8.5,
            status: 'present',
            source: 'web_checkin',
          },
        });
      }
    }
    console.log('✅ Attendance records seeded');

    // 8. Seed Payroll Runs & Payslips (July 2026 Disbursed & August 2026 Review)
    const runJuly = await prisma.payrollRun.upsert({
      where: {
        organizationId_monthYear: {
          organizationId: org.id,
          monthYear: 'July 2026',
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        monthYear: 'July 2026',
        periodStart: new Date('2026-07-01'),
        periodEnd: new Date('2026-07-31'),
        totalEmployees: 5,
        totalGross: 840000,
        totalDeductions: 112000,
        totalNet: 728000,
        status: 'disbursed',
        calculatedBy: 'Marcus Chen',
        approvedBy: 'Eleanor Vance',
      },
    });

    const runAug = await prisma.payrollRun.upsert({
      where: {
        organizationId_monthYear: {
          organizationId: org.id,
          monthYear: 'August 2026',
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        monthYear: 'August 2026',
        periodStart: new Date('2026-08-01'),
        periodEnd: new Date('2026-08-31'),
        totalEmployees: 5,
        totalGross: 840000,
        totalDeductions: 112000,
        totalNet: 728000,
        status: 'calculated',
        calculatedBy: 'Marcus Chen',
      },
    });

    for (const empCode of ['VV-1001', 'VV-1002', 'VV-1003', 'VV-1004', 'VV-1005']) {
      const emp = empObjMap[empCode];
      const monthlyCtc = Math.round(Number(emp.ctc) / 12);
      const basic = Math.round(monthlyCtc * 0.4);
      const hra = Math.round(basic * 0.5);
      const conveyance = 1600;
      const medical = 1250;
      const special = Math.max(0, monthlyCtc - (basic + hra + conveyance + medical));
      const gross = basic + hra + special + conveyance + medical;
      const pf = Math.min(1800, Math.round(basic * 0.12));
      const esi = gross <= 21000 ? Math.round(gross * 0.0075) : 0;
      const pt = gross > 15000 ? 200 : 0;
      const tds = Math.round(gross * 0.08);
      const totalDed = pf + esi + pt + tds;
      const net = gross - totalDed;

      // Payslip for July 2026
      await prisma.payslip.upsert({
        where: {
          payrollRunId_employeeId: {
            payrollRunId: runJuly.id,
            employeeId: emp.id,
          },
        },
        update: {},
        create: {
          payrollRunId: runJuly.id,
          employeeId: emp.id,
          period: 'July 2026',
          basicSalary: basic,
          hra: hra,
          specialAllowance: special,
          conveyance: conveyance,
          medical: medical,
          grossEarnings: gross,
          pfDeduction: pf,
          esiDeduction: esi,
          professionalTax: pt,
          incomeTaxTds: tds,
          totalDeductions: totalDed,
          netPay: net,
          paymentMode: 'Bank Transfer (HDFC NEFT)',
          paymentStatus: 'Disbursed',
        },
      });

      // Payslip for August 2026
      await prisma.payslip.upsert({
        where: {
          payrollRunId_employeeId: {
            payrollRunId: runAug.id,
            employeeId: emp.id,
          },
        },
        update: {},
        create: {
          payrollRunId: runAug.id,
          employeeId: emp.id,
          period: 'August 2026',
          basicSalary: basic,
          hra: hra,
          specialAllowance: special,
          conveyance: conveyance,
          medical: medical,
          grossEarnings: gross,
          pfDeduction: pf,
          esiDeduction: esi,
          professionalTax: pt,
          incomeTaxTds: tds,
          totalDeductions: totalDed,
          netPay: net,
          paymentMode: 'Bank Transfer (HDFC NEFT)',
          paymentStatus: 'Calculated',
        },
      });
    }
    console.log('✅ Payroll runs & payslips seeded');

    // 9. Seed ATS Job Requisitions & Candidates
    const reqQc = await prisma.jobRequisition.create({
      data: {
        organizationId: org.id,
        departmentId: deptMap['dept_qc'],
        designationId: desigMap['des_qc_sr'],
        title: 'Senior Analytical Chemist & QC Specialist',
        headcount: 2,
        status: 'active',
        experienceMin: 4,
        experienceMax: 8,
        budgetMin: 1200000,
        budgetMax: 1900000,
      },
    });

    const reqProd = await prisma.jobRequisition.create({
      data: {
        organizationId: org.id,
        departmentId: deptMap['dept_prod'],
        designationId: desigMap['des_prod_eng'],
        title: 'Batch Operations Process Engineer',
        headcount: 3,
        status: 'active',
        experienceMin: 3,
        experienceMax: 6,
        budgetMin: 1000000,
        budgetMax: 1600000,
      },
    });

    const candidatesData = [
      {
        jobRequisitionId: reqQc.id,
        candidateCode: 'CAN-2026-081',
        name: 'Devraj Mukherjee',
        email: 'devraj.mukherjee@gmail.com',
        phone: '+91 98112 33445',
        stage: 'technical_eval' as const,
        experienceYears: 6.5,
        currentCtc: 1200000,
        expectedCtc: 1650000,
        rating: 4.8,
        matchScore: 92,
        interviewerName: 'Dr. Vikramaditya Rathore',
      },
      {
        jobRequisitionId: reqQc.id,
        candidateCode: 'CAN-2026-082',
        name: 'Siddharth Varma',
        email: 'siddharth.v@outlook.com',
        phone: '+91 97223 44556',
        stage: 'shortlisted' as const,
        experienceYears: 5.0,
        currentCtc: 1100000,
        expectedCtc: 1450000,
        rating: 4.2,
        matchScore: 86,
        interviewerName: 'Priya Sharma',
      },
      {
        jobRequisitionId: reqProd.id,
        candidateCode: 'CAN-2026-083',
        name: 'Kavita Sundaram',
        email: 'kavita.s@yahoo.com',
        phone: '+91 96334 55667',
        stage: 'offered' as const,
        experienceYears: 7.2,
        currentCtc: 1400000,
        expectedCtc: 1800000,
        rating: 4.9,
        matchScore: 95,
        interviewerName: 'Eleanor Vance',
      },
      {
        jobRequisitionId: reqProd.id,
        candidateCode: 'CAN-2026-084',
        name: 'Rohan Mehta',
        email: 'rohan.mehta@gmail.com',
        phone: '+91 95445 66778',
        stage: 'applied' as const,
        experienceYears: 3.5,
        currentCtc: 900000,
        expectedCtc: 1200000,
        rating: 4.0,
        matchScore: 78,
      },
    ];

    for (const cand of candidatesData) {
      await prisma.candidate.create({
        data: cand,
      });
    }
    console.log('✅ ATS requisitions & candidates seeded');

    // 10. Seed Performance Reviews
    for (const empCode of ['VV-1002', 'VV-1003', 'VV-1005']) {
      const emp = empObjMap[empCode];
      await prisma.performanceReview.create({
        data: {
          employeeId: emp.id,
          cycleName: 'FY2025-26 Annual Appraisal',
          selfRating: 4.5,
          managerRating: 4.7,
          finalRating: 4.6,
          kraScore: 94.2,
          nineBoxGrid: 'High Potential - Star Contributor',
          status: 'completed',
          completedAt: new Date('2026-03-31'),
        },
      });
    }
    console.log('✅ Performance reviews seeded');

    // 11. Seed Grievances & Audit Logs
    await prisma.grievanceTicket.create({
      data: {
        employeeId: empObjMap['VV-1005'].id,
        category: 'work_environment',
        subject: 'Analytical Lab HVAC calibration request',
        description: 'Temperature fluctuation in Instrument Room B requires facilities check.',
        isAnonymous: false,
        priority: 'medium',
        status: 'open',
        assignedTo: 'Plant Engineering & Utilities',
      },
    });

    const sampleAuditLogs = [
      {
        organizationId: org.id,
        userName: 'Eleanor Vance',
        userRole: 'hr_admin' as const,
        action: 'EMPLOYEE_RECORD_UPDATED',
        module: 'employee_records',
        payloadAfter: { note: 'Updated promotion stage to Performance Calibration for Ananya Deshmukh' },
        integrityHash: 'a8f9c1b2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0',
        ipAddress: '192.168.1.45',
      },
      {
        organizationId: org.id,
        userName: 'Marcus Chen',
        userRole: 'payroll_officer' as const,
        action: 'PAYROLL_RUN_CALCULATED',
        module: 'payroll_benefits',
        payloadAfter: { note: 'Generated August 2026 payroll batch calculation with statutory PF/ESI rates' },
        integrityHash: 'b9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0a8f9c1b2d3e4f5a6b7c8',
        ipAddress: '192.168.1.88',
      },
    ];

    for (const log of sampleAuditLogs) {
      await prisma.auditLog.create({
        data: log,
      });
    }
    console.log('✅ Grievances & Audit Logs seeded');

    console.log('🎉 Full Viruzverse HRM seed completed successfully!');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('❌ Seed execution failed:', e);
});
