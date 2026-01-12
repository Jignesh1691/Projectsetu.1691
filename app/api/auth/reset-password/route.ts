import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiResponse } from "@/lib/api-utils";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
        const { token, password } = await req.json();

        if (!token || !password) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
        }

        const verificationToken = await prisma.verificationToken.findUnique({
            where: { token },
        });

        if (!verificationToken || verificationToken.expires < new Date()) {
            return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.$transaction(async (tx) => {
            // 1. Update user password
            await tx.user.update({
                where: { email: verificationToken.identifier },
                data: {
                    password: hashedPassword,
                },
            });

            // 2. Delete the reset token
            await tx.verificationToken.delete({
                where: { token },
            });
        });

        return NextResponse.json({ success: true, message: "Password reset successful" });
    } catch (error: unknown) {
        console.error("Reset password error:", error);
        return apiResponse.internalError(new Error("Internal Server Error"));
    }
}
