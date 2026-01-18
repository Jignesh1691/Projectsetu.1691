export const dynamic = 'force-dynamic';

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiResponse, ProjectSchema } from "@/lib/api-utils";

export async function GET(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user.organizationId) {
            return apiResponse.unauthorized();
        }

        const projects = await prisma.project.findMany({
            where: {
                organizationId: session.user.organizationId,
            },
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                _count: {
                    select: { transactions: true }
                },
                projectUsers: {
                    where: {
                        userId: session.user.id
                    },
                    select: {
                        userId: true,
                        projectId: true,
                        canViewFinances: true,
                        canCreateEntries: true
                    }
                }
            }
        });

        return apiResponse.success(projects);
    } catch (error: unknown) {
        return apiResponse.internalError(error);
    }
}

import { ratelimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
    const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
    const { success } = await ratelimit.limit(ip);

    if (!success) {
        return NextResponse.json(
            { error: "Too many requests. Please try again later." },
            { status: 429 }
        );
    }

    const session = await auth();

    if (!session || session.user.role?.toUpperCase() !== "ADMIN") {
        return apiResponse.unauthorized();
    }

    try {
        const json = await req.json();
        const validation = ProjectSchema.safeParse(json);

        if (!validation.success) {
            return apiResponse.error(validation.error.issues[0].message);
        }

        const { name, location, assigned_users } = validation.data;

        const organizationId = session.user.organizationId as string;

        const existingProject = await prisma.project.findUnique({
            where: {
                organizationId_name: {
                    organizationId,
                    name,
                }
            }
        });

        if (existingProject) {
            return apiResponse.error("A project with this name already exists");
        }

        const project = await prisma.$transaction(async (tx) => {
            const newProject = await tx.project.create({
                data: {
                    name,
                    location,
                    organizationId,
                },
            });

            if (assigned_users && assigned_users.length > 0) {
                await tx.projectUser.createMany({
                    data: assigned_users.map((item: any) => ({
                        projectId: newProject.id,
                        userId: typeof item === 'string' ? item : item.userId,
                        status: 'active',
                        canViewFinances: typeof item === 'string' ? true : item.canViewFinances,
                        canCreateEntries: typeof item === 'string' ? true : item.canCreateEntries,
                    }))
                });
            }

            return newProject;
        });

        return apiResponse.success(project, 201);
    } catch (error: unknown) {
        return apiResponse.internalError(error);
    }
}

export async function PUT(req: Request) {
    const session = await auth();

    if (!session || session.user.role?.toUpperCase() !== "ADMIN") {
        return apiResponse.unauthorized();
    }

    try {
        const json = await req.json();
        const { id, ...data } = json;

        if (!id) {
            return apiResponse.error("Project ID is required");
        }

        const validation = ProjectSchema.partial().safeParse(data);
        if (!validation.success) {
            return apiResponse.error(validation.error.issues[0].message);
        }

        const { name, location, assigned_users } = validation.data;

        const project = await prisma.project.findUnique({
            where: { id },
        });

        if (!project || project.organizationId !== session.user.organizationId) {
            return apiResponse.notFound("Project");
        }

        // Update project details
        const updatedProject = await prisma.project.update({
            where: { id },
            data: {
                name,
                location: location || undefined,
            },
        });

        // Update assigned users if provided
        if (assigned_users) {
            // First delete existing assignments for this project
            await prisma.projectUser.deleteMany({
                where: { projectId: id }
            });

            // Create new assignments
            if (assigned_users.length > 0) {
                await prisma.projectUser.createMany({
                    data: assigned_users.map((item: any) => ({
                        projectId: id,
                        userId: typeof item === 'string' ? item : item.userId,
                        status: 'active',
                        canViewFinances: typeof item === 'string' ? true : item.canViewFinances,
                        canCreateEntries: typeof item === 'string' ? true : item.canCreateEntries,
                    }))
                });
            }
        }

        return apiResponse.success(updatedProject);
    } catch (error: unknown) {
        return apiResponse.internalError(error);
    }
}

export async function DELETE(req: Request) {
    const session = await auth();

    if (!session || session.user.role?.toUpperCase() !== "ADMIN") {
        return apiResponse.unauthorized();
    }

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return apiResponse.error("Project ID is required");
        }

        const project = await prisma.project.findUnique({
            where: { id },
        });

        if (!project || project.organizationId !== session.user.organizationId) {
            return apiResponse.notFound("Project");
        }

        await prisma.project.delete({
            where: { id },
        });

        return apiResponse.success({ success: true });
    } catch (error: unknown) {
        return apiResponse.internalError(error);
    }
}
