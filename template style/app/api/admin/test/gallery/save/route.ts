import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, requireAuth } from '../../../../v1/middleware/error-handling';
import { makeBackendRequest } from '../../../../v1/lib/utils/backend';

export const POST = withErrorHandling(requireAuth(async (request: NextRequest) => {
  const body = await request.json();

  const response = await makeBackendRequest('/api/admin/test/gallery/save', {
    method: 'POST',
    body,
  }, request);

  if (!response.ok) {
    const errorData = await response.text();
    return NextResponse.json(
      { success: false, error: `Backend error: ${response.status} ${errorData}` },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}));





