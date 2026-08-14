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
