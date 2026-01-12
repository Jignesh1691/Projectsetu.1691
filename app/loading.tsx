'use client';

import { Loader2 } from 'lucide-react';

export default function Loading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] w-full bg-background/50 backdrop-blur-sm animate-in fade-in duration-500">
            <div className="relative">
                {/* Decorative background glow */}
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />

                {/* Outer rotating ring */}
                <div className="relative flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4 shadow-xl shadow-primary/10" />

                    <div className="flex flex-col items-center space-y-2">
                        <h3 className="text-lg font-bold tracking-tight text-foreground/80">
                            Project<span className="text-primary font-black">Setu</span>
                        </h3>
                        <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-full border border-border/50">
                            <Loader2 className="h-3 w-3 animate-spin text-primary" />
                            <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                                Synchronizing...
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
