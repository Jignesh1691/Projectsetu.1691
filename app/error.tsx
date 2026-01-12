'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Application Error:', error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
                Something went wrong
            </h1>

            <p className="text-muted-foreground max-w-md mb-8">
                An unexpected error occurred while processing your request. Our team has been notified.
            </p>

            {process.env.NODE_ENV === 'development' && (
                <div className="mb-8 w-full max-w-xl p-4 bg-muted rounded-lg text-left overflow-auto border border-border">
                    <p className="text-xs font-mono text-destructive mb-1 font-bold">Error Details:</p>
                    <p className="text-xs font-mono whitespace-pre">{error.message}</p>
                    {error.stack && (
                        <details className="mt-2">
                            <summary className="text-[10px] cursor-pointer text-muted-foreground uppercase font-bold hover:text-foreground">View Stack Trace</summary>
                            <pre className="mt-2 text-[10px] leading-relaxed opacity-70">
                                {error.stack}
                            </pre>
                        </details>
                    )}
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
                <Button
                    onClick={() => reset()}
                    className="flex items-center gap-2 px-8 py-6 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
                >
                    <RefreshCcw className="h-4 w-4" />
                    Try Again
                </Button>

                <Button
                    variant="outline"
                    asChild
                    className="px-8 py-6 rounded-xl border-border/50 hover:bg-muted/50"
                >
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </Button>
            </div>
        </div>
    );
}
