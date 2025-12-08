"use client";

import Link from "next/link";
import { Github, Mail, Sparkles } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Logo } from "@/components/ui/logo";
import { EmailSubscription } from "@/components/common/email-subscription";

const footerLinks = {
  product: [
    { name: "Features", href: "/#features" },
    { name: "Pricing", href: "/#pricing" },
  ],
  company: [
    { name: "About", href: "/about" },
    { name: "Blog", href: "/blog" },
    { name: "Contact", href: "/contact" },
  ],
  legal: [
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
  ],
};

const socialLinks = [
  { name: "GitHub", href: siteConfig.links.github, icon: Github },
  { name: "Email", href: "mailto:hello@auditops.ai", icon: Mail },
];

export function Footer() {
  return (
    <footer className="bg-background border-t border-border">
      <div className="container mx-auto px-4">
        <div className="py-20 lg:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">
            {/* Brand Section - Takes up more space */}
            <div className="lg:col-span-5">
              <Link href="/" className="inline-flex items-center space-x-2 group mb-6">
                <Logo className="w-8 h-8 group-hover:scale-110 transition-transform duration-200" />
                <span className="text-xl font-bold tracking-tight">{siteConfig.name}</span>
              </Link>
              <p className="text-muted-foreground mb-8 max-w-md leading-relaxed">
                {siteConfig.description}
              </p>
              <div className="flex space-x-3">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <Link
                      key={social.name}
                      href={social.href}
                      className="p-2.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-110"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.name}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="sr-only">{social.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Links Grid - Better spacing */}
            <div className="lg:col-span-7">
              <div className="grid grid-cols-3 gap-8">
                {/* Product Links */}
                <div>
                  <h3 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wider">Product</h3>
                  <ul className="space-y-3">
                    {footerLinks.product.map((link) => (
                      <li key={link.name}>
                        <Link href={link.href} className="footer-link">
                          {link.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Company Links */}
                <div>
                  <h3 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wider">Company</h3>
                  <ul className="space-y-3">
                    {footerLinks.company.map((link) => (
                      <li key={link.name}>
                        <Link href={link.href} className="footer-link">
                          {link.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Legal Links */}
                <div>
                  <h3 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wider">Legal</h3>
                  <ul className="space-y-3">
                    {footerLinks.legal.map((link) => (
                      <li key={link.name}>
                        <Link href={link.href} className="footer-link">
                          {link.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="py-8 px-4 md:px-6 lg:px-8 border-t border-border">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">
                Stay updated with the latest features
              </span>
            </div>
            <EmailSubscription
              placeholder="Enter your email"
              buttonText="Subscribe"
              source="footer"
              variant="inline"
              size="md"
              className="w-full md:w-auto min-w-[320px]"
            />
          </div>
        </div>

        <div className="py-6 border-t border-border">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
            <div className="flex items-center text-muted-foreground">
              <span className="whitespace-nowrap">
                © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
              </span>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-muted-foreground whitespace-nowrap">All systems operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
