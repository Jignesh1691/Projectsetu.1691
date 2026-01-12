"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [loginError, setLoginError] = useState("");
    const searchParams = useSearchParams();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setLoginError("");

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setLoginError("Invalid email or password");
            } else {
                router.push("/dashboard");
                router.refresh();
            }
        } catch (err) {
            setLoginError("An unexpected error occurred. Please try again.");
            console.error("Login unexpected error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-12 px-4 bg-background selection:bg-primary/20">
            <div className="w-full max-w-md">
                <div className="bg-card p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/50 rounded-2xl">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-12 h-12 bg-primary/10 flex items-center justify-center rounded-xl mb-4">
                            <div className="w-6 h-6 border-b-2 border-r-2 border-primary rotate-45 transform -translate-y-0.5"></div>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
                        <p className="text-muted-foreground mt-2 text-sm">Login with your credentials</p>
                    </div>

                    {searchParams.get("verified") && (
                        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-600 text-sm font-medium text-center">
                            Email verified successfully! You can now log in.
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm placeholder:text-muted-foreground/50"
                                required
                                placeholder="name@company.com"
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between ml-1">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</label>
                                <Link href="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
                                    Forgot password?
                                </Link>
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm placeholder:text-muted-foreground/50"
                                required
                                placeholder="••••••••"
                                disabled={isLoading}
                            />
                        </div>

                        {(loginError || searchParams.get("error")) && (
                            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                                <p className="text-destructive text-xs font-medium text-center">
                                    {loginError || (
                                        searchParams.get("error") === "MissingToken" ? "Verification token is missing." :
                                            searchParams.get("error") === "InvalidOrExpiredToken" ? "Verification link is invalid or has expired." :
                                                searchParams.get("error") === "VerificationError" ? "An error occurred during verification. Please try again." :
                                                    "Authentication Error"
                                    )}
                                </p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-xl shadow-lg shadow-primary/20 transition-all hover:translate-y-[-1px] active:translate-y-[0px] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? "Signing in..." : "Sign In"}
                        </button>
                    </form>
                </div>

                <p className="mt-8 text-center text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <Link href="/signup" className="text-primary font-semibold hover:underline underline-offset-4">
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    );
}
