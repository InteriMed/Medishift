import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  requireAuth,
} from '../../middleware/error-handling';
import { makeBackendRequest } from '../../lib/utils/backend';

export const GET = withErrorHandling(
  requireAuth(async request => {
    const response = await makeBackendRequest(
      '/api/user-management/settings',
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

export const PUT = withErrorHandling(
  requireAuth(async request => {
    const body = await request.json();

    const response = await makeBackendRequest(
      '/api/user-management/settings',
      {
        method: 'PUT',
        body,
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
