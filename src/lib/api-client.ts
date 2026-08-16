import { ApiResponse } from '@/lib/api-response';

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    const data: ApiResponse<T> = await res.json();
    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Network request failed',
      timestamp: new Date().toISOString(),
    };
  }
}

export const apiClient = {
  employees: {
    getAll: (role?: string, dept?: string) =>
      fetchApi(`/api/employees${dept && dept !== 'all' ? `?departmentId=${dept}` : ''}`, {
        headers: role ? { 'x-user-role': role } : {},
      }),
    getById: (id: string, role?: string) =>
      fetchApi(`/api/employees/${id}`, {
        headers: role ? { 'x-user-role': role } : {},
      }),
    create: (data: any, role?: string) =>
      fetchApi('/api/employees', {
        method: 'POST',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any, role?: string) =>
      fetchApi(`/api/employees/${id}`, {
        method: 'PUT',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify(data),
      }),
  },

  attendance: {
    getRecords: (role?: string, employeeId?: string, date?: string) => {
      const params = new URLSearchParams();
      if (employeeId) params.set('employeeId', employeeId);
      if (date) params.set('date', date);
      return fetchApi(`/api/attendance?${params.toString()}`, {
        headers: role ? { 'x-user-role': role } : {},
      });
    },
    syncExcel: (records: any[], role?: string) =>
      fetchApi('/api/attendance', {
        method: 'POST',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify({ records }),
      }),
  },

  leaves: {
    getAll: (role?: string) =>
      fetchApi('/api/leaves', {
        headers: role ? { 'x-user-role': role } : {},
      }),
    apply: (data: any, role?: string) =>
      fetchApi('/api/leaves/apply', {
        method: 'POST',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify(data),
      }),
  },

  payroll: {
    getRuns: (role?: string) =>
      fetchApi('/api/payroll/runs', {
        headers: role ? { 'x-user-role': role } : {},
      }),
    calculate: (monthYear: string, role?: string) =>
      fetchApi('/api/payroll/runs', {
        method: 'POST',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify({ monthYear }),
      }),
  },

  compliance: {
    getPolicies: (role?: string) =>
      fetchApi('/api/compliance', {
        headers: role ? { 'x-user-role': role } : {},
      }),
    createPolicy: (data: any, role?: string) =>
      fetchApi('/api/compliance', {
        method: 'POST',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify(data),
      }),
    updatePolicy: (id: string, data: any, role?: string) =>
      fetchApi(`/api/compliance/${id}`, {
        method: 'PUT',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify(data),
      }),
    deletePolicy: (id: string, role?: string) =>
      fetchApi(`/api/compliance/${id}`, {
        method: 'DELETE',
        headers: role ? { 'x-user-role': role } : {},
      }),
  },

  recruitment: {
    getData: (role?: string) =>
      fetchApi('/api/recruitment', {
        headers: role ? { 'x-user-role': role } : {},
      }),
    createRequisition: (data: any, role?: string) =>
      fetchApi('/api/recruitment', {
        method: 'POST',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify(data),
      }),
    updateCandidateStage: (candidateId: string, stage: string, role?: string) =>
      fetchApi('/api/recruitment', {
        method: 'POST',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify({ action: 'update_candidate_stage', candidateId, stage }),
      }),
  },

  audit: {
    getLogs: (role?: string, filters?: { search?: string; module?: string }) => {
      const params = new URLSearchParams();
      if (filters?.search) params.set('search', filters.search);
      if (filters?.module && filters.module !== 'all') params.set('module', filters.module);
      return fetchApi(`/api/audit-logs?${params.toString()}`, {
        headers: role ? { 'x-user-role': role } : {},
      });
    },
  },
};
