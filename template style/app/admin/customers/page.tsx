'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/ui/use-toast';
import {
  Users,
  Copy,
  CheckCircle,
  RefreshCw,
  CreditCard,
  Coins,
  Calendar,
} from 'lucide-react';

interface Payment {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  credits_purchased: number;
  stripe_payment_intent_id?: string;
  stripe_charge_id?: string;
  created_at?: string;
  completed_at?: string;
}

interface CreditsTransaction {
  id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description?: string;
  reference_id?: string;
  reference_type?: string;
  created_at?: string;
}

interface Subscription {
  id: string;
  status: string;
  current_period_end: number;
}

interface Customer {
  id: string;
  email: string;
  name?: string;
  created: number;
  subscriptions: Subscription[];
  user_id?: string;
  user_email?: string;
  plan?: string;
  plan_end_date?: string;
  credits_balance?: number;
  payments: Payment[];
  credits_transactions: CreditsTransaction[];
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchStripeData = useCallback(async () => {
    setLoading(true);
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('access_token')
          : null;
      const response = await fetch('/api/admin/stripe/customers', {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let errorText = '';
        let errorData = null;

        try {
          errorText = await response.text();
          try {
            errorData = JSON.parse(errorText);
          } catch {}
        } catch (e) {
          errorText = `HTTP ${response.status}: ${response.statusText || 'Unknown error'}`;
        }

        let errorMessage = 'Failed to fetch customers';

        if (errorData) {
          if (typeof errorData === 'string') {
            errorMessage = errorData;
          } else if (typeof errorData === 'object') {
            errorMessage =
              errorData.error ||
              errorData.detail ||
              errorData.message ||
              JSON.stringify(errorData);
          }
        } else if (errorText && errorText !== '[object Object]') {
          errorMessage = errorText;
        }

        if (typeof errorMessage === 'object') {
          errorMessage = JSON.stringify(errorMessage);
        }

        errorMessage = String(errorMessage);

        if (
          errorMessage.includes('Stripe API key') ||
          errorMessage.includes('STRIPE_SECRET_KEY')
        ) {
          throw new Error(
            'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.'
          );
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (data.success && data.data) {
        setCustomers(data.data);
        toast({
          title: 'Data Loaded',
          description: `Loaded ${data.count} customers`,
        });
      } else {
        setCustomers([]);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch customers';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({
        title: 'Copied',
        description: 'ID copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (timestamp: number | string) => {
    if (typeof timestamp === 'string') {
      return new Date(timestamp).toLocaleDateString();
    }
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const formatAmount = (cents: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  useEffect(() => {
    fetchStripeData();
  }, [fetchStripeData]);

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">
            Manage customer information, subscriptions, payments, and credits
            transactions
          </p>
        </div>
        <Button onClick={fetchStripeData} disabled={loading}>
          <RefreshCw
            className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
          />
          Refresh Data
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Customers ({customers.length})
          </CardTitle>
          <CardDescription>
            Customer information, subscriptions, payments, and credits
            transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {customers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No customers yet</h3>
                <p className="text-muted-foreground">
                  Customers will appear here once they make purchases or
                  subscriptions.
                </p>
              </div>
            ) : (
              customers.map(customer => (
                <Card key={customer.id} className="border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">
                          {customer.name || customer.email}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {customer.email}
                        </p>
                        {customer.user_email &&
                          customer.user_email !== customer.email && (
                            <p className="text-xs text-muted-foreground">
                              User: {customer.user_email}
                            </p>
                          )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            Created: {formatDate(customer.created)}
                          </span>
                          {customer.plan && (
                            <Badge variant="outline">
                              Plan: {customer.plan}
                            </Badge>
                          )}
                          {customer.credits_balance !== undefined && (
                            <Badge variant="secondary">
                              Credits: {customer.credits_balance}
                            </Badge>
                          )}
                          {customer.subscriptions &&
                            customer.subscriptions.length > 0 && (
                              <Badge variant="default">
                                {customer.subscriptions.length} subscription(s)
                              </Badge>
                            )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(customer.id, customer.id)
                          }
                        >
                          {copiedId === customer.id ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {customer.id.substring(0, 20)}...
                        </code>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="subscriptions" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="subscriptions">
                          Subscriptions
                        </TabsTrigger>
                        <TabsTrigger value="payments">Payments</TabsTrigger>
                        <TabsTrigger value="credits">Credits</TabsTrigger>
                      </TabsList>

                      <TabsContent value="subscriptions" className="space-y-2">
                        {customer.subscriptions &&
                        customer.subscriptions.length > 0 ? (
                          customer.subscriptions.map(sub => (
                            <div key={sub.id} className="border rounded p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <Badge
                                    variant={
                                      sub.status === 'active'
                                        ? 'default'
                                        : 'secondary'
                                    }
                                  >
                                    {sub.status}
                                  </Badge>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Period ends:{' '}
                                    {formatDate(sub.current_period_end)}
                                  </p>
                                </div>
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {sub.id.substring(0, 20)}...
                                </code>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No subscriptions
                          </p>
                        )}
                      </TabsContent>

                      <TabsContent value="payments" className="space-y-2">
                        {customer.payments && customer.payments.length > 0 ? (
                          customer.payments.map(payment => (
                            <div
                              key={payment.id}
                              className="border rounded p-3"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <CreditCard className="w-4 h-4" />
                                    <span className="font-semibold">
                                      {formatAmount(
                                        payment.amount_cents,
                                        payment.currency
                                      )}
                                    </span>
                                    <Badge
                                      variant={
                                        payment.status === 'completed'
                                          ? 'default'
                                          : payment.status === 'failed'
                                            ? 'destructive'
                                            : 'secondary'
                                      }
                                    >
                                      {payment.status}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Credits: {payment.credits_purchased} |{' '}
                                    {payment.created_at
                                      ? formatDate(payment.created_at)
                                      : 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No payments
                          </p>
                        )}
                      </TabsContent>

                      <TabsContent value="credits" className="space-y-2">
                        {customer.credits_transactions &&
                        customer.credits_transactions.length > 0 ? (
                          customer.credits_transactions.map(transaction => (
                            <div
                              key={transaction.id}
                              className="border rounded p-3"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Coins className="w-4 h-4" />
                                    <span
                                      className={`font-semibold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}
                                    >
                                      {transaction.amount > 0 ? '+' : ''}
                                      {transaction.amount}
                                    </span>
                                    <Badge variant="outline">
                                      {transaction.transaction_type}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Balance after: {transaction.balance_after} |{' '}
                                    {transaction.description ||
                                      'No description'}
                                  </p>
                                  {transaction.created_at && (
                                    <p className="text-xs text-muted-foreground">
                                      {formatDate(transaction.created_at)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No credits transactions
                          </p>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
