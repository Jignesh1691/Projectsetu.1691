import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiResponse } from "@/lib/api-utils";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";
import { z } from "zod";

const forgotPasswordSchema = z.object({
    email: z.string().email(),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validation = forgotPasswordSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
        }

        const { email } = validation.data;

        const user = await prisma.user.findUnique({
            where: { email },
        });

        // For security, don't reveal if user exists. Just say "If an account exists..."
        if (user) {
            const token = crypto.randomBytes(32).toString("hex");
            const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

            await prisma.verificationToken.deleteMany({
                where: { identifier: email }
            });

            await prisma.verificationToken.create({
                data: {
                    identifier: email,
                    token,
                    expires,
                }
            });

            const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;
            await sendPasswordResetEmail({
                email,
                resetLink,
            });
        }

        return NextResponse.json({
            success: true,
            message: "If an account exists with that email, we've sent a password reset link."
        });
    } catch (error: unknown) {
        console.error("Forgot password error:", error);
        return apiResponse.internalError(new Error("Internal Server Error"));
    }
}
