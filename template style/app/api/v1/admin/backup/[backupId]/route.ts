import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, requireAuth } from '../../../middleware/error-handling';
import { makeBackendRequest } from '../../../lib/utils/backend';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ backupId: string }> }
) {
  return withErrorHandling(requireAuth(async (req: NextRequest) => {
    const { backupId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const hardDelete = searchParams.get('hard_delete') === 'true';

    const response = await makeBackendRequest(`/api/admin/backup/${backupId}?hard_delete=${hardDelete}`, {
      method: 'DELETE'
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

