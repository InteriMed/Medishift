'use client';

export default function AskTheActLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background bg-swiss-cross text-foreground font-sans antialiased">
      {children}
    </div>
  );
}

