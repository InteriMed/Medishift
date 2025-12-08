'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import {
  Menu,
  X,
  Home,
  Shield,
  Play,
  FileText,
  DollarSign,
  Sparkles,
  HelpCircle,
  Building2,
  Scale,
  Settings,
  MessageSquare,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { siteConfig } from '@/config/site';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';

const ListItem = React.forwardRef<
  React.ElementRef<'a'>,
  React.ComponentPropsWithoutRef<'a'> & { icon?: React.ElementType }
>(({ className, title, children, icon: Icon, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            'block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
            className
          )}
          {...props}
        >
          <div className="flex items-center gap-2 text-sm font-medium leading-none">
            {Icon && <Icon className="h-4 w-4 text-primary" />}
            <span className="font-semibold">{title}</span>
          </div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1.5">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = 'ListItem';

export function Navigation() {
  const { isAuthenticated, isAdmin } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const productsMenu = [
    {
      name: 'Features',
      href: '/features',
      icon: Sparkles,
      description: 'Explore the powerful capabilities of our AI compliance platform.',
    },
    {
      name: 'Pricing',
      href: '/pricing',
      icon: DollarSign,
      description: 'Flexible plans designed to scale with your compliance needs.',
    },
    {
      name: 'Ask The Act',
      href: '/ask-the-act',
      icon: Scale,
      description: 'Get instant, AI-powered answers about the EU AI Act.',
    },
  ];

  const resourcesMenu = [
    {
      name: 'Blog',
      href: '/blog',
      icon: FileText,
      description: 'Latest insights, updates, and guides on AI regulation.',
    },
    {
      name: 'FAQ',
      href: '/faq',
      icon: HelpCircle,
      description: 'Common questions about our platform and the EU AI Act.',
    },
  ];

  const companyMenu = [
    {
      name: 'About',
      href: '/about',
      icon: Building2,
      description: 'Learn about our mission to simplify AI compliance.',
    },
    {
      name: 'Contact',
      href: '/contact',
      icon: MessageSquare,
      description: 'Get in touch with our team for support or inquiries.',
    },
  ];



  const adminNavigation = [
    {
      name: 'Admin Panel',
      href: '/admin',
      icon: Shield,
      description: 'System administration and user management.',
    },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const clearSession = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('clipizy_creating_project');
      if ((window as any).pendingMessages) {
        (window as any).pendingMessages.clear();
      }
    }
  };

  return (
    <nav className="bg-background/80 backdrop-blur-md border-b border-border/40 sticky top-0 z-50 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link
              href={isAuthenticated ? '/dashboard/create' : '/'}
              className="flex items-center space-x-3 group"
              onClick={clearSession}
            >
              <div className="transition-transform duration-300 group-hover:scale-105">
                <Logo className="w-9 h-9" />
              </div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent group-hover:from-primary transition-colors duration-300">
                {siteConfig.name}
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center justify-center flex-1 px-8">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link
                      href="/"
                      className={cn(
                        navigationMenuTriggerStyle(),
                        isActive('/') && 'bg-accent text-accent-foreground'
                      )}
                      onClick={clearSession}
                    >
                      Home
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger>Products</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                      {productsMenu.map((item) => (
                        <ListItem
                          key={item.name}
                          title={item.name}
                          href={item.href}
                          icon={item.icon}
                          onClick={clearSession}
                        >
                          {item.description}
                        </ListItem>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                      {resourcesMenu.map((item) => (
                        <ListItem
                          key={item.name}
                          title={item.name}
                          href={item.href}
                          icon={item.icon}
                        >
                          {item.description}
                        </ListItem>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger>Company</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                      {companyMenu.map((item) => (
                        <ListItem
                          key={item.name}
                          title={item.name}
                          href={item.href}
                          icon={item.icon}
                        >
                          {item.description}
                        </ListItem>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>



                {isAuthenticated && isAdmin && (
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link
                        href="/admin"
                        className={cn(
                          navigationMenuTriggerStyle(),
                          isActive('/admin') && 'bg-accent text-accent-foreground'
                        )}
                      >
                        <div className="flex items-center gap-1">
                          <span>Admin</span>
                          <Badge variant="destructive" className="text-[10px] h-4 px-1">
                            Admin
                          </Badge>
                        </div>
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-3">
            <div className="hidden lg:flex items-center space-x-2">
              {!isAuthenticated ? (
                <>
                  <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
                    <Link href="/auth/login">Sign In</Link>
                  </Button>
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md transition-all duration-200" asChild>
                    <Link href="/auth/register">
                      <Play className="w-4 h-4 mr-2" />
                      Get Started
                    </Link>
                  </Button>
                </>
              ) : (
                <Button variant="default" asChild className="shadow-sm hover:shadow-md transition-all duration-200">
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              )}
            </div>

            {/* Mobile Menu */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" className="lg:hidden" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 overflow-y-auto">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-8">
                    <span className="text-lg font-semibold">Menu</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex-1 space-y-8">
                    <div className="space-y-3">
                      <Link
                        href="/"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          clearSession();
                        }}
                        className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive('/')
                          ? 'text-primary bg-primary/10'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                          }`}
                      >
                        <Home className="w-4 h-4" />
                        <span>Home</span>
                      </Link>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
                        Products
                      </h3>
                      {productsMenu.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => {
                              setIsMobileMenuOpen(false);
                              clearSession();
                            }}
                            className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive(item.href)
                              ? 'text-primary bg-primary/10'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                              }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
                        Resources
                      </h3>
                      {resourcesMenu.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive(item.href)
                              ? 'text-primary bg-primary/10'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                              }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
                        Company
                      </h3>
                      {companyMenu.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive(item.href)
                              ? 'text-primary bg-primary/10'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                              }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>


                  </div>

                  <div className="border-t pt-6 space-y-3">
                    {!isAuthenticated ? (
                      <>
                        <Button variant="outline" className="w-full" asChild>
                          <Link
                            href="/auth/login"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            Sign In
                          </Link>
                        </Button>
                        <Button className="w-full" asChild>
                          <Link
                            href="/auth/register"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Get Started
                          </Link>
                        </Button>
                      </>
                    ) : (
                      <Button className="w-full" asChild>
                        <Link
                          href="/dashboard"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Go to Dashboard
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
