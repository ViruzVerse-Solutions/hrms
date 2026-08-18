import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/api-response';
import { serverCache } from '@/lib/server-cache';

export async function GET(req: NextRequest) {
  serverCache.clear();
  return apiSuccess({ cleared: true, message: 'Server cache cleared successfully' });
}

export async function POST(req: NextRequest) {
  serverCache.clear();
  return apiSuccess({ cleared: true, message: 'Server cache cleared successfully' });
}
