import {
  PrismaClient,
  UserRole,
  Gender,
  EmploymentStatus,
  AttendanceStatus,
  AttendanceSource,
  LeaveTypeEnum,
  LeaveStatus,
  CandidateStage,
  PayrollStatus,
} from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

function calculateHash(prevHash: string, payload: any): string {
  const serialized = JSON.stringify(payload);
  return crypto.createHash('sha256').update(`${prevHash}:${serialized}`).digest('hex');
}

async function main() {
  console.log('🌱 Starting Enterprise Hardened HRMS Database Seed (v2)...');

  try {
    // 0. Purge existing database tables in reverse dependency order
    console.log('🧹 Purging existing tables...');
    await prisma.notification.deleteMany().catch(() => {});
    await (prisma as any).taskLog.deleteMany().catch(() => {});
    await (prisma as any).taskAllocation.deleteMany().catch(() => {});
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
    await prisma.user.deleteMany().catch(() => {});
    await prisma.employee.deleteMany().catch(() => {});
    await prisma.designation.deleteMany().catch(() => {});
    await prisma.department.deleteMany().catch(() => {});
    await prisma.branch.deleteMany().catch(() => {});
    await prisma.organization.deleteMany().catch(() => {});
    console.log('✅ Purge complete');

    // 1. Organization
    const org = await prisma.organization.create({
      data: {
        name: 'Viruzverse Solutions Private Limited',
        code: 'VV',
        domain: 'viruzverse.com',
        taxId: 'AAACV1234F',
      },
    });

    // 2. Branches
    const branchHQ = await prisma.branch.create({
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

    const branchPlant = await prisma.branch.create({
      data: {
        organizationId: org.id,
        name: 'Central Manufacturing Plant (Campus 2)',
        code: 'BR_HYD',
        city: 'Hyderabad',
        state: 'Telangana',
        country: 'India',
        isHeadquarters: false,
      },
    });

    // 3. Departments
    const deptExec = await prisma.department.create({
      data: { organizationId: org.id, name: 'Executive Board & Governance', code: 'dept_exec' },
    });
    const deptHR = await prisma.department.create({
      data: { organizationId: org.id, name: 'Human Resources & Industrial Relations', code: 'dept_hr' },
    });
    const deptAudit = await prisma.department.create({
      data: { organizationId: org.id, name: 'Internal Audit & Risk Management', code: 'dept_audit' },
    });
    const deptLegal = await prisma.department.create({
      data: { organizationId: org.id, name: 'Statutory Compliance & Legal', code: 'dept_legal' },
    });
    const deptOps = await prisma.department.create({
      data: { organizationId: org.id, name: 'Plant Operations & Engineering', code: 'dept_ops' },
    });

    // 4. Designations
    const desChairman = await prisma.designation.create({
      data: { organizationId: org.id, departmentId: deptExec.id, title: 'Chairman of the Board', code: 'des_chair', gradeLevel: 'L1' },
    });
    const desMD = await prisma.designation.create({
      data: { organizationId: org.id, departmentId: deptExec.id, title: 'Managing Director & CEO', code: 'des_md', gradeLevel: 'L1' },
    });
    const desHRHead = await prisma.designation.create({
      data: { organizationId: org.id, departmentId: deptHR.id, title: 'Chief Human Resources Officer', code: 'des_hrh', gradeLevel: 'L2' },
    });
    const desAuditHead = await prisma.designation.create({
      data: { organizationId: org.id, departmentId: deptAudit.id, title: 'Head of Internal Audit', code: 'des_iah', gradeLevel: 'L2' },
    });
    const desCompliance = await prisma.designation.create({
      data: { organizationId: org.id, departmentId: deptLegal.id, title: 'Compliance & Statutory Officer', code: 'des_cso', gradeLevel: 'L3' },
    });
    const desEngineer = await prisma.designation.create({
      data: { organizationId: org.id, departmentId: deptOps.id, title: 'Lead Operations Engineer', code: 'des_eng', gradeLevel: 'L4' },
    });

    console.log('✅ Org structure seeded');

    // 5. Seed 6 Core Personas with exact real-world names
    const personasData = [
      {
        code: 'VV-001',
        first: 'Devraj',
        last: 'Ananth',
        email: 'dev@viruzverse.com',
        phone: '+91 98765 43210',
        gender: Gender.male,
        dob: new Date('1968-05-14'),
        doj: new Date('2020-01-01'),
        deptId: deptExec.id,
        desId: desChairman.id,
        branchId: branchHQ.id,
        role: UserRole.chairman,
        ctc: 12000000,
        stage: 'active',
        pan: 'ABCPS1234F',
        pf: 'PF-BLR-00101',
        uan: '100987654301',
        bankAcc: '918237465001',
      },
      {
        code: 'VV-002',
        first: 'Ganesh',
        last: 'Ramachandran',
        email: 'ganesh@viruzverse.com',
        phone: '+91 98765 43211',
        gender: Gender.male,
        dob: new Date('1975-08-20'),
        doj: new Date('2021-03-15'),
        deptId: deptExec.id,
        desId: desMD.id,
        branchId: branchHQ.id,
        role: UserRole.managing_director,
        ctc: 9600000,
        stage: 'active',
        pan: 'ABCVR1234F',
        pf: 'PF-BLR-00102',
        uan: '100987654302',
        bankAcc: '918237465002',
      },
      {
        code: 'VV-003',
        first: 'Steffania',
        last: 'Rossi',
        email: 'steffania@viruzverse.com',
        phone: '+91 98765 43212',
        gender: Gender.female,
        dob: new Date('1982-11-10'),
        doj: new Date('2022-06-01'),
        deptId: deptHR.id,
        desId: desHRHead.id,
        branchId: branchHQ.id,
        role: UserRole.hr_head,
        ctc: 4800000,
        stage: 'active',
        pan: 'ABCEV1234F',
        pf: 'PF-BLR-00103',
        uan: '100987654303',
        bankAcc: '918237465003',
      },
      {
        code: 'VV-004',
        first: 'Rajeshwari',
        last: 'Nair',
        email: 'rajeshwari.nair@viruzverse.com',
        phone: '+91 98765 43213',
        gender: Gender.female,
        dob: new Date('1986-03-25'),
        doj: new Date('2023-01-10'),
        deptId: deptAudit.id,
        desId: desAuditHead.id,
        branchId: branchHQ.id,
        role: UserRole.internal_audit_head,
        ctc: 3600000,
        stage: 'active',
        pan: 'ABCMS1234F',
        pf: 'PF-BLR-00104',
        uan: '100987654304',
        bankAcc: '918237465004',
      },
      {
        code: 'VV-005',
        first: 'Senthil',
        last: 'Kumar',
        email: 'senthil@viruzverse.com',
        phone: '+91 98765 43214',
        gender: Gender.male,
        dob: new Date('1990-09-18'),
        doj: new Date('2023-07-01'),
        deptId: deptLegal.id,
        desId: desCompliance.id,
        branchId: branchPlant.id,
        role: UserRole.compliance_statutory,
        ctc: 2400000,
        stage: 'active',
        pan: 'ABCRN1234F',
        pf: 'PF-BLR-00105',
        uan: '100987654305',
        bankAcc: '918237465005',
      },
      {
        code: 'VV-006',
        first: 'Vishwa',
        last: 'Nathan',
        email: 'vishwa@viruzverse.com',
        phone: '+91 98765 43215',
        gender: Gender.male,
        dob: new Date('1995-12-04'),
        doj: new Date('2024-02-15'),
        deptId: deptOps.id,
        desId: desEngineer.id,
        branchId: branchPlant.id,
        role: UserRole.employee,
        ctc: 1200000,
        stage: 'active',
        pan: 'ABCVR1234F',
        pf: 'PF-BLR-00106',
        uan: '100987654306',
        bankAcc: '918237465006',
      },
    ];

    const seededEmployees: any[] = [];
    const seededUsers: Record<string, any> = {};

    for (const p of personasData) {
      const emp = await prisma.employee.create({
        data: {
          organizationId: org.id,
          employeeCode: p.code,
          firstName: p.first,
          lastName: p.last,
          email: p.email,
          phone: p.phone,
          gender: p.gender,
          dob: p.dob,
          dateOfJoining: p.doj,
          departmentId: p.deptId,
          designationId: p.desId,
          branchId: p.branchId,
          employmentStatus: EmploymentStatus.active,
          currentLifecycleStage: p.stage,
          ctc: p.ctc,
          accountNumber: p.bankAcc,
          bankName: 'HDFC Bank',
          ifscCode: 'HDFC0001234',
          pan: p.pan,
          pfNumber: p.pf,
          uan: p.uan,
          esiNumber: 'ESI-55667788',
          emergencyContactName: 'Primary Family Contact',
          emergencyContactPhone: p.phone,
          emergencyContactRelation: 'Spouse/Parent',
        },
      });
      seededEmployees.push(emp);

      // Create linked User
      const user = await prisma.user.create({
        data: {
          organizationId: org.id,
          email: p.email,
          passwordHash: '$2a$12$e7k...hardened_salt_hash',
          name: `${p.first} ${p.last}`,
          roles: [p.role],
          activeRole: p.role,
          employeeId: emp.id,
        },
      });
      seededUsers[p.role] = user;
    }

    console.log('✅ 6 Core Personas & Master Profiles seeded');

    // 6. Seed Attendance Records
    const today = new Date();
    for (const emp of seededEmployees) {
      for (let i = 0; i < 5; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);

        await prisma.attendanceRecord.create({
          data: {
            organizationId: org.id,
            employeeId: emp.id,
            date: d,
            inTime: new Date(new Date(d).setHours(9, 0, 0)),
            outTime: new Date(new Date(d).setHours(18, 0, 0)),
            totalHours: 9.0,
            overtimeHours: 0,
            status: AttendanceStatus.present,
            source: AttendanceSource.biometric,
          },
        }).catch(() => {});
      }
    }

    // 7. Seed Leave Requests
    const vishwaEmp = seededEmployees.find((e) => e.email === 'vishwa@viruzverse.com');
    if (vishwaEmp) {
      await prisma.leaveRequest.create({
        data: {
          organizationId: org.id,
          employeeId: vishwaEmp.id,
          leaveType: LeaveTypeEnum.casual,
          fromDate: new Date('2026-08-20'),
          toDate: new Date('2026-08-21'),
          daysCount: 2.0,
          reason: 'Personal family function',
          status: LeaveStatus.pending,
        },
      });
    }

    // 8. Seed Company Holidays
    const holidays = [
      { title: 'New Year Day', date: new Date('2026-01-01'), dayOfWeek: 'Thursday' },
      { title: 'Republic Day', date: new Date('2026-01-26'), dayOfWeek: 'Monday' },
      { title: 'Independence Day', date: new Date('2026-08-15'), dayOfWeek: 'Saturday' },
      { title: 'Gandhi Jayanti', date: new Date('2026-10-02'), dayOfWeek: 'Friday' },
      { title: 'Diwali Festival', date: new Date('2026-11-08'), dayOfWeek: 'Sunday' },
    ];
    for (const h of holidays) {
      await prisma.companyHoliday.create({
        data: {
          organizationId: org.id,
          title: h.title,
          date: h.date,
          dayOfWeek: h.dayOfWeek,
          category: 'mandatory',
          status: 'approved',
          year: 2026,
        },
      });
    }

    // 9. Seed Policies
    const policies = [
      {
        title: 'Occupational Health, Plant Safety & EHS Protocol',
        category: 'safety_ehs',
        version: 'v2.1',
        content: 'All workers must wear safety helmets, protective boots, and safety goggles on factory premises.',
        acknowledgedCount: 108,
      },
      {
        title: 'Corporate Code of Conduct & Anti-Corruption Ethics',
        category: 'code_of_conduct',
        version: 'v3.0',
        content: 'Zero tolerance for bribery, conflicts of interest, and insider trading under regulatory guidelines.',
        acknowledgedCount: 110,
      },
      {
        title: 'POSH Anti-Harassment & Equal Opportunity Directive',
        category: 'posh',
        version: 'v2.0',
        content: 'Internal Complaints Committee procedures and confidential grievance redressal under POSH Act.',
        acknowledgedCount: 110,
      },
    ];
    for (const pol of policies) {
      await prisma.companyPolicy.create({
        data: {
          organizationId: org.id,
          title: pol.title,
          category: pol.category,
          version: pol.version,
          effectiveDate: new Date('2026-01-01'),
          content: pol.content,
          status: 'active',
          acknowledgedCount: pol.acknowledgedCount,
          createdByName: 'Steffania Rossi',
          createdByRole: UserRole.hr_head,
        },
      });
    }

    // 10. Seed Payroll Run & Payslips
    const hrUser = seededUsers[UserRole.hr_head];
    const mdUser = seededUsers[UserRole.managing_director];

    const payrollRun = await prisma.payrollRun.create({
      data: {
        organizationId: org.id,
        monthYear: '2026-08',
        periodStart: new Date('2026-08-01'),
        periodEnd: new Date('2026-08-31'),
        totalEmployees: 6,
        totalGross: 2800000,
        totalDeductions: 336000,
        totalNet: 2464000,
        status: PayrollStatus.approved,
        calculatedById: hrUser.id,
        approvedById: mdUser.id,
      },
    });

    for (const emp of seededEmployees) {
      const monthlyGross = Math.round(Number(emp.ctc) / 12);
      const basic = Math.round(monthlyGross * 0.40);
      const hra = Math.round(basic * 0.50);
      const special = monthlyGross - (basic + hra);
      const pf = Math.round(basic * 0.12);
      const tax = Math.round(monthlyGross * 0.10);
      const totalDeductions = pf + tax;
      const netPay = monthlyGross - totalDeductions;

      await prisma.payslip.create({
        data: {
          organizationId: org.id,
          payrollRunId: payrollRun.id,
          employeeId: emp.id,
          period: '2026-08',
          basicSalary: basic,
          hra: hra,
          specialAllowance: special,
          conveyance: 1600,
          medical: 1250,
          grossEarnings: monthlyGross,
          pfDeduction: pf,
          esiDeduction: 0,
          professionalTax: 200,
          incomeTaxTds: tax,
          totalDeductions: totalDeductions,
          netPay: netPay,
          paymentMode: 'Bank Transfer',
          paymentStatus: 'Processed',
        },
      });
    }

    // 11. Seed Job Requisition & Candidate
    const jobReq = await prisma.jobRequisition.create({
      data: {
        organizationId: org.id,
        departmentId: deptOps.id,
        designationId: desEngineer.id,
        title: 'Lead Automation & Robotics Engineer',
        headcount: 2,
        budgetMin: 900000,
        budgetMax: 1500000,
        experienceMin: 3,
        experienceMax: 7,
        status: 'active',
      },
    });

    await prisma.candidate.create({
      data: {
        organizationId: org.id,
        jobRequisitionId: jobReq.id,
        candidateCode: 'CAN-2026-001',
        name: 'Ananya Sharma',
        email: 'ananya.sharma@example.com',
        phone: '+91 98765 11223',
        stage: CandidateStage.technical_eval,
        experienceYears: 4.5,
        currentCtc: 850000,
        expectedCtc: 1200000,
        matchScore: 94,
      },
    });

    // 12. Seed Training Program
    await prisma.trainingProgram.create({
      data: {
        organizationId: org.id,
        title: 'Factory Safety Standards & Hazardous Material Handling',
        category: 'compliance',
        trainer: 'Rajeshwari Nair',
        startDate: new Date('2026-08-25'),
        endDate: new Date('2026-08-26'),
        capacity: 35,
        enrolledCount: 22,
        status: 'upcoming',
      },
    });

    // 12.5 Seed Task Allocations (Strictly assigned to operational employees)
    console.log('📋 Seeding Task Allocations & Work Deliverables...');
    const empVishwa = seededEmployees.find((e) => e.employeeCode === 'VV-006');
    const empHR = seededEmployees.find((e) => e.employeeCode === 'VV-003');
    const empMD = seededEmployees.find((e) => e.employeeCode === 'VV-002');

    if (empVishwa && empHR && empMD) {
      await (prisma as any).taskAllocation.create({
        data: {
          organizationId: org.id,
          title: 'Factory Safety & ISO 9001 Calibration Verification',
          description: 'Audit and calibrate pressure testing rigs and log inspection sign-offs for Campus 2.',
          category: 'quality_audit',
          priority: 'urgent',
          status: 'in_progress',
          assigneeId: empVishwa.id,
          assignedById: empHR.id,
          assignedByName: 'Steffania Rossi',
          assignedByRole: UserRole.hr_head,
          dueDate: new Date('2026-08-25'),
          estimatedHours: 16,
          actualHours: 8,
          progressPercent: 50,
          deliverableNotes: 'Pressure rigs 1 to 4 calibrated. Logs submitted to plant foreman.',
          proofDocumentName: 'Rig_Calibration_Checklist_Aug2026.pdf',
          logs: {
            create: [
              {
                authorId: empHR.id,
                authorName: 'Steffania Rossi',
                authorRole: UserRole.hr_head,
                message: 'Task dispatched by Steffania Rossi (hr_head).',
                progressAt: 0,
                loggedHours: 0,
              },
              {
                authorId: empVishwa.id,
                authorName: 'Vishwa Nathan',
                authorRole: UserRole.employee,
                message: 'Started work on rig calibration. 8 hours logged.',
                progressAt: 50,
                loggedHours: 8,
              },
            ],
          },
        },
      });

      await (prisma as any).taskAllocation.create({
        data: {
          organizationId: org.id,
          title: 'Automated Robotic Sorting Arm Benchmarking',
          description: 'Run 100-cycle stress test on robotic sorting arm in Bengaluru HQ operations bay.',
          category: 'project',
          priority: 'high',
          status: 'pending',
          assigneeId: empVishwa.id,
          assignedById: empMD.id,
          assignedByName: 'Ganesh Ramachandran',
          assignedByRole: UserRole.managing_director,
          dueDate: new Date('2026-08-28'),
          estimatedHours: 12,
          actualHours: 0,
          progressPercent: 0,
        },
      });

      await (prisma as any).taskAllocation.create({
        data: {
          organizationId: org.id,
          title: 'Warehouse Conveyor Belt Sensor Replacement',
          description: 'Replace optical proximity sensors on sorting belt 3 and run end-to-end dry run tests.',
          category: 'operational',
          priority: 'medium',
          status: 'under_review',
          assigneeId: empVishwa.id,
          assignedById: empHR.id,
          assignedByName: 'Steffania Rossi',
          assignedByRole: UserRole.hr_head,
          dueDate: new Date('2026-08-24'),
          estimatedHours: 8,
          actualHours: 7.5,
          progressPercent: 90,
          deliverableNotes: 'Sensors installed and calibrated. Dry run passed with zero error rate.',
          proofDocumentName: 'Conveyor_Sensor_Test_Report.pdf',
        },
      });
    }

    // 13. Seed Audit Logs with Cryptographic SHA-256 Hash Chain
    console.log('🔒 Initializing cryptographic audit hash chain...');
    let prevHash = 'GENESIS_BLOCK_0000000000000000';

    const auditEvents = [
      {
        userName: 'Steffania Rossi',
        userRole: UserRole.hr_head,
        action: 'SYSTEM_BOOTSTRAP_INITIALIZED',
        module: 'system_settings',
        resourceId: org.id,
        payloadAfter: { event: 'Tenancy initialized for Viruzverse Solutions', domain: org.domain },
      },
      {
        userName: 'Steffania Rossi',
        userRole: UserRole.hr_head,
        action: 'EMPLOYEE_MASTER_SEEDED',
        module: 'employee_records',
        resourceId: seededEmployees[0].id,
        payloadAfter: { count: seededEmployees.length, status: 'Active Service' },
      },
      {
        userName: 'Steffania Rossi',
        userRole: UserRole.hr_head,
        action: 'PAYROLL_RUN_CALCULATED',
        module: 'payroll_benefits',
        resourceId: payrollRun.id,
        payloadAfter: { cycle: '2026-08', totalGross: 2800000, employees: 6 },
      },
      {
        userName: 'Ganesh Ramachandran',
        userRole: UserRole.managing_director,
        action: 'PAYROLL_RUN_APPROVED',
        module: 'payroll_benefits',
        resourceId: payrollRun.id,
        payloadAfter: { cycle: '2026-08', approvedBy: 'Ganesh Ramachandran' },
      },
    ];

    for (const evt of auditEvents) {
      const integrityHash = calculateHash(prevHash, evt);
      await prisma.auditLog.create({
        data: {
          organizationId: org.id,
          userName: evt.userName,
          userRole: evt.userRole,
          action: evt.action,
          module: evt.module,
          resourceId: evt.resourceId,
          payloadAfter: evt.payloadAfter,
          integrityHash: integrityHash,
          ipAddress: '127.0.0.1',
        },
      });
      prevHash = integrityHash; // Advance chain
    }

    console.log('🎉 Enterprise seed completed cleanly with full type alignment!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
