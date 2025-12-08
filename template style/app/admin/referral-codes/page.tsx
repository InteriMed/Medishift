'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Gift,
  Plus,
  Copy,
  RefreshCw,
  CheckCircle,
  XCircle,
  Settings,
  Mail,
  Download,
  Upload,
  Image as ImageIcon,
  Send,
  Save,
} from 'lucide-react';
import { useToast } from '@/hooks/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ReferralCode {
  id: string;
  code: string;
  origin: string;
  is_used: boolean;
  is_active: boolean;
  created_by_user_id: string | null;
  used_by_user_id: string | null;
  created_at: string;
  used_at: string | null;
}

export default function AdminReferralCodesPage() {
  const { toast } = useToast();
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [requireReferralCode, setRequireReferralCode] = useState(false);
  const [checkingRequirement, setCheckingRequirement] = useState(true);
  const [generateCount, setGenerateCount] = useState(10);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [emailList, setEmailList] = useState('');
  const [emailNewsletter, setEmailNewsletter] = useState(false);
  const [emailConditions, setEmailConditions] = useState(false);
  const [activeEmailTab, setActiveEmailTab] = useState('referral');
  const [referralTemplate, setReferralTemplate] = useState(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Referral Code</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
        {{LOGO}}
    </div>
    <h1 style="color: #2c3e50;">Welcome to Clipizy!</h1>
    <p>Thank you for joining us. Here's your unique referral code:</p>
    <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
        <h2 style="color: #27ae60; font-size: 32px; margin: 0;">{{REFERRAL_CODE}}</h2>
    </div>
    <p>Share this code with friends and family to get started!</p>
    <p>Best regards,<br>The Clipizy Team</p>
</body>
</html>`);
  const [newsletterTemplate, setNewsletterTemplate] = useState(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Newsletter</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
        {{LOGO}}
    </div>
    <h1 style="color: #2c3e50;">{{TITLE}}</h1>
    <div style="margin: 20px 0;">
        {{CONTENT}}
    </div>
    <p>Best regards,<br>The Clipizy Team</p>
</body>
</html>`);
  const [logoBlack, setLogoBlack] = useState<string | null>(null);
  const [logoWhite, setLogoWhite] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [newsletterTitle, setNewsletterTitle] = useState('');
  const [newsletterContent, setNewsletterContent] = useState('');

  const loadEmailTemplates = useCallback(async () => {
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('access_token')
          : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch('/api/admin/email-templates', {
        headers,
      });
      if (response.ok) {
        const data = await response.json();
        if (data.referral) {
          setReferralTemplate(data.referral.template || referralTemplate);
          if (data.referral.logo_black) setLogoBlack(data.referral.logo_black);
          if (data.referral.logo_white) setLogoWhite(data.referral.logo_white);
        }
        if (data.newsletter) {
          setNewsletterTemplate(data.newsletter.template || newsletterTemplate);
          if (data.newsletter.logo_black && !logoBlack)
            setLogoBlack(data.newsletter.logo_black);
          if (data.newsletter.logo_white && !logoWhite)
            setLogoWhite(data.newsletter.logo_white);
        }
      }
    } catch (error) {
      console.error('Failed to load email templates:', error);
    }
  }, [referralTemplate, newsletterTemplate, logoBlack, logoWhite]);

  const loadReferralCodes = useCallback(async () => {
    try {
      setLoading(true);
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('access_token')
          : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch('/api/admin/referral-codes?limit=100', {
        headers,
      });
      const data = await response.json();
      setCodes(data.codes || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load referral codes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadRequirement = async () => {
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('access_token')
          : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch('/api/admin/referral-codes/requirement', {
        headers,
      });
      const data = await response.json();
      setRequireReferralCode(data.require_referral_code || false);
    } catch (error: any) {
      console.error('Error loading requirement:', error);
    } finally {
      setCheckingRequirement(false);
    }
  };

  useEffect(() => {
    loadReferralCodes();
    loadRequirement();
    loadEmailTemplates();
  }, [loadReferralCodes, loadEmailTemplates]);

  const handleGenerateCodes = async () => {
    try {
      setGenerating(true);
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('access_token')
          : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch('/api/admin/referral-codes/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          count: generateCount,
          origin: 'admin',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success!',
          description: `Generated ${data.count} referral codes`,
        });
        setIsGenerateDialogOpen(false);
        setGenerateCount(10);
        loadReferralCodes();
      } else {
        toast({
          title: 'Error',
          description: data.detail || 'Failed to generate codes',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate codes',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleRequirement = async (required: boolean) => {
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('access_token')
          : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch('/api/admin/referral-codes/requirement', {
        method: 'POST',
        headers,
        body: JSON.stringify({ required }),
      });

      const data = await response.json();

      if (response.ok) {
        setRequireReferralCode(required);
        toast({
          title: 'Success!',
          description:
            data.message ||
            `Referral code requirement ${required ? 'enabled' : 'disabled'}`,
        });
      } else {
        toast({
          title: 'Error',
          description: data.detail || 'Failed to update requirement',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update requirement',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateEmails = async () => {
    const emails = emailList
      .split('\n')
      .map(e => e.trim())
      .filter(e => e && e.includes('@'));

    if (emails.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter at least one valid email address',
        variant: 'destructive',
      });
      return;
    }

    try {
      setGenerating(true);
      const response = await fetch('/api/admin/mailing-list/generate-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emails,
          mailing_selections: {
            newsletter: emailNewsletter,
            conditions: emailConditions,
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success!',
          description: `Generated ${data.generated} emails with unique referral codes`,
        });
        setEmailList('');
        setEmailNewsletter(false);
        setEmailConditions(false);
        loadReferralCodes();
      } else {
        toast({
          title: 'Error',
          description: data.detail || 'Failed to generate emails',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate emails',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Referral code copied to clipboard',
    });
  };

  const unusedCodes = codes.filter(c => !c.is_used && c.is_active);
  const usedCodes = codes.filter(c => c.is_used);
  const adminCodes = codes.filter(c => c.origin === 'admin');

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
          <Gift className="w-8 h-8" />
          Referral Code Management
        </h1>
        <p className="text-muted-foreground">
          Generate and manage referral codes for user registration
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{codes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Unused Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {unusedCodes.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Used Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {usedCodes.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Referral Code for Registration</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, users must provide a referral code to create an
                account
              </p>
            </div>
            <Switch
              checked={requireReferralCode}
              onCheckedChange={handleToggleRequirement}
              disabled={checkingRequirement}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Creation & Sending
          </CardTitle>
          <CardDescription>
            Create and send emails with templates for referral codes or
            newsletters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeEmailTab}
            onValueChange={setActiveEmailTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="referral">Referral Codes</TabsTrigger>
              <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
            </TabsList>

            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Logo (Main)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = e => {
                            const mainLogo = e.target?.result as string;
                            setLogoBlack(mainLogo);

                            const img = new Image();
                            img.onload = () => {
                              const canvas = document.createElement('canvas');
                              const ctx = canvas.getContext('2d');
                              if (!ctx) return;

                              canvas.width = img.width;
                              canvas.height = img.height;

                              ctx.drawImage(img, 0, 0);

                              const imageData = ctx.getImageData(
                                0,
                                0,
                                canvas.width,
                                canvas.height
                              );
                              const data = imageData.data;

                              for (let i = 0; i < data.length; i += 4) {
                                const r = data[i];
                                const g = data[i + 1];
                                const b = data[i + 2];
                                const a = data[i + 3];

                                if (a > 0) {
                                  const brightness =
                                    r * 0.299 + g * 0.587 + b * 0.114;
                                  const threshold = 128;

                                  if (brightness < threshold) {
                                    data[i] = 255;
                                    data[i + 1] = 255;
                                    data[i + 2] = 255;
                                  } else {
                                    const invertedR = 255 - r;
                                    const invertedG = 255 - g;
                                    const invertedB = 255 - b;
                                    data[i] = invertedR;
                                    data[i + 1] = invertedG;
                                    data[i + 2] = invertedB;
                                  }
                                }
                              }

                              ctx.putImageData(imageData, 0, 0);
                              const whiteLogo = canvas.toDataURL('image/png');
                              setLogoWhite(whiteLogo);
                            };
                            img.src = mainLogo;
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                      id="logo-black"
                    />
                    <Label htmlFor="logo-black" className="cursor-pointer">
                      <Button
                        variant="outline"
                        type="button"
                        className="w-full"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Main Logo
                      </Button>
                    </Label>
                    {logoBlack && (
                      <img
                        src={logoBlack}
                        alt="Main logo"
                        className="h-12 object-contain"
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    White version will be auto-generated
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Logo (White) - Auto-generated</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = e =>
                            setLogoWhite(e.target?.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                      id="logo-white"
                    />
                    <Label htmlFor="logo-white" className="cursor-pointer">
                      <Button
                        variant="outline"
                        type="button"
                        className="w-full"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Custom White Logo
                      </Button>
                    </Label>
                    {logoWhite && (
                      <img
                        src={logoWhite}
                        alt="White logo"
                        className="h-12 object-contain bg-gray-200 p-2 rounded"
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Optional: Override auto-generated version
                  </p>
                </div>
              </div>

              <TabsContent value="referral" className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Email Template (HTML)</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setSavingTemplate(true);
                        try {
                          const token =
                            typeof window !== 'undefined'
                              ? localStorage.getItem('access_token')
                              : null;
                          const headers: Record<string, string> = {
                            'Content-Type': 'application/json',
                          };
                          if (token) {
                            headers['Authorization'] = `Bearer ${token}`;
                          }
                          const response = await fetch(
                            '/api/admin/email-templates',
                            {
                              method: 'POST',
                              headers,
                              body: JSON.stringify({
                                type: 'referral',
                                template: referralTemplate,
                                logo_black: logoBlack,
                                logo_white: logoWhite,
                              }),
                            }
                          );
                          if (response.ok) {
                            toast({
                              title: 'Success!',
                              description: 'Template saved successfully',
                            });
                          } else {
                            throw new Error('Failed to save template');
                          }
                        } catch (error: any) {
                          toast({
                            title: 'Error',
                            description:
                              error.message || 'Failed to save template',
                            variant: 'destructive',
                          });
                        } finally {
                          setSavingTemplate(false);
                        }
                      }}
                      disabled={savingTemplate}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {savingTemplate ? 'Saving...' : 'Save Template'}
                    </Button>
                  </div>
                  <Textarea
                    value={referralTemplate}
                    onChange={e => setReferralTemplate(e.target.value)}
                    rows={15}
                    className="resize-none font-mono text-sm"
                    placeholder="Enter HTML template. Use {{LOGO}}, {{REFERRAL_CODE}} as placeholders"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Addresses (one per line)</Label>
                  <Textarea
                    placeholder="user1@example.com&#10;user2@example.com&#10;user3@example.com"
                    value={emailList}
                    onChange={e => setEmailList(e.target.value)}
                    rows={6}
                    className="resize-none"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="email-newsletter"
                      checked={emailNewsletter}
                      onCheckedChange={checked =>
                        setEmailNewsletter(checked === true)
                      }
                    />
                    <Label
                      htmlFor="email-newsletter"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Subscribe to newsletter
                    </Label>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="email-conditions"
                      checked={emailConditions}
                      onCheckedChange={checked =>
                        setEmailConditions(checked === true)
                      }
                    />
                    <Label
                      htmlFor="email-conditions"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Accept conditions
                    </Label>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={handleGenerateEmails}
                    disabled={generating}
                  >
                    {generating ? 'Generating...' : 'Generate Codes'}
                  </Button>
                  <Button
                    onClick={async () => {
                      const emails = emailList
                        .split('\n')
                        .map(e => e.trim())
                        .filter(e => e && e.includes('@'));

                      if (emails.length === 0) {
                        toast({
                          title: 'Validation Error',
                          description:
                            'Please enter at least one valid email address',
                          variant: 'destructive',
                        });
                        return;
                      }

                      setSending(true);
                      try {
                        const token =
                          typeof window !== 'undefined'
                            ? localStorage.getItem('access_token')
                            : null;
                        const headers: Record<string, string> = {
                          'Content-Type': 'application/json',
                        };
                        if (token) {
                          headers['Authorization'] = `Bearer ${token}`;
                        }
                        const response = await fetch('/api/admin/emails/send', {
                          method: 'POST',
                          headers,
                          body: JSON.stringify({
                            type: 'referral',
                            emails,
                            template: referralTemplate,
                            logo_black: logoBlack,
                            logo_white: logoWhite,
                            mailing_selections: {
                              newsletter: emailNewsletter,
                              conditions: emailConditions,
                            },
                          }),
                        });
                        const data = await response.json();
                        if (response.ok) {
                          toast({
                            title: 'Success!',
                            description: `Sent ${data.sent} emails successfully`,
                          });
                          setEmailList('');
                          setEmailNewsletter(false);
                          setEmailConditions(false);
                        } else {
                          throw new Error(
                            data.detail || 'Failed to send emails'
                          );
                        }
                      } catch (error: any) {
                        toast({
                          title: 'Error',
                          description: error.message || 'Failed to send emails',
                          variant: 'destructive',
                        });
                      } finally {
                        setSending(false);
                      }
                    }}
                    disabled={sending || generating}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {sending ? 'Sending...' : 'Send Emails'}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="newsletter" className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Email Template (HTML)</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setSavingTemplate(true);
                        try {
                          const token =
                            typeof window !== 'undefined'
                              ? localStorage.getItem('access_token')
                              : null;
                          const headers: Record<string, string> = {
                            'Content-Type': 'application/json',
                          };
                          if (token) {
                            headers['Authorization'] = `Bearer ${token}`;
                          }
                          const response = await fetch(
                            '/api/admin/email-templates',
                            {
                              method: 'POST',
                              headers,
                              body: JSON.stringify({
                                type: 'newsletter',
                                template: newsletterTemplate,
                                logo_black: logoBlack,
                                logo_white: logoWhite,
                              }),
                            }
                          );
                          if (response.ok) {
                            toast({
                              title: 'Success!',
                              description: 'Template saved successfully',
                            });
                          } else {
                            throw new Error('Failed to save template');
                          }
                        } catch (error: any) {
                          toast({
                            title: 'Error',
                            description:
                              error.message || 'Failed to save template',
                            variant: 'destructive',
                          });
                        } finally {
                          setSavingTemplate(false);
                        }
                      }}
                      disabled={savingTemplate}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {savingTemplate ? 'Saving...' : 'Save Template'}
                    </Button>
                  </div>
                  <Textarea
                    value={newsletterTemplate}
                    onChange={e => setNewsletterTemplate(e.target.value)}
                    rows={15}
                    className="resize-none font-mono text-sm"
                    placeholder="Enter HTML template. Use {{LOGO}}, {{TITLE}}, {{CONTENT}} as placeholders"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Newsletter Title</Label>
                    <Input
                      value={newsletterTitle}
                      onChange={e => setNewsletterTitle(e.target.value)}
                      placeholder="Enter newsletter title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Recipients (one per line)</Label>
                    <Textarea
                      placeholder="user1@example.com&#10;user2@example.com"
                      value={emailList}
                      onChange={e => setEmailList(e.target.value)}
                      rows={6}
                      className="resize-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Newsletter Content (HTML)</Label>
                  <Textarea
                    value={newsletterContent}
                    onChange={e => setNewsletterContent(e.target.value)}
                    rows={8}
                    className="resize-none"
                    placeholder="Enter newsletter content in HTML format"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={async () => {
                      const emails = emailList
                        .split('\n')
                        .map(e => e.trim())
                        .filter(e => e && e.includes('@'));

                      if (emails.length === 0) {
                        toast({
                          title: 'Validation Error',
                          description:
                            'Please enter at least one valid email address',
                          variant: 'destructive',
                        });
                        return;
                      }

                      if (!newsletterTitle.trim()) {
                        toast({
                          title: 'Validation Error',
                          description: 'Please enter a newsletter title',
                          variant: 'destructive',
                        });
                        return;
                      }

                      setSending(true);
                      try {
                        const token =
                          typeof window !== 'undefined'
                            ? localStorage.getItem('access_token')
                            : null;
                        const headers: Record<string, string> = {
                          'Content-Type': 'application/json',
                        };
                        if (token) {
                          headers['Authorization'] = `Bearer ${token}`;
                        }
                        const response = await fetch('/api/admin/emails/send', {
                          method: 'POST',
                          headers,
                          body: JSON.stringify({
                            type: 'newsletter',
                            emails,
                            template: newsletterTemplate,
                            logo_black: logoBlack,
                            logo_white: logoWhite,
                            title: newsletterTitle,
                            content: newsletterContent,
                          }),
                        });
                        const data = await response.json();
                        if (response.ok) {
                          toast({
                            title: 'Success!',
                            description: `Sent ${data.sent} emails successfully`,
                          });
                          setEmailList('');
                          setNewsletterTitle('');
                          setNewsletterContent('');
                        } else {
                          throw new Error(
                            data.detail || 'Failed to send emails'
                          );
                        }
                      } catch (error: any) {
                        toast({
                          title: 'Error',
                          description: error.message || 'Failed to send emails',
                          variant: 'destructive',
                        });
                      } finally {
                        setSending(false);
                      }
                    }}
                    disabled={sending}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {sending ? 'Sending...' : 'Send Newsletter'}
                  </Button>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 mb-6">
        <Dialog
          open={isGenerateDialogOpen}
          onOpenChange={setIsGenerateDialogOpen}
        >
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Generate Codes
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Referral Codes</DialogTitle>
              <DialogDescription>
                Generate new referral codes for distribution
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Number of Codes</Label>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  value={generateCount}
                  onChange={e =>
                    setGenerateCount(parseInt(e.target.value) || 10)
                  }
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsGenerateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleGenerateCodes} disabled={generating}>
                  {generating ? 'Generating...' : 'Generate'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Button
          variant="outline"
          onClick={loadReferralCodes}
          disabled={loading}
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            Loading referral codes...
          </p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Referral Codes</CardTitle>
            <CardDescription>
              {unusedCodes.length} unused, {usedCodes.length} used
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {codes.map(code => (
                <div
                  key={code.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <code className="font-mono text-lg font-bold">
                      {code.code}
                    </code>
                    <Badge variant={code.is_used ? 'secondary' : 'default'}>
                      {code.is_used ? (
                        <>
                          <XCircle className="w-3 h-3 mr-1" />
                          Used
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </>
                      )}
                    </Badge>
                    <Badge variant="outline">{code.origin}</Badge>
                    {code.used_at && (
                      <span className="text-sm text-muted-foreground">
                        Used: {new Date(code.used_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!code.is_used && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(code.code)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {codes.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No referral codes found. Generate some to get started.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
