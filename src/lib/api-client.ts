import { ApiResponse } from '@/lib/api-response';
import { getCache, setCache, removeCache, DEFAULT_TTL_MS } from '@/lib/cache';

export interface FetchOptions extends RequestInit {
  useCache?: boolean;
  cacheTtlMs?: number;
  cacheKey?: string;
}

export async function fetchApi<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const { useCache = false, cacheTtlMs = DEFAULT_TTL_MS, cacheKey, ...fetchInit } = options;
  const isGet = !fetchInit.method || fetchInit.method.toUpperCase() === 'GET';
  const effectiveCacheKey = cacheKey || `api_${endpoint}`;

  // If caching enabled for GET request, attempt to return cached payload
  if (useCache && isGet) {
    const cachedData = getCache<ApiResponse<T>>(effectiveCacheKey);
    if (cachedData) {
      return cachedData;
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(fetchInit.headers || {}),
  };

  try {
    const res = await fetch(endpoint, {
      ...fetchInit,
      headers,
    });

    const data: ApiResponse<T> = await res.json();

    // Cache successful GET responses
    if (useCache && isGet && data.success) {
      setCache(effectiveCacheKey, data, cacheTtlMs);
    }

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
    getAll: (role?: string, dept?: string) => {
      const endpoint = `/api/employees${dept && dept !== 'all' ? `?departmentId=${dept}` : ''}`;
      return fetchApi(endpoint, {
        headers: role ? { 'x-user-role': role } : {},
        useCache: true,
      });
    },
    getById: (id: string, role?: string) =>
      fetchApi(`/api/employees/${id}`, {
        headers: role ? { 'x-user-role': role } : {},
        useCache: true,
      }),
    create: (data: any, role?: string) => {
      removeCache('api_/api/employees');
      return fetchApi('/api/employees', {
        method: 'POST',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify(data),
      });
    },
    update: (id: string, data: any, role?: string) => {
      removeCache('api_/api/employees');
      removeCache(`api_/api/employees/${id}`);
      return fetchApi(`/api/employees/${id}`, {
        method: 'PUT',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify(data),
      });
    },
  },

  attendance: {
    getRecords: (role?: string, employeeId?: string, date?: string) => {
      const params = new URLSearchParams();
      if (employeeId) params.set('employeeId', employeeId);
      if (date) params.set('date', date);
      const endpoint = `/api/attendance?${params.toString()}`;
      return fetchApi(endpoint, {
        headers: role ? { 'x-user-role': role } : {},
        useCache: true,
      });
    },
    syncExcel: (records: any[], role?: string) => {
      removeCache('api_/api/attendance');
      return fetchApi('/api/attendance', {
        method: 'POST',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify({ records }),
      });
    },
  },

  leaves: {
    getAll: (role?: string) =>
      fetchApi('/api/leaves', {
        headers: role ? { 'x-user-role': role } : {},
        useCache: true,
      }),
    apply: (data: any, role?: string) => {
      removeCache('api_/api/leaves');
      return fetchApi('/api/leaves/apply', {
        method: 'POST',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify(data),
      });
    },
  },

  payroll: {
    getRuns: (role?: string) =>
      fetchApi('/api/payroll/runs', {
        headers: role ? { 'x-user-role': role } : {},
        useCache: true,
      }),
    calculate: (monthYear: string, role?: string) => {
      removeCache('api_/api/payroll/runs');
      return fetchApi('/api/payroll/runs', {
        method: 'POST',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify({ monthYear }),
      });
    },
  },

  compliance: {
    getPolicies: (role?: string) =>
      fetchApi('/api/compliance', {
        headers: role ? { 'x-user-role': role } : {},
        useCache: true,
      }),
    createPolicy: (data: any, role?: string) => {
      removeCache('api_/api/compliance');
      return fetchApi('/api/compliance', {
        method: 'POST',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify(data),
      });
    },
    updatePolicy: (id: string, data: any, role?: string) => {
      removeCache('api_/api/compliance');
      return fetchApi(`/api/compliance/${id}`, {
        method: 'PUT',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify(data),
      });
    },
    deletePolicy: (id: string, role?: string) => {
      removeCache('api_/api/compliance');
      return fetchApi(`/api/compliance/${id}`, {
        method: 'DELETE',
        headers: role ? { 'x-user-role': role } : {},
      });
    },
  },

  recruitment: {
    getData: (role?: string) =>
      fetchApi('/api/recruitment', {
        headers: role ? { 'x-user-role': role } : {},
        useCache: true,
      }),
    createRequisition: (data: any, role?: string) => {
      removeCache('api_/api/recruitment');
      return fetchApi('/api/recruitment', {
        method: 'POST',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify(data),
      });
    },
    updateCandidateStage: (candidateId: string, stage: string, role?: string) => {
      removeCache('api_/api/recruitment');
      return fetchApi('/api/recruitment', {
        method: 'POST',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify({ action: 'update_candidate_stage', candidateId, stage }),
      });
    },
  },

  audit: {
    getLogs: (role?: string, filters?: { search?: string; module?: string }) => {
      const params = new URLSearchParams();
      if (filters?.search) params.set('search', filters.search);
      if (filters?.module && filters.module !== 'all') params.set('module', filters.module);
      const endpoint = `/api/audit-logs?${params.toString()}`;
      return fetchApi(endpoint, {
        headers: role ? { 'x-user-role': role } : {},
        useCache: true,
      });
    },
  },
};
