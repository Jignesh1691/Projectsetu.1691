console.log("✅ AUTH.TS FILE LOADED - CHECKING LOGS");
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { prisma } from "@/lib/prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const { auth, signIn, signOut, handlers: { GET, POST } } = NextAuth({
    ...authConfig,
    debug: true, // Enable debugging to see detailed logs
    adapter: PrismaAdapter(prisma),
    providers: [
        Credentials({
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string },
                });

                if (!user || !user.password) {
                    return null;
                }

                if (!user.emailVerified || user.status !== "ACTIVE") {
                    throw new Error("Email not verified. Please check your inbox.");
                }

                const isPasswordValid = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                );

                if (!isPasswordValid) {
                    return null;
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger }) {
            // Initial sign in
            if (user) {
                token.userId = user.id;
                token.role = (user as any).role;
                token.organizationId = (user as any).organizationId;
            }

            // Ensure userId is available (from token or user)
            const userId = (user?.id || token.userId || token.sub) as string;

            // Fetch/Refresh membership data from DB
            // This happens on every token check in the app (non-middleware)
            if (userId && (!token.role || !token.organizationName || user || trigger === "update")) {
                try {
                    const membership = await prisma.membership.findFirst({
                        where: { userId: userId },
                        select: {
                            role: true,
                            organizationId: true,
                            organization: {
                                select: { name: true }
                            }
                        }
                    });
                    if (membership) {
                        token.role = membership.role.toLowerCase();
                        token.organizationId = membership.organizationId;
                        token.organizationName = membership.organization.name;
                    }
                } catch (err) {
                    console.error("Error fetching membership in jwt callback:", err);
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user && token) {
                session.user.id = (token.userId || token.sub) as string;
                session.user.role = token.role as any;
                session.user.organizationId = token.organizationId as string;
                (session.user as any).organizationName = token.organizationName as string;
            }
            return session;
        }
    },
});
