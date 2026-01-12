"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
    children: React.ReactNode;
    className?: string;
}

export function PullToRefresh({ children, className }: PullToRefreshProps) {
    const [pullDist, setPullDist] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);
    const startY = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const PULL_THRESHOLD = 80;
    const PULL_MAX = 150;

    const handleTouchStart = (e: TouchEvent) => {
        // Only allow pull to refresh if we're at the very top of the scroll
        const scrollPos = window.scrollY || document.documentElement.scrollTop;
        if (scrollPos > 0) return;

        startY.current = e.touches[0].pageY;
        setIsPulling(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (!isPulling || isRefreshing) return;

        const currentY = e.touches[0].pageY;
        const diff = currentY - startY.current;

        if (diff > 0) {
            // Apply a resistance factor so it's harder to pull as you go down
            const resistance = 0.5;
            const newDist = Math.min(diff * resistance, PULL_MAX);
            setPullDist(newDist);

            // Prevent default scrolling if we're actually pulling down
            if (newDist > 10) {
                if (e.cancelable) e.preventDefault();
            }
        } else {
            setPullDist(0);
            setIsPulling(false);
        }
    };

    const handleTouchEnd = useCallback(() => {
        if (!isPulling || isRefreshing) return;

        if (pullDist >= PULL_THRESHOLD) {
            setIsRefreshing(true);
            setPullDist(PULL_THRESHOLD);

            // Trigger refresh
            router.refresh();

            // Simulate finish after a delay (since router.refresh is async-ish but doesn't return a promise for completion)
            setTimeout(() => {
                setIsRefreshing(false);
                setPullDist(0);
                setIsPulling(false);
            }, 1500);
        } else {
            setPullDist(0);
            setIsPulling(false);
        }
    }, [pullDist, isRefreshing, isPulling, router]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd);

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleTouchEnd, isPulling, isRefreshing, pullDist]);

    return (
        <div ref={containerRef} className={cn("relative overflow-hidden min-h-full", className)}>
            {/* Pull indicator */}
            <div
                className="absolute left-0 right-0 flex justify-center items-center pointer-events-none z-50 transition-transform duration-200"
                style={{
                    transform: `translateY(${pullDist - 50}px)`,
                    opacity: pullDist / PULL_THRESHOLD
                }}
            >
                <div className="bg-primary text-white p-2 rounded-full shadow-lg border border-white/20">
                    <Loader2 className={cn("h-6 w-6", isRefreshing ? "animate-spin" : "")}
                        style={{
                            transform: isRefreshing ? 'none' : `rotate(${pullDist * 2}deg)`
                        }}
                    />
                </div>
            </div>

            {/* Content wrapper with elastic effect */}
            <div
                className="transition-transform duration-200 ease-out h-full"
                style={{ transform: `translateY(${pullDist * 0.4}px)` }}
            >
                {children}
            </div>
        </div>
    );
}
