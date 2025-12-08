import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  requireAuth,
} from '../../../middleware/error-handling';
import { makeBackendRequest } from '../../../lib/utils/backend';

export const GET = withErrorHandling(
  requireAuth(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ invoiceId: string }> }
    ) => {
      const { invoiceId } = await params;

      const response = await makeBackendRequest(
        `/api/credits/invoices/${invoiceId}/download`,
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

      const blob = await response.blob();
      const contentDisposition =
        response.headers.get('Content-Disposition') ||
        `attachment; filename="invoice-${invoiceId}.pdf"`;

      return new NextResponse(blob, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': contentDisposition,
        },
      });
    }
  )
);
