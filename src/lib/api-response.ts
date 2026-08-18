import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode?: number;
  timestamp: string;
}

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};

export function apiSuccess<T>(data: T, message = 'Success', statusCode = 200) {
  return NextResponse.json<ApiResponse<T>>(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    },
    {
      status: statusCode,
      headers: NO_CACHE_HEADERS,
    }
  );
}

export function apiError(error: string, statusCode = 400) {
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error,
      statusCode,
      timestamp: new Date().toISOString(),
    },
    {
      status: statusCode,
      headers: NO_CACHE_HEADERS,
    }
  );
}

export function apiUnauthorized(message = 'Authentication required') {
  return apiError(message, 401);
}

export function apiForbidden(message = 'Access forbidden: Insufficient RBAC permission') {
  return apiError(message, 403);
}

export function apiNotFound(message = 'Resource not found') {
  return apiError(message, 404);
}
