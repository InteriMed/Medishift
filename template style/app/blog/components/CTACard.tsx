"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface CTACardProps {
  message: string;
  buttonText?: string;
  position?: 'top' | 'bottom';
}

export function CTACard({ message, buttonText = "Sign up, it's Free", position = 'top' }: CTACardProps) {
  return (
    <Card className="h-full flex flex-col bg-muted/50 border-border/50 hover:shadow-lg transition-all duration-300">
      <CardContent className="flex flex-col justify-center items-center text-center p-8 h-full">
        <p className="text-foreground mb-6 text-lg font-medium">
          {message}
        </p>
        <Link href="/auth/signup">
          <Button className="bg-black text-white hover:bg-black/90 px-6 py-3 rounded-md font-medium">
            {buttonText}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}











