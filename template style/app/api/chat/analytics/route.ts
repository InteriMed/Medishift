import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('page_size') || '50';
    
    const backendUrl = `${BACKEND_URL}/api/chat/analytics?page=${page}&page_size=${pageSize}`;
    
    let response: Response;
    try {
      response = await fetch(backendUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader && { 'Authorization': authHeader }),
        },
      });
    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      console.error('Network error connecting to backend:', errorMessage);
      return NextResponse.json(
        { 
          error: 'Backend service unavailable', 
          details: `Cannot connect to backend at ${BACKEND_URL}. Please ensure the backend server is running.`,
          networkError: errorMessage
        },
        { status: 503 }
      );
    }

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = `HTTP ${response.status} ${response.statusText}`;
      }
      console.error('Backend error response:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch analytics', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    const backendUrl = `${BACKEND_URL}/api/chat/analytics`;
    
    let response: Response;
    try {
      response = await fetch(backendUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader && { 'Authorization': authHeader }),
        },
      });
    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      console.error('Network error connecting to backend:', errorMessage);
      return NextResponse.json(
        { 
          error: 'Backend service unavailable', 
          details: `Cannot connect to backend at ${BACKEND_URL}. Please ensure the backend server is running.`,
          networkError: errorMessage
        },
        { status: 503 }
      );
    }

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = `HTTP ${response.status} ${response.statusText}`;
      }
      console.error('Backend error response:', errorText);
      return NextResponse.json(
        { error: 'Failed to delete analytics', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error deleting analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

