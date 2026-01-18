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

        const invite = await prisma.invite.findUnique({
            where: { token },
            include: { organization: true },
        });

        if (!invite || invite.accepted || invite.expiresAt < new Date()) {
            return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 400 });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.$transaction(async (tx) => {
            // Find or Create Global User
            const user = await tx.user.upsert({
                where: { email: invite.email },
                update: {
                    password: hashedPassword,
                    name: invite.name || undefined, // Update name if provided in invite
                },
                create: {
                    email: invite.email,
                    name: invite.name || "New User",
                    password: hashedPassword,
                    status: "ACTIVE", // invited users are active upon acceptance
                    emailVerified: new Date(),
                }
            });

            // Setup membership
            await tx.membership.upsert({
                where: {
                    userId_organizationId: {
                        userId: user.id,
                        organizationId: invite.organizationId
                    }
                },
                update: { role: invite.role }, // Update role if already member? Or keep existing? taking invite usually implies updating.
                create: {
                    userId: user.id,
                    organizationId: invite.organizationId,
                    role: invite.role,
                },
            });

            // Mark invite as used
            await tx.invite.update({
                where: { id: invite.id },
                data: { accepted: true },
            });
        });

        return NextResponse.json({ success: true, email: invite.email });
    } catch (error: unknown) {
        console.error("Invite acceptance error:", error);
        return apiResponse.internalError(error);
    }
}
