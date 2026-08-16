import { NextRequest } from 'next/server';
import { apiForbidden } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  return apiForbidden('Web check-in is disabled. Attendance records are exclusively synchronized via Biometric device Excel sync.');
}

