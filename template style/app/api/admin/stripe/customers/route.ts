import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    const backendUrl = `${BACKEND_URL}/api/admin/stripe/customers`;

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { Authorization: authHeader }),
      },
    });

    if (!response.ok) {
      let errorText = '';
      let errorData = null;

      try {
        errorText = await response.text();
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // If not JSON, use the text as is
        }
      } catch (e) {
        errorText = `HTTP ${response.status}: ${response.statusText || 'Unknown error'}`;
      }

      console.error('Backend error response:', errorText);

      const errorMessage =
        errorData?.detail ||
        errorData?.error ||
        errorData?.message ||
        errorText ||
        'Failed to fetch customers';

      return NextResponse.json(
        {
          error: errorMessage,
          details: errorData?.details || errorText,
          status: response.status,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching Stripe customers:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
