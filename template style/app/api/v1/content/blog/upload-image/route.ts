import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const backendUrl = `${BACKEND_URL}/api/v1/content/blog/upload-image`;
    
    const authHeader = request.headers.get('authorization') || request.headers.get('cookie');
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        ...(authHeader && { 'Authorization': authHeader }),
        ...(authHeader && authHeader.startsWith('Bearer') ? {} : { 'Cookie': authHeader || '' }),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'Failed to upload image', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}











