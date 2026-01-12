import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    trustHost: true,
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.userId = user.id;
                token.role = (user as any).role;
                token.organizationId = (user as any).organizationId;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user && token) {
                session.user.id = (token.userId || token.sub) as string;
                session.user.role = token.role as any;
                session.user.organizationId = token.organizationId as string;
            }
            return session;
        },
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const role = auth?.user?.role?.toLowerCase();
            const { pathname } = nextUrl;

            const isOnApp = pathname.startsWith('/app');
            const isOnAdmin = pathname.startsWith('/admin');
            const isOnApi = pathname.startsWith('/api');

            // Public API routes
            const isPublicApi = pathname.startsWith('/api/auth') ||
                pathname === '/api/register' ||
                pathname === '/api/verify' ||
                pathname === '/api/invites/accept';

            if (isOnAdmin) {
                if (isLoggedIn && role === 'admin') return true;
                return false; // Redirect to login
            }

            if (isOnApp) {
                if (isLoggedIn) return true;
                return false; // Redirect to login
            }

            if (isOnApi && !isPublicApi) {
                if (isLoggedIn) return true;
                return Response.json({ error: 'Unauthorized' }, { status: 401 });
            }

            return true;
        },
    },
    providers: [], // login providers will be added in auth.ts
} satisfies NextAuthConfig;
