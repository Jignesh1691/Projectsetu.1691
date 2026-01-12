import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiResponse } from "@/lib/api-utils";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login?error=MissingToken`);
    }

    try {
        const verificationToken = await prisma.verificationToken.findUnique({
            where: { token },
        });

        if (!verificationToken || verificationToken.expires < new Date()) {
            return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login?error=InvalidOrExpiredToken`);
        }

        await prisma.$transaction(async (tx) => {
            // 1. Mark email as verified and status as ACTIVE
            await tx.user.update({
                where: { email: verificationToken.identifier },
                data: {
                    emailVerified: new Date(),
                    status: "ACTIVE",
                },
            });

            // 2. Delete the verification token
            await tx.verificationToken.delete({
                where: { token },
            });
        });

        // Redirect to login with a success message
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login?verified=true`);
    } catch (error: unknown) {
        console.error("Email verification error:", error);
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login?error=VerificationError`);
    }
}
