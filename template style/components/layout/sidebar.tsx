'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    FileText,
    Settings,
    GitBranch,
    Scale,
} from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { siteConfig } from '@/config/site';

const sidebarItems = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
    },
    {
        title: 'Repositories',
        href: '/dashboard/repositories',
        icon: GitBranch,
    },
    {
        title: 'Reports',
        href: '/dashboard/reports',
        icon: FileText,
    },
    {
        title: 'Compliance Assistant',
        href: '/dashboard/Compliance%20Assistant',
        icon: Scale,
    },
    {
        title: 'Compliance Settings',
        href: '/dashboard/settings',
        icon: Settings,
    },
    {
        title: 'Repositories (TEST)',
        href: '/dashboard/repositories_TEST',
        icon: GitBranch,
    },
    {
        title: 'Reports (TEST)',
        href: '/dashboard/reports_TEST',
        icon: FileText,
    },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="hidden border-r bg-card/50 backdrop-blur-xl lg:block w-64 h-screen fixed left-0 top-0 z-30">
            <div className="flex h-16 items-center border-b px-6">
                <Link href="/" className="flex items-center gap-3 font-semibold group">
                    <div className="transition-transform duration-300 group-hover:scale-110">
                        <Logo className="h-8 w-8" />
                    </div>
                    <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent group-hover:from-primary transition-colors duration-300">
                        {siteConfig.name}
                    </span>
                </Link>
            </div>
            <div className="flex-1 overflow-auto py-4">
                <nav className="grid items-start px-4 text-sm font-medium">
                    {sidebarItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary',
                                    pathname === item.href || pathname?.startsWith(item.href + '/')
                                        ? 'bg-muted text-primary'
                                        : 'text-muted-foreground'
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {item.title}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}
