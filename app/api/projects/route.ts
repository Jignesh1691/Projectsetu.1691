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
                }
            }
        });

        return apiResponse.success(projects);
    } catch (error: unknown) {
        return apiResponse.internalError(error);
    }
}

export async function POST(req: Request) {
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

        const { name, location, status } = validation.data;

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

        const project = await prisma.project.create({
            data: {
                name,
                location,
                status: (status as any) || 'ACTIVE',
                organizationId,
            },
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

        const { name, location, status } = validation.data;

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
                status: status as any,
            },
        });

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
