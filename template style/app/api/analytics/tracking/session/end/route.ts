import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8001';
const TIMEOUT_MS = 5000;

export async function POST(request: NextRequest) {
  try {
    let body = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (parseError) {
      // Empty body or invalid JSON - use empty object
      body = {};
    }
    
    const authHeader = request.headers.get('authorization');
    
    const backendUrl = `${BACKEND_URL}/api/analytics/tracking/session/end`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    try {
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader && { 'Authorization': authHeader }),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('Session end tracking failed:', errorText);
        return NextResponse.json(
          { success: false, message: 'Session end failed' },
          { status: 200 }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.warn('Session end tracking timed out');
      } else {
        console.warn('Session end tracking error:', fetchError);
      }
      return NextResponse.json(
        { success: false, message: 'Session end unavailable' },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Error processing session end request:', error);
    return NextResponse.json(
      { success: false, message: 'Request processing failed' },
      { status: 200 }
    );
  }
}






