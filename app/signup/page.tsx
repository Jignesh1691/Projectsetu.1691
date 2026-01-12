"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function SignupPage() {
    const [orgName, setOrgName] = useState("");
    const [orgSlug, setOrgSlug] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // 1. Register Org & User
            const res = await fetch("/api/register", {
                method: "POST",
                body: JSON.stringify({ orgName, orgSlug, email, password }),
                headers: { "Content-Type": "application/json" },
            });

            const data = await res.json();

            if (res.ok) {
                // 2. Instead of immediate login, show success message for email verification
                setSuccess(true);
            } else {
                setError(data.error || "Something went wrong");
                setLoading(false);
            }
        } catch (err) {
            setError("Failed to register organization.");
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen py-12 px-4 bg-background selection:bg-primary/20">
                <div className="w-full max-w-md bg-card p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/50 rounded-2xl text-center">
                    <div className="w-16 h-16 bg-blue-500/10 mx-auto flex items-center justify-center rounded-full mb-6">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Registration Submitted</h2>
                    <p className="text-muted-foreground mb-6">
                        We've sent a verification link to <strong>{email}</strong>.
                        Please check your inbox to activate your account.
                        <br /><br />
                        <span className="text-xs italic">If you don't receive the email, please contact your organization administrator to activate your account manually.</span>
                    </p>
                    <Link href="/login" className="text-sm text-primary font-semibold hover:underline">
                        Back to Login
                    </Link>
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
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Create Organization</h1>
                        <p className="text-muted-foreground mt-2 text-sm text-center">Start your professional multi-tenant workspace</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Organization Name</label>
                            <input
                                type="text"
                                value={orgName}
                                onChange={(e) => setOrgName(e.target.value)}
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm placeholder:text-muted-foreground/50"
                                required
                                placeholder="e.g. Acme Construction"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Organization Slug</label>
                            <input
                                type="text"
                                value={orgSlug}
                                onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm placeholder:text-muted-foreground/50"
                                required
                                placeholder="e.g. acme-construction"
                            />
                        </div>

                        <div className="py-2">
                            <div className="h-px bg-border w-full"></div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Admin Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm placeholder:text-muted-foreground/50"
                                required
                                placeholder="admin@company.com"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm placeholder:text-muted-foreground/50"
                                required
                                placeholder="••••••••"
                                minLength={6}
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
                            {loading ? "Creating..." : "Register Organization"}
                        </button>
                    </form>
                </div>

                <p className="mt-8 text-center text-sm text-muted-foreground">
                    Already have an organization?{" "}
                    <Link href="/login" className="text-primary font-semibold hover:underline underline-offset-4">
                        Login here
                    </Link>
                </p>
            </div>
        </div>
    );
}
