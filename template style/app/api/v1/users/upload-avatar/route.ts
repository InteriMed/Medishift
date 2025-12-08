import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  requireAuth,
} from '../../middleware/error-handling';
import { makeBackendFormRequest } from '../../lib/utils/backend';

export const POST = withErrorHandling(
  requireAuth(async request => {
    const formData = await request.formData();

    const response = await makeBackendFormRequest(
      '/api/user-management/upload-avatar',
      formData,
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
