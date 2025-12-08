import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tableName: string }> }
) {
  try {
    const { tableName } = await params;
    
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error('Error parsing request body:', jsonError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body', details: jsonError instanceof Error ? jsonError.message : String(jsonError) },
        { status: 400 }
      );
    }

    if (!tableName) {
      return NextResponse.json(
        { error: 'Table name is required' },
        { status: 400 }
      );
    }

    const { row_identifier, column_name, new_value } = body;

    if (!row_identifier || !column_name || new_value === undefined) {
      return NextResponse.json(
        { error: 'row_identifier, column_name, and new_value are required' },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get('Authorization');
    const cookieHeader = request.headers.get('Cookie');
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }
    
    let url: URL;
    try {
      url = new URL(`${backendUrl}/api/admin/database/data/tables/${tableName}/cells`);
      url.searchParams.set('row_identifier', String(row_identifier));
      url.searchParams.set('column_name', column_name);
      url.searchParams.set('new_value', String(new_value));
    } catch (urlError) {
      console.error('Error constructing URL:', urlError);
      return NextResponse.json(
        { error: 'Invalid URL construction', details: urlError instanceof Error ? urlError.message : String(urlError) },
        { status: 500 }
      );
    }
    
    console.log('Making request to:', url.toString());
    console.log('Headers:', JSON.stringify(headers, null, 2));
    console.log('Request body:', { row_identifier, column_name, new_value: String(new_value).substring(0, 100) });
    
    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: 'PUT',
        headers,
      });
    } catch (fetchError) {
      console.error('Error making fetch request:', fetchError);
      return NextResponse.json(
        { error: 'Failed to connect to backend', details: fetchError instanceof Error ? fetchError.message : String(fetchError) },
        { status: 500 }
      );
    }

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
        console.error('Backend error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { detail: errorText };
        }
        
        return NextResponse.json(
          { 
            error: errorData.detail || errorData.error || `Backend error: ${response.status}`,
            status: response.status,
            raw: errorText
          },
          { status: response.status }
        );
      } catch (err) {
        console.error('Error reading error response:', err);
        return NextResponse.json(
          { error: `Backend error: ${response.status}` },
          { status: response.status }
        );
      }
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Database cell update PUT error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error type:', error?.constructor?.name || typeof error);
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      { 
        error: errorMessage, 
        details: String(error),
        stack: errorStack,
        type: error?.constructor?.name || typeof error
      },
      { status: 500 }
    );
  }
}

