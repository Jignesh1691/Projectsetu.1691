"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/icons';
import {
    ShieldCheck,
    Zap,
    Users,
    BarChart3,
    LayoutDashboard,
    ArrowRight,
    CheckCircle2,
    Lock,
    Globe
} from 'lucide-react';

export function LandingPage() {
    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 text-primary">
                            <AppLogo />
                        </div>
                        <span className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                            ProjectSetu
                        </span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
                        <a href="#features" className="hover:text-primary transition-colors">Features</a>
                        <a href="#security" className="hover:text-primary transition-colors">Security</a>
                        <a href="#mobile" className="hover:text-primary transition-colors">Mobile</a>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/login">
                            <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/5">
                                Login
                            </Button>
                        </Link>
                        <Link href="/signup">
                            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                                Get Started
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-40 pb-24 overflow-hidden">
                {/* Background Glows */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full opacity-50" />
                    <div className="absolute bottom-[20%] right-[-5%] w-[30%] h-[30%] bg-primary/10 blur-[100px] rounded-full opacity-30" />
                </div>

                <div className="container mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-primary mb-8 animate-fade-in">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        Introducing ProjectSetu v2.0
                    </div>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/20 leading-[1.1]">
                        Engineering the Future <br className="hidden md:block" /> of Construction.
                    </h1>
                    <p className="max-w-2xl mx-auto text-lg md:text-xl text-white/50 mb-12 leading-relaxed">
                        The next-generation multi-tenant platform for construction management.
                        Real-time tracking, secure data isolation, and professional insights in one place.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <Link href="/signup">
                            <Button size="lg" className="h-14 px-10 text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_20px_40px_-10px_rgba(245,158,11,0.3)] transition-all hover:scale-105 active:scale-95 group">
                                Build your Org
                                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                        <div className="flex -space-x-3 items-center">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="w-10 h-10 rounded-full border-2 border-black bg-neutral-800 flex items-center justify-center text-[10px] font-bold">
                                    {String.fromCharCode(64 + i)}
                                </div>
                            ))}
                            <span className="pl-6 text-sm text-white/40 font-medium">+500 companies tracking today</span>
                        </div>
                    </div>
                </div>

                {/* Hero Visual Mockup */}
                <div className="container mx-auto px-6 mt-24">
                    <div className="relative group max-w-5xl mx-auto">
                        <div className="absolute -inset-4 bg-gradient-to-r from-primary/30 to-orange-600/30 rounded-[3rem] blur-2xl opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                        <div className="relative bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-2 md:p-4 shadow-2xl overflow-hidden">
                            {/* Toolbar/Top Bar Simulation */}
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/40" />
                                    <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/40" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/40" />
                                </div>
                                <div className="mx-auto flex items-center gap-2 px-3 py-1 rounded-md bg-white/5 border border-white/5 text-[10px] text-white/30 font-mono">
                                    https://project-setu.in/dashboard
                                </div>
                            </div>

                            <div className="aspect-[16/10] md:aspect-video flex bg-black/40">
                                {/* Sidebar Simulation */}
                                <div className="w-12 md:w-56 border-r border-white/5 p-4 hidden sm:block">
                                    <div className="space-y-4 pt-2">
                                        <div className="h-8 rounded-lg bg-primary/20 border border-primary/20 w-full" />
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="h-8 rounded-lg bg-white/5 w-full" />
                                        ))}
                                    </div>
                                </div>

                                {/* Main Content Simulation */}
                                <div className="flex-1 p-4 md:p-8 space-y-6 overflow-hidden">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-bold text-primary uppercase tracking-widest">Construction Project</div>
                                            <div className="text-xl md:text-2xl font-black text-white">Sunrise Apartments</div>
                                        </div>
                                        <div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-[10px] font-black text-primary uppercase">Active</div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                                        {[
                                            { label: "Total Budget", val: "₹4.2Cr", color: "primary", progress: 65 },
                                            { label: "Labor Costs", val: "₹82.4L", color: "orange", progress: 42 },
                                            { label: "Completion", val: "78%", color: "green", progress: 78 }
                                        ].map((s, i) => (
                                            <div key={i} className={`p-4 md:p-6 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3 ${i === 2 ? 'hidden md:block' : ''}`}>
                                                <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider font-mono">{s.label}</div>
                                                <div className="text-xl md:text-2xl font-black text-white">{s.val}</div>
                                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                    <div className={`h-full bg-primary transition-all duration-1000`} style={{ width: `${s.progress}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-6 h-full">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="text-[10px] uppercase font-bold text-white/40 font-mono">Weekly Progress Chart</div>
                                            <div className="flex gap-2">
                                                <div className="w-2 h-2 rounded-full bg-primary" />
                                                <div className="w-2 h-2 rounded-full bg-white/20" />
                                            </div>
                                        </div>
                                        <div className="flex items-end justify-between h-32 gap-2 pb-2">
                                            {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                                                <div key={i} className="flex-1 rounded-t-lg bg-gradient-to-t from-primary/10 to-primary/40 border-t border-primary/40 transition-all duration-500 hover:scale-x-110" style={{ height: `${h}%` }} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating Overlay Elements - Careful positioning to avoid cutoff */}
                            <div className="absolute top-[20%] right-4 md:right-8 w-48 md:w-64 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-6 shadow-2xl hidden sm:block animate-bounce-slow">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                        <Zap className="w-4 h-4" />
                                    </div>
                                    <span className="font-bold text-xs md:text-sm">Real-time Performance</span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] font-mono mb-2">
                                    <span className="text-white/40 tracking-tighter">API LATENCY</span>
                                    <span className="text-primary tracking-widest font-black">24ms</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary w-[92%] animate-grow" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-32 relative">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-24">
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Designed for Construction Pros.</h2>
                        <p className="text-white/50 text-lg max-w-2xl mx-auto italic">
                            "Finally, a tool that understands the job site and the boardroom."
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <LayoutDashboard className="w-6 h-6" />,
                                title: "Unified Dashboard",
                                desc: "Track every project, ledger, and transaction from a single, high-performance interface."
                            },
                            {
                                icon: <ShieldCheck className="w-6 h-6" />,
                                title: "Security First",
                                desc: "Enterprise-grade data isolation for multi-tenant environments with secure encryption."
                            },
                            {
                                icon: <Users className="w-6 h-6" />,
                                title: "Team Collaboration",
                                desc: "Invite users with granular roles. Manage permissions effortlessly across your organization."
                            },
                            {
                                icon: <BarChart3 className="w-6 h-6" />,
                                title: "Advanced Analytics",
                                desc: "Visualize your growth with data-driven insights. Export reports with a single click."
                            },
                            {
                                icon: <Zap className="w-6 h-6" />,
                                title: "Blazing Fast",
                                desc: "Built on Next.js 14.2.5 for sub-second response times and a seamless mobile experience."
                            },
                            {
                                icon: <Globe className="w-6 h-6" />,
                                title: "Cloud Backup",
                                desc: "Securely backup your critical data to Google Drive or local storage at any time."
                            }
                        ].map((f, i) => (
                            <div key={i} className="group p-8 rounded-[2.5rem] bg-neutral-900/40 border border-white/5 hover:border-primary/30 transition-all hover:translate-y-[-8px]">
                                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500">
                                    {f.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-4">{f.title}</h3>
                                <p className="text-white/40 leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Security Proof */}
            <section id="security" className="py-32 bg-black relative overflow-hidden">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col lg:flex-row items-center gap-20">
                        <div className="lg:w-1/2">
                            <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-sm font-bold mb-6">
                                BANK-GRADE SECURITY
                            </div>
                            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-8 leading-tight">
                                Your data, isolated <br /> and untouchable.
                            </h2>
                            <div className="space-y-6">
                                {[
                                    "Multi-tenant data isolation",
                                    "Secure bcrypt password encryption",
                                    "Time-limited secure verification tokens",
                                    "No unauthorized data access between orgs"
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                        <span className="text-white/70 font-medium">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="lg:w-1/2 relative">
                            <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full animate-pulse" />
                            <div className="relative bg-neutral-900/80 border border-white/10 rounded-[3rem] p-12 text-center backdrop-blur-xl">
                                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-8">
                                    <Lock className="w-10 h-10" />
                                </div>
                                <div className="text-5xl font-black mb-4">AES-256</div>
                                <div className="text-white/40 font-bold uppercase tracking-widest text-sm mb-8 italic">Encryption Standard</div>
                                <div className="h-1 w-32 bg-primary mx-auto rounded-full mb-8 shadow-[0_0_20px_#f59e0b]" />
                                <p className="text-sm text-white/30 italic">
                                    Protected by ProjectSetu's advanced security core.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-40 relative">
                <div className="container mx-auto px-6">
                    <div className="relative rounded-[4rem] bg-gradient-to-br from-primary via-orange-600 to-orange-700 p-12 md:p-24 overflow-hidden text-center">
                        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-white/10 rounded-full blur-[100px]" />
                        <div className="relative z-10">
                            <h2 className="text-4xl md:text-7xl font-black tracking-tighter text-white mb-8">
                                Ready to elevate <br /> your organization?
                            </h2>
                            <p className="text-white/80 text-lg md:text-xl max-w-xl mx-auto mb-12">
                                Join the most advanced construction management platform.
                                Start your 14-day free trial today.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                                <Link href="/signup">
                                    <Button size="lg" className="h-16 px-12 text-xl bg-white text-primary hover:bg-neutral-100 shadow-2xl transition-all hover:scale-105 active:scale-95">
                                        Start Free Trial
                                    </Button>
                                </Link>
                                <Link href="/login">
                                    <Button size="lg" variant="outline" className="h-16 px-12 text-xl border-white/30 text-white hover:bg-white/10 transition-all">
                                        Watch Demo
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 border-t border-white/5 bg-black">
                <div className="container mx-auto px-6 text-center">
                    <div className="flex items-center justify-center gap-3 mb-8 opacity-60">
                        <div className="w-8 h-8 text-primary">
                            <AppLogo />
                        </div>
                        <span className="text-xl font-bold tracking-tight">ProjectSetu</span>
                    </div>
                    <p className="text-white/30 text-sm mb-8">
                        © 2026 ProjectSetu. Built for the modern builder.
                    </p>
                    <div className="flex justify-center gap-6 text-white/20 text-xs font-bold uppercase tracking-widest">
                        <a href="#" className="hover:text-white transition-colors">Privacy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms</a>
                        <a href="#" className="hover:text-white transition-colors">Status</a>
                    </div>
                </div>
            </footer>

            <style jsx>{`
        @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        @keyframes grow {
            from { width: 0; }
            to { width: 88%; }
        }
        .animate-fade-in {
            animation: fade-in 1s ease-out forwards;
        }
        .animate-bounce-slow {
            animation: bounce-slow 4s ease-in-out infinite;
        }
        .animate-grow {
            animation: grow 2s ease-out forwards;
        }
      `}</style>
        </div>
    );
}
