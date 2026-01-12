"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");
    const router = useRouter();

    if (!token) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen py-12 px-4 bg-background">
                <div className="w-full max-w-md bg-card p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-destructive/20 rounded-2xl text-center">
                    <div className="w-16 h-16 bg-destructive/10 mx-auto flex items-center justify-center rounded-full mb-6">
                        <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Invalid Reset Link</h2>
                    <p className="text-muted-foreground mb-6">This password reset link is invalid or has expired.</p>
                    <Link href="/forgot-password" className="text-sm text-primary font-semibold hover:underline">
                        Request a new link
                    </Link>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setStatus("error");
            setMessage("Passwords do not match");
            return;
        }

        setStatus("loading");
        setMessage("");

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                body: JSON.stringify({ token, password }),
                headers: { "Content-Type": "application/json" },
            });

            const data = await res.json();

            if (res.ok) {
                setStatus("success");
                setMessage("Your password has been reset successfully.");
                setTimeout(() => router.push("/login"), 3000);
            } else {
                setStatus("error");
                setMessage(data.error || "Something went wrong.");
            }
        } catch (err) {
            setStatus("error");
            setMessage("Failed to reset password.");
        }
    };

    if (status === "success") {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen py-12 px-4 bg-background">
                <div className="w-full max-w-md bg-card p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/50 rounded-2xl text-center">
                    <div className="w-16 h-16 bg-green-500/10 mx-auto flex items-center justify-center rounded-full mb-6">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Success!</h2>
                    <p className="text-muted-foreground mb-6">{message}</p>
                    <p className="text-sm text-muted-foreground">Redirecting to login...</p>
                    <div className="mt-6 flex justify-center">
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
                            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Reset Password</h1>
                        <p className="text-muted-foreground mt-2 text-sm text-center">Set a new, secure password for your account</p>
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
                                disabled={status === "loading"}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Confirm New Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm placeholder:text-muted-foreground/50"
                                required
                                placeholder="••••••••"
                                disabled={status === "loading"}
                            />
                        </div>

                        {status === "error" && (
                            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                                <p className="text-destructive text-xs font-medium text-center">{message}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={status === "loading"}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-xl shadow-lg shadow-primary/20 transition-all hover:translate-y-[-1px] active:translate-y-[0px] disabled:opacity-50 disabled:translate-y-0"
                        >
                            {status === "loading" ? "Resetting..." : "Set New Password"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
