export const dynamic = 'force-dynamic';

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendInviteEmail } from "@/lib/email";
import { NextResponse } from "next/server";
import { apiResponse } from "@/lib/api-utils";
import crypto from "crypto";

export async function GET(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user.organizationId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const invites = await prisma.invite.findMany({
            where: {
                organizationId: session.user.organizationId,
                accepted: false, // Only show pending/expired, not accepted ones
            },
            orderBy: {
                expiresAt: 'desc'
            }
        });

        // Calculate status for frontend convenience
        const formattedInvites = invites.map(invite => {
            const isExpired = new Date(invite.expiresAt) < new Date();
            return {
                id: invite.id,
                email: invite.email,
                name: invite.name,
                role: invite.role.toLowerCase(),
                status: isExpired ? 'expired' : 'pending',
                expiresAt: invite.expiresAt.toISOString(),
            };
        });

        return NextResponse.json(formattedInvites);
    } catch (error: unknown) {
        console.error("Error fetching invites:", error);
        return apiResponse.internalError(error);
    }
}

export async function POST(req: Request) {
    const session = await auth();

    if (!session || session.user.role?.toUpperCase() !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { email, role, name } = await req.json();

        if (!email || !role) {
            return NextResponse.json({ error: "Missing email or role" }, { status: 400 });
        }

        const organizationId = session.user.organizationId;

        if (!organizationId) {
            return NextResponse.json({ error: "Missing organization ID in session" }, { status: 400 });
        }

        const org = await prisma.organization.findUnique({ where: { id: organizationId } });

        if (!org) {
            return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }

        // Check if user is already a member
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            const existingMembership = await prisma.membership.findUnique({
                where: {
                    userId_organizationId: {
                        userId: existingUser.id,
                        organizationId
                    }
                }
            });
            if (existingMembership) {
                return NextResponse.json({ error: "User is already a member of this organization" }, { status: 400 });
            }
        }

        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

        const invite = await prisma.invite.create({
            data: {
                email,
                name,
                role: role.toUpperCase(),
                token,
                expiresAt,
                organizationId,
            },
        });

        const inviteLink = `${process.env.NEXTAUTH_URL}/accept-invite?token=${token}`;

        await sendInviteEmail({
            email,
            orgName: org.name,
            inviteLink,
        });

        return NextResponse.json({ success: true, inviteId: invite.id });
    } catch (error: unknown) {
        console.error("Invite generation error:", error);
        return apiResponse.internalError(error);
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await auth();

        if (!session || session.user.role?.toUpperCase() !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const inviteId = searchParams.get("id");

        if (!inviteId) {
            return NextResponse.json({ error: "Missing invite ID" }, { status: 400 });
        }

        const invite = await prisma.invite.findUnique({
            where: { id: inviteId },
        });

        if (!invite || invite.organizationId !== session.user.organizationId) {
            return NextResponse.json({ error: "Invite not found or unauthorized" }, { status: 404 });
        }

        await prisma.invite.delete({
            where: { id: inviteId },
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Error revoking invite:", error);
        return apiResponse.internalError(error);
    }
}
