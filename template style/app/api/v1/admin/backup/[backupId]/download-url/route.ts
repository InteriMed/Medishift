import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, requireAuth } from '../../../../middleware/error-handling';
import { makeBackendRequest } from '../../../../lib/utils/backend';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ backupId: string }> }
) {
  return withErrorHandling(requireAuth(async (req: NextRequest) => {
    const { backupId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const expiration = searchParams.get('expiration') || '3600';

    const response = await makeBackendRequest(`/api/admin/backup/${backupId}/download-url?expiration=${expiration}`, {
      method: 'GET'
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

