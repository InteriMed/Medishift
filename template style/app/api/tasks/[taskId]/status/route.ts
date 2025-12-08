import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    
    console.log(`📊 [Next.js API] Fetching task status for ${taskId}`);
    
    const authHeader = request.headers.get('authorization');
    
    const backendUrl = `${BACKEND_URL}/api/tasks/${taskId}/status`;
    console.log(`📡 [Next.js API] Forwarding to ${backendUrl}`);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
    });

    console.log(`📡 [Next.js API] Backend response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [Next.js API] Backend error: ${errorText}`);
      return NextResponse.json(
        { error: 'Failed to fetch task status', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`✅ [Next.js API] Backend response received for task ${taskId}`);
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ [Next.js API] Error fetching task status:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

