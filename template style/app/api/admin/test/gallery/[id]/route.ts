import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  requireAuth,
} from '../../../../v1/middleware/error-handling';
import { makeBackendRequest } from '../../../../v1/lib/utils/backend';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const handler = withErrorHandling(
    requireAuth(async (req: NextRequest) => {
      const { id } = await params;

      const response = await makeBackendRequest(
        `/api/admin/test/gallery/${id}`,
        {
          method: 'DELETE',
        },
        req
      );

      if (!response.ok) {
        const errorData = await response.text();
        return NextResponse.json(
          {
            success: false,
            error: `Backend error: ${response.status} ${errorData}`,
          },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    })
  );

  return handler(request);
}
