"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/ui/use-toast";
import {
  Mail,
  MessageSquare,
  Users,
  HelpCircle,
  Shield,
  CheckCircle,
  ArrowRight,
  FileText
} from "lucide-react";

const supportTopics = [
  {
    icon: HelpCircle,
    title: "General Inquiries",
    description: "Questions about the platform, pricing, or account management."
  },
  {
    icon: Shield,
    title: "Compliance Support",
    description: "Help interpreting Annex IV reports or risk classifications."
  },
  {
    icon: Users,
    title: "Enterprise Sales",
    description: "Custom deployments, SLAs, and volume licensing."
  },
  {
    icon: FileText,
    title: "Legal & Privacy",
    description: "Questions about data residency, GDPR, or our terms."
  }
];

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    subject: "",
    topic: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: typeof formData) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev: typeof formData) => ({ ...prev, topic: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create mailto link with form data
      const subject = encodeURIComponent(`[${formData.topic}] ${formData.subject}`);
      const body = encodeURIComponent(`
Name: ${formData.name}
Email: ${formData.email}
Company: ${formData.company || 'N/A'}
Topic: ${formData.topic}
Subject: ${formData.subject}

Message:
${formData.message}
      `);

      const mailtoLink = `mailto:contact@auditops.ai?subject=${subject}&body=${body}`;

      // Open email client
      window.location.href = mailtoLink;

      toast({
        title: "Email Client Opened!",
        description: "Your email client should open with the message pre-filled. Send it to contact@auditops.ai",
      });

      setFormData({
        name: "",
        email: "",
        company: "",
        subject: "",
        topic: "",
        message: ""
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Please email us directly at contact@auditops.ai",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/10 selection:text-primary pt-16">
      {/* HERO SECTION */}
      <section className="relative py-20 overflow-hidden">
        <div className="fixed inset-0 bg-swiss-cross opacity-30 pointer-events-none" />

        <div className="relative container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm font-medium border-primary/20 text-primary bg-primary/5 rounded-full">
              <MessageSquare className="w-4 h-4 mr-2" />
              Contact Us
            </Badge>

            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight tracking-tight">
              Get in <span className="text-primary">Touch</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              Have questions about AuditOps? Need help with your compliance reports?
              Want to discuss enterprise solutions? We're here to help.
            </p>
          </div>
        </div>
      </section>

      {/* CONTACT FORM & SUPPORT TOPICS */}
      <section className="py-12 bg-secondary/30 border-y border-border/40">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* CONTACT FORM */}
            <div>
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-2xl">Send us a Message</CardTitle>
                  <CardDescription>
                    Fill out the form below and we'll get back to you as soon as possible.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="company">Company</Label>
                        <Input
                          id="company"
                          name="company"
                          value={formData.company}
                          onChange={handleInputChange}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="topic">Topic *</Label>
                        <Select value={formData.topic} onValueChange={handleSelectChange}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select a topic" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General Inquiries</SelectItem>
                            <SelectItem value="compliance">Compliance Support</SelectItem>
                            <SelectItem value="enterprise">Enterprise Sales</SelectItem>
                            <SelectItem value="legal">Legal & Privacy</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="subject">Subject *</Label>
                      <Input
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        required
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        required
                        rows={6}
                        className="mt-1"
                        placeholder="Tell us how we can help you..."
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* SUPPORT TOPICS */}
            <div>
              <h2 className="text-2xl font-bold mb-6">How can we help?</h2>
              <div className="space-y-4">
                {supportTopics.map((topic, index) => {
                  const Icon = topic.icon;
                  return (
                    <Card key={index} className="p-4 hover:shadow-md transition-shadow duration-200 border-border bg-card">
                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">{topic.title}</h3>
                          <p className="text-sm text-muted-foreground">{topic.description}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <div className="mt-8 p-6 bg-primary/5 rounded-xl border border-primary/20">
                <h3 className="font-semibold mb-2 flex items-center">
                  <CheckCircle className="w-5 h-5 text-primary mr-2" />
                  Quick Response
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Our team typically responds within 24 hours. For urgent compliance issues, please use the priority support channel in your dashboard.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard">
                    Go to Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-24 border-t border-border/40">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">
            Still Have Questions?
          </h2>
          <p className="text-xl text-muted-foreground mb-10">
            Can't find what you're looking for? Our support team is ready to assist you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="h-14 px-8 text-lg" asChild>
              <Link href="mailto:contact@auditops.ai">
                <Mail className="w-5 h-5 mr-2" />
                Email Support
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg" asChild>
              <Link href="/dashboard/create">
                <Shield className="w-5 h-5 mr-2" />
                Start Free Audit
              </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
