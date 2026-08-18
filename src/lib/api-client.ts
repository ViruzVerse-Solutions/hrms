import { ApiResponse } from '@/lib/api-response';
import {
  getCache,
  setCache,
  invalidateCache,
  invalidateCacheTags,
  DEFAULT_TTL_MS,
} from '@/lib/cache';

export interface FetchOptions extends RequestInit {
  useCache?: boolean;
  cacheTtlMs?: number;
  cacheKey?: string;
  tags?: string[];
  swr?: boolean; // Return cached immediately, revalidate in background
  onBackgroundUpdate?: (data: any) => void;
}

/**
 * High-Speed API Fetch Engine with Stale-While-Revalidate (SWR) & Tag Invalidation
 */
export async function fetchApi<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const {
    useCache = false,
    cacheTtlMs = DEFAULT_TTL_MS,
    cacheKey,
    tags = [],
    swr = true,
    onBackgroundUpdate,
    ...fetchInit
  } = options;

  const method = (fetchInit.method || 'GET').toUpperCase();
  const isGet = method === 'GET';
  const effectiveCacheKey = cacheKey || `api_${endpoint}`;

  // If caching enabled for GET, return cached payload immediately (0ms latency)
  if (useCache && isGet) {
    const cachedData = getCache<ApiResponse<T>>(effectiveCacheKey);
    if (cachedData) {
      // In SWR mode, trigger background revalidation without delaying the UI
      if (swr) {
        setTimeout(async () => {
          try {
            const bgRes = await fetch(endpoint, {
              ...fetchInit,
              headers: {
                'Content-Type': 'application/json',
                ...(fetchInit.headers || {}),
              },
            });
            const bgData: ApiResponse<T> = await bgRes.json();
            if (bgData.success) {
              setCache(effectiveCacheKey, bgData, cacheTtlMs, tags);
              if (onBackgroundUpdate) onBackgroundUpdate(bgData);
            }
          } catch {}
        }, 10);
      }
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
      setCache(effectiveCacheKey, data, cacheTtlMs, tags);
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

/**
 * Helper to trigger automatic client-side invalidation for domain tags
 */
export function invalidateDomain(tags: string[]): void {
  invalidateCacheTags(tags);
}

export const apiClient = {
  // ==========================================
  // 1. EMPLOYEES
  // ==========================================
  employees: {
    getAll: (role?: string, dept?: string, search?: string, status?: string) => {
      const params = new URLSearchParams();
      if (dept && dept !== 'all') params.set('departmentId', dept);
      if (search) params.set('search', search);
      if (status && status !== 'all') params.set('status', status);
      const endpoint = `/api/employees${params.toString() ? `?${params.toString()}` : ''}`;

      return fetchApi(endpoint, {
        headers: role ? { 'x-user-role': role } : {},
        useCache: true,
        tags: ['employees', 'dashboard'],
      });
    },
    getById: (id: string, role?: string) =>
      fetchApi(`/api/employees/${id}`, {
        headers: role ? { 'x-user-role': role } : {},
        useCache: true,
        tags: ['employees', `employee_${id}`],
      }),
    create: async (data: any, role?: string) => {
      invalidateCacheTags(['employees', 'dashboard', 'reports']);
      invalidateCache('api_/api/employees');
      return fetchApi('/api/employees', {
        method: 'POST',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify(data),
      });
    },
    update: async (id: string, data: any, role?: string) => {
      invalidateCacheTags(['employees', 'dashboard', 'reports', `employee_${id}`]);
      invalidateCache('api_/api/employees');
      return fetchApi(`/api/employees/${id}`, {
        method: 'PUT',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify(data),
      });
    },
  },

  // ==========================================
  // 2. ATTENDANCE & BIOMETRICS
  // ==========================================
  attendance: {
    getRecords: (role?: string, employeeId?: string, date?: string) => {
      const params = new URLSearchParams();
      if (employeeId) params.set('employeeId', employeeId);
      if (date) params.set('date', date);
      const endpoint = `/api/attendance?${params.toString()}`;

      return fetchApi(endpoint, {
        headers: role ? { 'x-user-role': role } : {},
        useCache: true,
        tags: ['attendance', 'dashboard'],
      });
    },
    syncExcel: async (records: any[], role?: string) => {
      invalidateCacheTags(['attendance', 'dashboard', 'reports']);
      invalidateCache('api_/api/attendance');
      return fetchApi('/api/attendance', {
        method: 'POST',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify({ records }),
      });
    },
  },

  // ==========================================
  // 3. LEAVES
  // ==========================================
  leaves: {
    getAll: (role?: string, employeeId?: string) => {
      const headers: Record<string, string> = {};
      if (role) headers['x-user-role'] = role;
      if (employeeId) headers['x-employee-id'] = employeeId;
      return fetchApi('/api/leaves', {
        headers,
        useCache: false,
        tags: ['leaves', 'dashboard', 'approvals'],
      });
    },
    apply: async (data: any, role?: string, employeeId?: string) => {
      const headers: Record<string, string> = {};
      if (role) headers['x-user-role'] = role;
      if (employeeId) headers['x-employee-id'] = employeeId;
      const res = await fetchApi('/api/leaves/apply', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...data, employeeId: employeeId || data.employeeId }),
      });
      invalidateCacheTags(['leaves', 'dashboard', 'approvals', 'reports']);
      invalidateCache('api_/api/leaves');
      return res;
    },
    action: async (id: string, status: 'approved' | 'rejected', comment?: string, role?: string, employeeId?: string) => {
      const headers: Record<string, string> = {};
      if (role) headers['x-user-role'] = role;
      if (employeeId) headers['x-employee-id'] = employeeId;
      const res = await fetchApi(`/api/leaves/${id}/action`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ status, comment }),
      });
      invalidateCacheTags(['leaves', 'dashboard', 'approvals', 'reports']);
      invalidateCache('api_/api/leaves');
      return res;
    },
  },

  // ==========================================
  // 4. TASKS & WORK ALLOCATION
  // ==========================================
  tasks: {
    getAll: (role?: string, params?: { department?: string; status?: string; priority?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.department && params.department !== 'all') q.set('department', params.department);
      if (params?.status && params.status !== 'all') q.set('status', params.status);
      if (params?.priority && params.priority !== 'all') q.set('priority', params.priority);
      if (params?.search) q.set('search', params.search);
      const endpoint = `/api/tasks${q.toString() ? `?${q.toString()}` : ''}`;

      return fetchApi(endpoint, {
        headers: role ? { 'x-user-role': role } : {},
        useCache: true,
        tags: ['tasks', 'dashboard'],
      });
    },
    create: async (data: any, role?: string) => {
      invalidateCacheTags(['tasks', 'dashboard']);
      invalidateCache('api_/api/tasks');
      return fetchApi('/api/tasks', {
        method: 'POST',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify(data),
      });
    },
    update: async (id: string, data: any, role?: string) => {
      invalidateCacheTags(['tasks', 'dashboard']);
      invalidateCache('api_/api/tasks');
      return fetchApi(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify(data),
      });
    },
    review: async (id: string, data: any, role?: string) => {
      invalidateCacheTags(['tasks', 'dashboard']);
      invalidateCache('api_/api/tasks');
      return fetchApi(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify({ action: 'review', ...data }),
      });
    },
    delete: async (id: string, role?: string) => {
      invalidateCacheTags(['tasks', 'dashboard']);
      invalidateCache('api_/api/tasks');
      return fetchApi(`/api/tasks/${id}`, {
        method: 'DELETE',
        headers: role ? { 'x-user-role': role } : {},
      });
    },
  },

  // ==========================================
  // 5. PAYROLL
  // ==========================================
  payroll: {
    getRuns: (role?: string) =>
      fetchApi('/api/payroll/runs', {
        headers: role ? { 'x-user-role': role } : {},
        useCache: true,
        tags: ['payroll', 'dashboard', 'reports'],
      }),
    calculate: async (monthYear: string, role?: string) => {
      invalidateCacheTags(['payroll', 'dashboard', 'reports', 'approvals']);
      invalidateCache('api_/api/payroll/runs');
      return fetchApi('/api/payroll/runs', {
        method: 'POST',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify({ monthYear }),
      });
    },
    approve: async (id: string, role?: string) => {
      invalidateCacheTags(['payroll', 'dashboard', 'reports', 'approvals']);
      invalidateCache('api_/api/payroll/runs');
      return fetchApi(`/api/payroll/runs/${id}/action`, {
        method: 'POST',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify({ action: 'approve' }),
      });
    },
  },

  // ==========================================
  // 6. COMPLIANCE
  // ==========================================
  compliance: {
    getPolicies: (role?: string) =>
      fetchApi('/api/compliance', {
        headers: role ? { 'x-user-role': role } : {},
        useCache: true,
        tags: ['compliance', 'dashboard'],
      }),
    createPolicy: async (data: any, role?: string) => {
      invalidateCacheTags(['compliance', 'dashboard']);
      invalidateCache('api_/api/compliance');
      return fetchApi('/api/compliance', {
        method: 'POST',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify(data),
      });
    },
    updatePolicy: async (id: string, data: any, role?: string) => {
      invalidateCacheTags(['compliance', 'dashboard']);
      invalidateCache('api_/api/compliance');
      return fetchApi(`/api/compliance/${id}`, {
        method: 'PUT',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify(data),
      });
    },
    deletePolicy: async (id: string, role?: string) => {
      invalidateCacheTags(['compliance', 'dashboard']);
      invalidateCache('api_/api/compliance');
      return fetchApi(`/api/compliance/${id}`, {
        method: 'DELETE',
        headers: role ? { 'x-user-role': role } : {},
      });
    },
  },

  // ==========================================
  // 7. RECRUITMENT
  // ==========================================
  recruitment: {
    getData: (role?: string) =>
      fetchApi('/api/recruitment', {
        headers: role ? { 'x-user-role': role } : {},
        useCache: true,
        tags: ['recruitment', 'dashboard'],
      }),
    createRequisition: async (data: any, role?: string) => {
      invalidateCacheTags(['recruitment', 'dashboard', 'approvals']);
      invalidateCache('api_/api/recruitment');
      return fetchApi('/api/recruitment', {
        method: 'POST',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify(data),
      });
    },
    updateCandidateStage: async (candidateId: string, stage: string, role?: string) => {
      invalidateCacheTags(['recruitment', 'dashboard']);
      invalidateCache('api_/api/recruitment');
      return fetchApi('/api/recruitment', {
        method: 'POST',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify({ action: 'update_candidate_stage', candidateId, stage }),
      });
    },
  },

  // ==========================================
  // 8. AUDIT LOGS
  // ==========================================
  audit: {
    getLogs: (role?: string, filters?: { search?: string; module?: string }) => {
      const params = new URLSearchParams();
      if (filters?.search) params.set('search', filters.search);
      if (filters?.module && filters.module !== 'all') params.set('module', filters.module);
      const endpoint = `/api/audit-logs?${params.toString()}`;

      return fetchApi(endpoint, {
        headers: role ? { 'x-user-role': role } : {},
        useCache: true,
        tags: ['audit', 'dashboard'],
      });
    },
  },

  // ==========================================
  // 9. MASTER DATA & DASHBOARD SUMMARY
  // ==========================================
  master: {
    getAll: () =>
      fetchApi('/api/master', {
        useCache: true,
        tags: ['master'],
        cacheTtlMs: 30 * 60 * 1000,
      }),
  },

  dashboard: {
    getSummary: (role?: string, employeeId?: string) =>
      fetchApi('/api/dashboard/summary', {
        headers: {
          ...(role ? { 'x-user-role': role } : {}),
          ...(employeeId ? { 'x-employee-id': employeeId } : {}),
        },
        useCache: false,
        tags: ['dashboard'],
      }),
  },

  approvals: {
    getAll: (role?: string) =>
      fetchApi('/api/approvals', {
        headers: role ? { 'x-user-role': role } : {},
        useCache: false,
        tags: ['approvals', 'dashboard'],
      }),
    process: async (body: { itemId: string; category: string; action: 'approve' | 'reject'; rejectionReason?: string }, role?: string) => {
      const res = await fetchApi('/api/approvals', {
        method: 'POST',
        headers: role ? { 'x-user-role': role } : {},
        body: JSON.stringify(body),
      });
      invalidateCacheTags(['approvals', 'leaves', 'recruitment', 'payroll', 'dashboard', 'reports']);
      invalidateCache('api_/api/approvals');
      return res;
    },
  },
};
