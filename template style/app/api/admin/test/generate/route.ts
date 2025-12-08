import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, requireAuth } from '../../../v1/middleware/error-handling';
import { makeBackendRequest } from '../../../v1/lib/utils/backend';

export const POST = withErrorHandling(requireAuth(async (request: NextRequest) => {
  const body = await request.json();
  const { type } = body;

  if (!type || !['text', 'image', 'video'].includes(type)) {
    return NextResponse.json(
      { success: false, error: 'Invalid generation type. Must be text, image, or video' },
      { status: 400 }
    );
  }

  const response = await makeBackendRequest('/api/admin/test/generate', {
    method: 'POST',
    body,
    timeout: type === 'video' ? 600000 : type === 'image' ? 300000 : 300000,
  }, request);

  if (!response.ok) {
    let errorMessage = `Backend error: ${response.status}`;
    try {
      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = 
          errorJson.error?.message || 
          errorJson.error?.error || 
          errorJson.detail?.message || 
          errorJson.detail?.error || 
          errorJson.error || 
          errorJson.detail || 
          errorText;
        if (typeof errorMessage === 'object') {
          errorMessage = JSON.stringify(errorMessage);
        }
      } catch {
        errorMessage = errorText || errorMessage;
      }
    } catch {
      errorMessage = `Backend error: ${response.status}`;
    }
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}));



