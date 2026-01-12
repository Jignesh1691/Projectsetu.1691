export const dynamic = 'force-dynamic';

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiResponse } from "@/lib/api-utils";

export async function GET(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user.organizationId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const organizationId = session.user.organizationId;

        const members = await prisma.membership.findMany({
            where: {
                organizationId: organizationId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        status: true,
                        image: true,
                        projectUsers: {
                            select: {
                                projectId: true
                            }
                        }
                    },
                },
            },
        });

        const formattedMembers = members.map((member) => ({
            id: member.id,
            role: member.role.toLowerCase(),
            user: {
                id: member.user.id,
                name: member.user.name || "Unknown",
                email: member.user.email,
                isActive: member.user.status === 'ACTIVE',
                image: member.user.image,
                assignedProjects: member.user.projectUsers.map(pu => pu.projectId)
            },
        }));

        return NextResponse.json(formattedMembers);
    } catch (error: unknown) {
        console.error("Error fetching members:", error);
        return apiResponse.internalError(error);
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session || session.user.role?.toUpperCase() !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { name, email, role, password, isActive, assignedProjects } = await req.json();

        if (!email || !role) {
            return NextResponse.json({ error: "Missing email or role" }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Check if user exists
            let user = await tx.user.findUnique({ where: { email } });

            if (!user) {
                // Create user if not exists (simulated direct addition)
                user = await tx.user.create({
                    data: {
                        name,
                        email,
                        status: isActive ? 'ACTIVE' : 'PENDING',
                        // In a real app, we'd hash the password here if provided
                        password: password || undefined,
                    },
                });
            }

            // 2. Create membership
            const membership = await tx.membership.create({
                data: {
                    userId: user.id,
                    organizationId: session.user.organizationId as string,
                    role: role.toUpperCase() as any,
                },
                include: { user: true }
            });

            // 3. Handle project assignments
            if (assignedProjects && Array.isArray(assignedProjects) && assignedProjects.length > 0) {
                await tx.projectUser.createMany({
                    data: assignedProjects.map((projectId: string) => ({
                        projectId,
                        userId: user!.id,
                        status: 'active'
                    }))
                });
            }

            return membership;
        });

        return NextResponse.json({
            id: result.id,
            role: result.role.toLowerCase(),
            user: {
                id: result.user.id,
                name: result.user.name || "Unknown",
                email: result.user.email,
                isActive: result.user.status === 'ACTIVE',
                assignedProjects: assignedProjects || []
            }
        });
    } catch (error: unknown) {
        console.error("Error adding member:", error);
        return apiResponse.internalError(error);
    }
}

export async function PUT(req: Request) {
    const session = await auth();
    if (!session || session.user.role?.toUpperCase() !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id, role, isActive, name, assignedProjects } = await req.json();

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const membership = await prisma.membership.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!membership || membership.organizationId !== session.user.organizationId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const updated = await prisma.$transaction(async (tx) => {
            const updatedMembership = await tx.membership.update({
                where: { id },
                data: {
                    role: role ? role.toUpperCase() as any : undefined,
                },
                include: { user: true }
            });

            if (isActive !== undefined || name) {
                await tx.user.update({
                    where: { id: updatedMembership.userId },
                    data: {
                        status: isActive ? 'ACTIVE' : 'PENDING',
                        name: name || undefined,
                    }
                });
            }

            // Sync assigned projects
            if (assignedProjects && Array.isArray(assignedProjects)) {
                // Delete old assignments
                await tx.projectUser.deleteMany({
                    where: { userId: updatedMembership.userId }
                });

                // Create new assignments
                if (assignedProjects.length > 0) {
                    await tx.projectUser.createMany({
                        data: assignedProjects.map((projectId: string) => ({
                            projectId,
                            userId: updatedMembership.userId,
                            status: 'active'
                        }))
                    });
                }
            }

            return updatedMembership;
        });

        return NextResponse.json({
            id: updated.id,
            role: updated.role.toLowerCase(),
            user: {
                id: updated.user.id,
                name: updated.user.name || "Unknown",
                email: updated.user.email,
                isActive: updated.user.status === 'ACTIVE',
                assignedProjects: assignedProjects || []
            }
        });
    } catch (error: unknown) {
        console.error("Error updating member:", error);
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
        const memberId = searchParams.get("id");

        if (!memberId) {
            return NextResponse.json({ error: "Missing member ID" }, { status: 400 });
        }

        // Verify the membership belongs to the admin's organization
        const membership = await prisma.membership.findUnique({
            where: { id: memberId },
        });

        if (!membership || membership.organizationId !== session.user.organizationId) {
            return NextResponse.json({ error: "Membership not found or unauthorized" }, { status: 404 });
        }

        // Prevent removing yourself
        if (membership.userId === session.user.id) {
            return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
        }

        await prisma.membership.delete({
            where: { id: memberId },
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Error removing member:", error);
        return apiResponse.internalError(error);
    }
}
