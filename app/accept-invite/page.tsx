"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function AcceptInvitePage() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    if (!token) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen py-12 px-4 bg-background">
                <div className="w-full max-w-md bg-card p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-destructive/20 rounded-2xl text-center">
                    <div className="w-16 h-16 bg-destructive/10 mx-auto flex items-center justify-center rounded-full mb-6">
                        <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Invalid Link</h2>
                    <p className="text-muted-foreground mb-6">This invitation link is invalid or has expired.</p>
                    <Link href="/login" className="text-sm text-primary font-semibold hover:underline">
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/invites/accept", {
                method: "POST",
                body: JSON.stringify({ token, password }),
                headers: { "Content-Type": "application/json" },
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(true);
                // Instead of auto-login, redirect to login page for manual entry
                setTimeout(() => {
                    router.push("/login?verified=true");
                }, 3000);
            } else {
                setError(data.error || "Something went wrong");
            }
        } catch (err) {
            setError("Failed to accept invite.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen py-12 px-4 bg-background">
                <div className="w-full max-w-md bg-card p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/50 rounded-2xl text-center">
                    <div className="w-16 h-16 bg-green-500/10 mx-auto flex items-center justify-center rounded-full mb-6">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Welcome Aboard!</h2>
                    <p className="text-muted-foreground mb-6">Your account is now active. We're redirecting you to login...</p>
                    <div className="flex justify-center">
                        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-12 px-4 bg-background selection:bg-primary/20">
            <div className="w-full max-w-md">
                <div className="bg-card p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/50 rounded-2xl">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-12 h-12 bg-primary/10 flex items-center justify-center rounded-xl mb-4">
                            <div className="w-6 h-6 border-b-2 border-r-2 border-primary rotate-45 transform -translate-y-0.5"></div>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Accept Invitation</h1>
                        <p className="text-muted-foreground mt-2 text-sm text-center">Set your password to join the organization</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">New Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm placeholder:text-muted-foreground/50"
                                required
                                placeholder="••••••••"
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm placeholder:text-muted-foreground/50"
                                required
                                placeholder="••••••••"
                                disabled={loading}
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                                <p className="text-destructive text-xs font-medium text-center">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-xl shadow-lg shadow-primary/20 transition-all hover:translate-y-[-1px] active:translate-y-[0px] disabled:opacity-50 disabled:translate-y-0"
                        >
                            {loading ? "Processing..." : "Set Password & Join"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
