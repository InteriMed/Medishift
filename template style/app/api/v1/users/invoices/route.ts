import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  requireAuth,
} from '../../middleware/error-handling';
import { makeBackendRequest } from '../../lib/utils/backend';

export const GET = withErrorHandling(
  requireAuth(async request => {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '50';

    const response = await makeBackendRequest(
      `/api/credits/invoices?limit=${limit}`,
      {
        method: 'GET',
      },
      request
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Backend error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  })
);
