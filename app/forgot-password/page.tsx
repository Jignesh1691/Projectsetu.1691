"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("loading");
        setMessage("");

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                body: JSON.stringify({ email }),
                headers: { "Content-Type": "application/json" },
            });

            const data = await res.json();

            if (res.ok) {
                setStatus("success");
                setMessage(data.message);
            } else {
                setStatus("error");
                setMessage(data.error || "Something went wrong.");
            }
        } catch (err) {
            setStatus("error");
            setMessage("Failed to send reset link.");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-12 px-4 bg-background selection:bg-primary/20">
            <div className="w-full max-w-md">
                <div className="bg-card p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/50 rounded-2xl">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-12 h-12 bg-primary/10 flex items-center justify-center rounded-xl mb-4">
                            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Forgot Password</h1>
                        <p className="text-muted-foreground mt-2 text-sm text-center">Enter your email and we'll send you a reset link</p>
                    </div>

                    {status === "success" ? (
                        <div className="text-center space-y-6">
                            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-600 text-sm font-medium">
                                {message}
                            </div>
                            <Link href="/login" className="block w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-xl shadow-lg shadow-primary/20 transition-all text-center">
                                Back to Login
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm placeholder:text-muted-foreground/50"
                                    required
                                    placeholder="your@email.com"
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
                                {status === "loading" ? "Sending..." : "Send Reset Link"}
                            </button>

                            <div className="text-center pt-4">
                                <Link href="/login" className="text-sm font-medium text-primary hover:underline transition-colors">
                                    Back to Login
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
