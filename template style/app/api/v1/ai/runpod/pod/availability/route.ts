import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '../../../../middleware/error-handling';
import { makeBackendRequest } from '../../../../lib/utils/backend';
import { TimeoutError } from '../../../../middleware/error-handling';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const workflowId = searchParams.get('workflow_id');
  
  const url = workflowId 
    ? `/api/ai/runpod/pod/availability?workflow_id=${encodeURIComponent(workflowId)}`
    : '/api/ai/runpod/pod/availability';
  
  try {
    const response = await makeBackendRequest(url, {
      method: 'GET',
      timeout: 15000,
    }, request);

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    if (error instanceof TimeoutError) {
      const fallbackResponse = {
        status: "not_ready",
        workflow_id: workflowId || null,
        pod_status: {
          ready: false,
          workflow_id: workflowId || null,
          service_type: workflowId?.toLowerCase() === "ollama" ? "local" : undefined,
          message: "Availability check timed out, falling back to alternative LLM",
        },
      };
      return NextResponse.json(fallbackResponse, { status: 200 });
    }
    throw error;
  }
});

