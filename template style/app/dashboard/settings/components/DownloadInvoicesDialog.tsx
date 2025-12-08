'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Invoice {
  id: string;
  invoice_id?: string;
  amount_cents: number;
  currency: string;
  status: string;
  description: string;
  created_at: string;
  stripe_invoice_id?: string;
}

interface DownloadInvoicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DownloadInvoicesDialog({
  open,
  onOpenChange,
}: DownloadInvoicesDialogProps) {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/v1/users/invoices', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setInvoices(result.data || result || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || errorData.error || 'Failed to load invoices'
        );
      }
    } catch (error: any) {
      console.error('Error loading invoices:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load invoices',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (open) {
      loadInvoices();
    }
  }, [open, loadInvoices]);

  const downloadInvoice = async (invoice: Invoice) => {
    setDownloading(invoice.id);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const invoiceId =
        invoice.stripe_invoice_id || invoice.invoice_id || invoice.id;
      const response = await fetch(
        `/api/v1/users/invoices/${invoiceId}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoice.id}-${new Date(invoice.created_at).toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: 'Success',
          description: 'Invoice downloaded successfully',
        });
      } else {
        throw new Error('Failed to download invoice');
      }
    } catch (error: any) {
      console.error('Error downloading invoice:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to download invoice',
        variant: 'destructive',
      });
    } finally {
      setDownloading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatAmount = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Download Invoices
          </DialogTitle>
          <DialogDescription>
            View and download your payment invoices
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : invoices.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No invoices found. Invoices will appear here after you make a
              payment.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {invoices.map(invoice => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {invoice.description || 'Invoice'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(invoice.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg font-semibold">
                      {formatAmount(invoice.amount_cents, invoice.currency)}
                    </span>
                    {getStatusBadge(invoice.status)}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadInvoice(invoice)}
                  disabled={downloading === invoice.id}
                >
                  {downloading === invoice.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Download
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
