import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, requireAuth } from '../../../v1/middleware/error-handling';
import { makeBackendRequest } from '../../../v1/lib/utils/backend';

export const GET = withErrorHandling(requireAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || undefined;
  const limit = searchParams.get('limit') || '50';
  const offset = searchParams.get('offset') || '0';

  const queryParams = new URLSearchParams();
  if (type) queryParams.append('type', type);
  queryParams.append('limit', limit);
  queryParams.append('offset', offset);

  const response = await makeBackendRequest(`/api/admin/test/gallery?${queryParams.toString()}`, {
    method: 'GET',
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





