import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Viruzverse HRM Database Seed...');

  try {
    // 0. Clean up all tables in reverse dependency order for a fresh, clean database
    console.log('🧹 Purging existing database tables...');
    await prisma.notification.deleteMany().catch(() => {});
    await prisma.companyHoliday.deleteMany().catch(() => {});
    await prisma.companyPolicy.deleteMany().catch(() => {});
    await prisma.transferPromotionCase.deleteMany().catch(() => {});
    await prisma.disciplinaryCase.deleteMany().catch(() => {});
    await prisma.auditLog.deleteMany().catch(() => {});
    await prisma.grievanceTicket.deleteMany().catch(() => {});
    await prisma.resignationExitCase.deleteMany().catch(() => {});
    await prisma.trainingProgram.deleteMany().catch(() => {});
    await prisma.performanceReview.deleteMany().catch(() => {});
    await prisma.candidate.deleteMany().catch(() => {});
    await prisma.jobRequisition.deleteMany().catch(() => {});
    await prisma.payslip.deleteMany().catch(() => {});
    await prisma.payrollRun.deleteMany().catch(() => {});
    await prisma.attendanceRecord.deleteMany().catch(() => {});
    await prisma.leaveRequest.deleteMany().catch(() => {});
    await prisma.leaveAllocation.deleteMany().catch(() => {});
    await prisma.emergencyContact.deleteMany().catch(() => {});
    await prisma.statutoryInfo.deleteMany().catch(() => {});
    await prisma.bankDetails.deleteMany().catch(() => {});
    await prisma.userSession.deleteMany().catch(() => {});
    await prisma.user.deleteMany().catch(() => {});
    await prisma.employee.deleteMany().catch(() => {});
    await prisma.designation.deleteMany().catch(() => {});
    await prisma.department.deleteMany().catch(() => {});
    await prisma.branch.deleteMany().catch(() => {});
    await prisma.organization.deleteMany().catch(() => {});
    console.log('✅ Database purged cleanly');

    // 1. Create Organization
    const org = await prisma.organization.create({
      data: {
        name: 'Viruzverse Solutions Private Limited',
        code: 'VV',
        domain: 'viruzverse.com',
        taxId: 'AAACV1234F',
      },
    });
    console.log(`✅ Organization created: ${org.name}`);

    // 2. Create Branches
    const branchBlr = await prisma.branch.create({
      data: {
        organizationId: org.id,
        name: 'Tech Operations Center (HQ)',
        code: 'BR_BLR',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'India',
        isHeadquarters: true,
      },
    });

    const branchHyd = await prisma.branch.create({
      data: {
        organizationId: org.id,
        name: 'Central Manufacturing Complex (Campus 2)',
        code: 'BR_HYD',
        city: 'Hyderabad',
        state: 'Telangana',
        country: 'India',
        isHeadquarters: false,
      },
    });
    console.log('✅ Branches seeded');

    // 3. Create Departments
    const departmentsData = [
      { code: 'dept_exec', name: 'Executive Board & Governance' },
      { code: 'dept_hr', name: 'Human Resources & Industrial Relations' },
      { code: 'dept_qc', name: 'Quality Assurance & Analytical Lab' },
      { code: 'dept_prod', name: 'Production & Manufacturing Ops' },
      { code: 'dept_fin', name: 'Finance, Internal Audit & Costing' },
      { code: 'dept_legal', name: 'Statutory Compliance & EHS' },
    ];

    const deptMap: Record<string, string> = {};
    for (const dept of departmentsData) {
      const d = await prisma.department.create({
        data: {
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
      { code: 'des_chair', title: 'Chairman of the Board', deptCode: 'dept_exec' },
      { code: 'des_md', title: 'Managing Director & CEO', deptCode: 'dept_exec' },
      { code: 'des_hr_head', title: 'Head of Human Resources & IR', deptCode: 'dept_hr' },
      { code: 'des_audit_head', title: 'Head of Internal Audit & Compliance', deptCode: 'dept_fin' },
      { code: 'des_comp_head', title: 'Head of Compliance & Statutory Affairs', deptCode: 'dept_legal' },
      { code: 'des_qc_sr', title: 'Senior Analytical Chemist & QC Specialist', deptCode: 'dept_qc' },
      { code: 'des_prod_eng', title: 'Process & Batch Operations Engineer', deptCode: 'dept_prod' },
    ];

    const desigMap: Record<string, string> = {};
    for (const des of designationsData) {
      const d = await prisma.designation.create({
        data: {
          organizationId: org.id,
          departmentId: deptMap[des.deptCode],
          title: des.title,
          code: des.code,
        },
      });
      desigMap[des.code] = d.id;
    }
    console.log('✅ Designations seeded');

    // 5. Seed Core Personas / Employees (All 6 Roles)
    const employeesData = [
      {
        code: 'VV-1000',
        firstName: 'Alexander',
        lastName: 'Sterling',
        email: 'alexander.sterling@viruzverse.com',
        phone: '+91 98765 43209',
        gender: 'male' as const,
        deptCode: 'dept_exec',
        desigCode: 'des_chair',
        ctc: 9600000,
        role: 'chairman' as const,
      },
      {
        code: 'VV-1004',
        firstName: 'Dr. Vikramaditya',
        lastName: 'Rathore',
        email: 'vikram.rathore@viruzverse.com',
        phone: '+91 98765 43213',
        gender: 'male' as const,
        deptCode: 'dept_exec',
        desigCode: 'des_md',
        ctc: 7200000,
        role: 'managing_director' as const,
      },
      {
        code: 'VV-1001',
        firstName: 'Eleanor',
        lastName: 'Vance',
        email: 'eleanor.vance@viruzverse.com',
        phone: '+91 98765 43210',
        gender: 'female' as const,
        deptCode: 'dept_hr',
        desigCode: 'des_hr_head',
        ctc: 3600000,
        role: 'hr_head' as const,
      },
      {
        code: 'VV-1003',
        firstName: 'Marcus',
        lastName: 'Chen',
        email: 'marcus.chen@viruzverse.com',
        phone: '+91 98765 43212',
        gender: 'male' as const,
        deptCode: 'dept_fin',
        desigCode: 'des_audit_head',
        ctc: 3200000,
        role: 'internal_audit_head' as const,
      },
      {
        code: 'VV-1002',
        firstName: 'Rajeshwari',
        lastName: 'Nair',
        email: 'rajeshwari.nair@viruzverse.com',
        phone: '+91 98765 43211',
        gender: 'female' as const,
        deptCode: 'dept_legal',
        desigCode: 'des_comp_head',
        ctc: 2800000,
        role: 'compliance_statutory' as const,
      },
      {
        code: 'VV-1005',
        firstName: 'Vishwadharan',
        lastName: 'R',
        email: 'vishwadharan.r@viruzverse.com',
        phone: '+91 98765 43214',
        gender: 'male' as const,
        deptCode: 'dept_qc',
        desigCode: 'des_qc_sr',
        ctc: 1850000,
        role: 'employee' as const,
      },
    ];

    const empObjMap: Record<string, any> = {};

    for (const emp of employeesData) {
      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.firstName + ' ' + emp.lastName)}&background=4f46e5&color=ffffff`;

      const employee = await prisma.employee.create({
        data: {
          organizationId: org.id,
          employeeCode: emp.code,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          phone: emp.phone,
          avatarUrl,
          gender: emp.gender,
          dob: new Date('1988-05-20'),
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
      await prisma.user.create({
        data: {
          organizationId: org.id,
          email: emp.email,
          name: `${emp.firstName} ${emp.lastName}`,
          avatarUrl,
          passwordHash: '$2b$10$dummyhashedpasswordforlivemvpseed123',
          roles: [emp.role as any],
          activeRole: emp.role as any,
          employeeId: employee.id,
        },
      });

      // Seed Bank Details
      await prisma.bankDetails.create({
        data: {
          employeeId: employee.id,
          accountNumber: `9180200451${emp.code.replace('VV-', '')}`,
          accountName: `${emp.firstName} ${emp.lastName}`,
          bankName: 'HDFC Bank Ltd',
          ifscCode: 'HDFC0000240',
          branchName: 'MG Road Bengaluru',
          pan: 'ABCDE1234F',
        },
      });

      // Seed Statutory Info
      await prisma.statutoryInfo.create({
        data: {
          employeeId: employee.id,
          pfNumber: `KN/BLR/0049201/000/${emp.code.replace('VV-', '')}`,
          uan: `101294810${emp.code.replace('VV-', '')}`,
          esiNumber: `3100491827${emp.code.replace('VV-', '')}`,
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
        await prisma.leaveAllocation.create({
          data: {
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
      where: { employeeCode: 'VV-1004' }, // MD reports to Chairman
      data: { reportingManagerId: empObjMap['VV-1000'].id },
    });
    await prisma.employee.update({
      where: { employeeCode: 'VV-1001' }, // HR Head reports to MD
      data: { reportingManagerId: empObjMap['VV-1004'].id },
    });
    await prisma.employee.update({
      where: { employeeCode: 'VV-1003' }, // Audit Head reports to Chairman / MD
      data: { reportingManagerId: empObjMap['VV-1000'].id },
    });
    await prisma.employee.update({
      where: { employeeCode: 'VV-1002' }, // Compliance Head reports to MD
      data: { reportingManagerId: empObjMap['VV-1004'].id },
    });
    await prisma.employee.update({
      where: { employeeCode: 'VV-1005' }, // Ananya reports to MD
      data: { reportingManagerId: empObjMap['VV-1004'].id },
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
        approverId: empObjMap['VV-1004'].id,
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
        approverId: empObjMap['VV-1000'].id,
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

      for (const empCode of ['VV-1000', 'VV-1001', 'VV-1002', 'VV-1003', 'VV-1004', 'VV-1005']) {
        const emp = empObjMap[empCode];
        await prisma.attendanceRecord.create({
          data: {
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

    // 8. Seed Payroll Runs & Payslips
    const runJuly = await prisma.payrollRun.create({
      data: {
        organizationId: org.id,
        monthYear: 'July 2026',
        periodStart: new Date('2026-07-01'),
        periodEnd: new Date('2026-07-31'),
        totalEmployees: 6,
        totalGross: 2420000,
        totalDeductions: 320000,
        totalNet: 2100000,
        status: 'disbursed',
        calculatedBy: 'Marcus Chen',
        approvedBy: 'Dr. Vikramaditya Rathore',
      },
    });

    const runAug = await prisma.payrollRun.create({
      data: {
        organizationId: org.id,
        monthYear: 'August 2026',
        periodStart: new Date('2026-08-01'),
        periodEnd: new Date('2026-08-31'),
        totalEmployees: 6,
        totalGross: 2420000,
        totalDeductions: 320000,
        totalNet: 2100000,
        status: 'calculated',
        calculatedBy: 'Marcus Chen',
      },
    });

    for (const empCode of ['VV-1000', 'VV-1001', 'VV-1002', 'VV-1003', 'VV-1004', 'VV-1005']) {
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
      const tds = Math.round(gross * 0.10);
      const totalDed = pf + esi + pt + tds;
      const net = gross - totalDed;

      // Payslip July
      await prisma.payslip.create({
        data: {
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

      // Payslip August
      await prisma.payslip.create({
        data: {
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
        budgetMin: 1400000,
        budgetMax: 2000000,
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
        budgetMin: 1100000,
        budgetMax: 1700000,
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
        interviewerName: 'Eleanor Vance',
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
        userRole: 'hr_head' as const,
        action: 'EMPLOYEE_RECORD_UPDATED',
        module: 'employee_records',
        payloadAfter: { note: 'Updated promotion stage to Performance Calibration for Vishwadharan R' },
        integrityHash: 'a8f9c1b2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0',
        ipAddress: '192.168.1.45',
      },
      {
        organizationId: org.id,
        userName: 'Marcus Chen',
        userRole: 'internal_audit_head' as const,
        action: 'PAYROLL_RUN_AUDITED',
        module: 'payroll_benefits',
        payloadAfter: { note: 'Verified August 2026 payroll batch calculations with zero statutory variances' },
        integrityHash: 'b9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0a8f9c1b2d3e4f5a6b7c8',
        ipAddress: '192.168.1.88',
      },
      {
        organizationId: org.id,
        userName: 'Marcus Chen',
        userRole: 'internal_audit_head' as const,
        action: 'AUDIT_INSPECTION_COMPLETED',
        module: 'system_settings',
        payloadAfter: { note: 'System activity security review completed across all departments. All records verified.' },
        integrityHash: 'd1e2f3a4b5c6d7e8f9a0b9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9b2',
        ipAddress: '192.168.1.88',
      },
      {
        organizationId: org.id,
        userName: 'Rajeshwari Nair',
        userRole: 'compliance_statutory' as const,
        action: 'FACTORY_ACT_REGISTER_SUBMITTED',
        module: 'policy_compliance',
        payloadAfter: { note: 'Quarterly Form 25 and Form 12 muster registers verified and archived' },
        integrityHash: 'c0d1e2f3a4b5c6d7e8f9a0b9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9',
        ipAddress: '192.168.1.92',
      },
      {
        organizationId: org.id,
        userName: 'Marcus Chen',
        userRole: 'internal_audit_head' as const,
        action: 'DISCIPLINARY_INQUIRY_PANEL_RECORDED',
        module: 'disciplinary_actions',
        payloadAfter: { note: 'Inquiry evidence and compliance review completed for case DC-2026-004. Corrective action plan approved.' },
        integrityHash: 'e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4',
        ipAddress: '192.168.1.88',
      },
      {
        organizationId: org.id,
        userName: 'Dr. Vikramaditya Rathore',
        userRole: 'managing_director' as const,
        action: 'PROMOTION_SANCTIONED',
        module: 'transfer_promotion',
        payloadAfter: { note: 'Approved grade upgrade for Senior Analytical Chemist Vishwadharan R (L3 to L4)' },
        integrityHash: 'f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6',
        ipAddress: '192.168.1.10',
      },
    ];

    for (const log of sampleAuditLogs) {
      await prisma.auditLog.create({
        data: log,
      });
    }
    console.log('✅ Grievances & Audit Logs seeded');

    // 12. Seed Training Programs
    const sampleTrainings = [
      {
        organizationId: org.id,
        title: 'Chemical Hazardous Material Handling & Safety',
        category: 'compliance',
        trainer: 'Dr. Vikramaditya Rathore',
        startDate: new Date('2026-08-22'),
        endDate: new Date('2026-08-24'),
        mode: 'internal',
        capacity: 40,
        enrolledCount: 34,
        status: 'upcoming',
      },
      {
        organizationId: org.id,
        title: 'ISO 9001:2015 Quality & Standard Operating Procedures',
        category: 'technical',
        trainer: 'External Lead Auditor',
        startDate: new Date('2026-08-10'),
        endDate: new Date('2026-08-12'),
        mode: 'external_vendor',
        vendorName: 'TUV Nord',
        capacity: 30,
        enrolledCount: 28,
        status: 'completed',
      },
      {
        organizationId: org.id,
        title: 'Workplace Ergonomics & EHS First Responder',
        category: 'compliance',
        trainer: 'Plant Medical Officer',
        startDate: new Date('2026-08-28'),
        endDate: new Date('2026-08-29'),
        mode: 'internal',
        capacity: 25,
        enrolledCount: 19,
        status: 'upcoming',
      },
    ];

    for (const tr of sampleTrainings) {
      await prisma.trainingProgram.create({ data: tr });
    }
    console.log('✅ Training programs seeded');

    // 13. Seed Resignation Exit Case for Employee
    await prisma.resignationExitCase.create({
      data: {
        employeeId: empObjMap['VV-1005'].id,
        resignationDate: new Date('2026-08-15'),
        lastWorkingDay: new Date('2026-10-15'),
        reason: 'Career transition & higher studies',
        noticePeriodDays: 60,
        itClearanceStatus: 'cleared',
        deptClearanceStatus: 'cleared',
        financeClearanceStatus: 'pending',
        fnfAmount: 239000,
        fnfStatus: 'pending',
      },
    });
    console.log('✅ Resignation exit cases seeded');

    // 14. Seed Company Policies (Set by HR Head & Compliance Officer)
    await prisma.companyPolicy.createMany({
      data: [
        {
          organizationId: org.id,
          title: 'Plant Health & Safety Policy (EHS)',
          category: 'safety_ehs',
          version: 'v3.2',
          effectiveDate: new Date('2026-01-01'),
          status: 'active',
          createdByName: 'Eleanor Vance',
          createdByRole: 'hr_head',
          acknowledgedCount: 104,
          content: 'Mandatory environmental, health, and safety protocols for chemical and plant facility operations.',
        },
        {
          organizationId: org.id,
          title: 'Code of Business Conduct & Ethics',
          category: 'code_of_conduct',
          version: 'v2.1',
          effectiveDate: new Date('2025-06-01'),
          status: 'active',
          createdByName: 'Kavita Menon',
          createdByRole: 'compliance_statutory',
          acknowledgedCount: 110,
          content: 'Ethical guidelines, conflict of interest policy, and statutory compliance framework.',
        },
        {
          organizationId: org.id,
          title: 'POSH & Anti-Harassment Guidelines',
          category: 'posh',
          version: 'v4.0',
          effectiveDate: new Date('2026-02-15'),
          status: 'active',
          createdByName: 'Kavita Menon',
          createdByRole: 'compliance_statutory',
          acknowledgedCount: 108,
          content: 'Prevention of Sexual Harassment at Workplace Act compliance and Internal Complaints Committee framework.',
        },
        {
          organizationId: org.id,
          title: 'Industrial Shift & Overtime Regulations',
          category: 'leave_attendance',
          version: 'v1.4',
          effectiveDate: new Date('2025-11-01'),
          status: 'active',
          createdByName: 'Eleanor Vance',
          createdByRole: 'hr_head',
          acknowledgedCount: 95,
          content: 'Shift rotation, overtime calculation under Factories Act, and attendance regularization rules.',
        },
      ],
    });
    console.log('✅ Company policies seeded');

    // 15. Seed Transfer & Promotion Cases
    await prisma.transferPromotionCase.createMany({
      data: [
        {
          organizationId: org.id,
          employeeId: empObjMap['VV-1005'].id,
          type: 'promotion',
          currentDepartment: 'Quality Assurance & Analytical Lab',
          newDepartment: 'Quality Assurance & Analytical Lab',
          currentDesignation: 'QC Chemist (L3)',
          newDesignation: 'Senior QC Chemist (L4)',
          currentBranch: 'Tech Operations Center (HQ)',
          newBranch: 'Tech Operations Center (HQ)',
          effectiveDate: new Date('2026-09-01'),
          initiatedBy: 'Dr. Vikramaditya Rathore',
          status: 'pending',
          approvalChain: ['Dr. Vikramaditya Rathore', 'Eleanor Vance'],
        },
        {
          organizationId: org.id,
          employeeId: empObjMap['VV-1002'].id,
          type: 'transfer',
          currentDepartment: 'Statutory Compliance & EHS',
          newDepartment: 'Statutory Compliance & EHS',
          currentDesignation: 'Head of Compliance & Statutory Affairs',
          newDesignation: 'Regional Director - Compliance & Plant EHS',
          currentBranch: 'Tech Operations Center (HQ)',
          newBranch: 'Central Manufacturing Complex (Campus 2)',
          effectiveDate: new Date('2026-09-15'),
          initiatedBy: 'Eleanor Vance',
          status: 'pending',
          approvalChain: ['Eleanor Vance', 'Dr. Vikramaditya Rathore'],
        },
      ],
    });
    console.log('✅ Transfer & promotion cases seeded');

    // 16. Seed Disciplinary Cases
    await prisma.disciplinaryCase.createMany({
      data: [
        {
          organizationId: org.id,
          caseNumber: 'DC-2026-004',
          employeeId: empObjMap['VV-1005'].id,
          violationType: 'breach_of_policy',
          incidentDate: new Date('2026-08-05'),
          reportedBy: 'Shift Supervisor',
          severity: 'major',
          currentStage: 'inquiry_panel',
          description: 'Procedural deviation during batch quality testing cycle.',
        },
        {
          organizationId: org.id,
          caseNumber: 'DC-2026-008',
          employeeId: empObjMap['VV-1005'].id,
          violationType: 'absenteeism',
          incidentDate: new Date('2026-08-11'),
          reportedBy: 'Dept Head - QA',
          severity: 'medium',
          currentStage: 'show_cause_notice',
          description: 'Unscheduled absence during priority audit inspection window.',
        },
      ],
    });
    console.log('✅ Disciplinary cases seeded');

    // 17. Seed Official Company Holiday Calendar (2026)
    await prisma.companyHoliday.createMany({
      data: [
        {
          organizationId: org.id,
          title: 'Corporate Founder Day',
          date: new Date('2026-11-20'),
          dayOfWeek: 'Friday',
          category: 'mandatory',
          status: 'pending_approval',
          createdByName: 'Eleanor Vance',
          createdByRole: 'hr_head',
          year: 2026,
        },
        {
          organizationId: org.id,
          title: 'Regional State Foundation Day',
          date: new Date('2026-11-01'),
          dayOfWeek: 'Sunday',
          category: 'regional',
          status: 'pending_approval',
          createdByName: 'Kavita Menon',
          createdByRole: 'compliance_statutory',
          year: 2026,
        },
        {
          organizationId: org.id,
          title: 'New Year\'s Day',
          date: new Date('2026-01-01'),
          dayOfWeek: 'Thursday',
          category: 'national',
          status: 'approved',
          createdByName: 'Kavita Menon',
          createdByRole: 'compliance_statutory',
          approvedByName: 'Dr. Vikramaditya Rathore',
          approvedByRole: 'managing_director',
          year: 2026,
        },
        {
          organizationId: org.id,
          title: 'Republic Day',
          date: new Date('2026-01-26'),
          dayOfWeek: 'Monday',
          category: 'national',
          status: 'approved',
          createdByName: 'Kavita Menon',
          createdByRole: 'compliance_statutory',
          approvedByName: 'Dr. Vikramaditya Rathore',
          approvedByRole: 'managing_director',
          year: 2026,
        },
        {
          organizationId: org.id,
          title: 'International Workers\' Day (May Day)',
          date: new Date('2026-05-01'),
          dayOfWeek: 'Friday',
          category: 'mandatory',
          status: 'approved',
          createdByName: 'Eleanor Vance',
          createdByRole: 'hr_head',
          approvedByName: 'Dr. Vikramaditya Rathore',
          approvedByRole: 'managing_director',
          year: 2026,
        },
        {
          organizationId: org.id,
          title: 'Independence Day',
          date: new Date('2026-08-15'),
          dayOfWeek: 'Saturday',
          category: 'national',
          status: 'approved',
          createdByName: 'Kavita Menon',
          createdByRole: 'compliance_statutory',
          approvedByName: 'Dr. Vikramaditya Rathore',
          approvedByRole: 'managing_director',
          year: 2026,
        },
        {
          organizationId: org.id,
          title: 'Gandhi Jayanti',
          date: new Date('2026-10-02'),
          dayOfWeek: 'Friday',
          category: 'national',
          status: 'approved',
          createdByName: 'Kavita Menon',
          createdByRole: 'compliance_statutory',
          approvedByName: 'Dr. Vikramaditya Rathore',
          approvedByRole: 'managing_director',
          year: 2026,
        },
        {
          organizationId: org.id,
          title: 'Deepavali / Diwali',
          date: new Date('2026-11-08'),
          dayOfWeek: 'Sunday',
          category: 'mandatory',
          status: 'approved',
          createdByName: 'Eleanor Vance',
          createdByRole: 'hr_head',
          approvedByName: 'Dr. Vikramaditya Rathore',
          approvedByRole: 'managing_director',
          year: 2026,
        },
        {
          organizationId: org.id,
          title: 'Christmas Day',
          date: new Date('2026-12-25'),
          dayOfWeek: 'Friday',
          category: 'national',
          status: 'approved',
          createdByName: 'Eleanor Vance',
          createdByRole: 'hr_head',
          approvedByName: 'Dr. Vikramaditya Rathore',
          approvedByRole: 'managing_director',
          year: 2026,
        },
      ],
    });
    console.log('✅ Company holiday calendar (2026) seeded');

    console.log('🎉 Full Viruzverse HRM seed completed successfully!');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('❌ Seed execution failed:', e);
});
