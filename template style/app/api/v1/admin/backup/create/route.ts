import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, requireAuth } from '../../../middleware/error-handling';
import { makeBackendRequest } from '../../../lib/utils/backend';

export async function POST(request: NextRequest) {
  return withErrorHandling(requireAuth(async (req: NextRequest) => {
    const response = await makeBackendRequest('/api/admin/backup/create', {
      method: 'POST'
    }, req);

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Backend error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  }))(request);
}

