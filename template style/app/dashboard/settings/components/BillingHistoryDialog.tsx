'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/ui/use-toast';
import { getBackendUrl } from '@/lib/config';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Payment {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  payment_method: string;
  credits_purchased: number;
  description: string;
  created_at: string;
  completed_at: string | null;
}

interface BillingHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BillingHistoryDialog({
  open,
  onOpenChange,
}: BillingHistoryDialogProps) {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBillingHistory = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const backendUrl = getBackendUrl();
      const response = await fetch(
        `${backendUrl}/api/credits/payments?limit=50`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail ||
            `Failed to load billing history (${response.status})`
        );
      }

      const data = await response.json();
      setPayments(data.data || []);
    } catch (error: any) {
      console.error('Error loading billing history:', error);
      const errorMessage =
        error.message === 'Failed to fetch'
          ? 'Unable to connect to the server. Please check your connection.'
          : error.message || 'Failed to load billing history';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (open) {
      loadBillingHistory();
    }
  }, [open, loadBillingHistory]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case 'refunded':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">Refunded</Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'stripe_card':
        return 'Credit Card';
      case 'stripe_bank':
        return 'Bank Transfer';
      default:
        return method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Billing History
          </DialogTitle>
          <DialogDescription>
            View your complete payment and billing history
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : payments.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No billing history found. Your payment history will appear here.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {payments.map(payment => (
              <div
                key={payment.id}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <div className="font-medium">{payment.description}</div>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>
                        Payment Method:{' '}
                        {getPaymentMethodLabel(payment.payment_method)}
                      </div>
                      <div>Date: {formatDate(payment.created_at)}</div>
                      {payment.completed_at && (
                        <div>Completed: {formatDate(payment.completed_at)}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold mb-2">
                      {formatAmount(payment.amount_cents, payment.currency)}
                    </div>
                    {getStatusBadge(payment.status)}
                  </div>
                </div>
                {payment.credits_purchased > 0 && (
                  <div className="pt-3 border-t text-sm text-muted-foreground">
                    Credits Purchased:{' '}
                    <span className="font-medium">
                      {payment.credits_purchased}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
