import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  requireAuth,
} from '../../middleware/error-handling';
import { makeBackendRequest } from '../../lib/utils/backend';

export const POST = withErrorHandling(
  requireAuth(async request => {
    const response = await makeBackendRequest(
      '/api/credits/sync-subscription',
      {
        method: 'POST',
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
