export const dynamic = 'force-dynamic';

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiResponse } from "@/lib/api-utils";
import { requiresApproval, canAccessProject } from "@/lib/permissions";

import { uploadFile } from "@/lib/storage";

export async function GET(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user.organizationId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const userRole = (user.role?.toLowerCase() || 'user') as 'admin' | 'user';
        const userId = user.id as string;

        // Filter by projects assigned to the user if not admin
        let projectFilter = {};
        if (userRole !== 'admin') {
            const assignedProjects = await prisma.projectUser.findMany({
                where: {
                    userId,
                    status: 'active'
                },
                select: { projectId: true }
            });
            const assignedProjectIds = assignedProjects.map(ap => ap.projectId);
            projectFilter = {
                projectId: { in: assignedProjectIds }
            } as any;
        }

        const photos = await prisma.photo.findMany({
            where: {
                organizationId: session.user.organizationId as string,
                ...projectFilter
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json(photos);
    } catch (error: unknown) {
        console.error("Error fetching photos:", error);
        return apiResponse.internalError(error);
    }
}

export async function POST(req: Request) {
    const session = await auth();

    if (!session || !session.user.organizationId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const contentType = req.headers.get("content-type") || "";
        let url: string | undefined;
        let description: string | undefined;
        let projectId: string | undefined;
        let requestMessage: string | undefined;

        if (contentType.includes("multipart/form-data")) {
            const formData = await req.formData();
            const file = formData.get("file") as File;
            description = (formData.get("description") as string) || '';
            projectId = formData.get("projectId") as string;
            requestMessage = formData.get("requestMessage") as string;

            if (file) {
                // Check if S3 is configured
                if (process.env.AWS_S3_BUCKET_NAME) {
                    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
                    url = await uploadFile(file, fileName);
                } else {
                    // Fallback to error or temporary base64 if needed, but we want S3
                    return NextResponse.json({ error: "Cloud storage not configured" }, { status: 500 });
                }
            }
        } else {
            const body = await req.json();
            url = body.url;
            description = body.description;
            projectId = body.projectId;
            requestMessage = body.requestMessage;
        }

        // Basic validation
        if (!url || !projectId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const user = session.user as any;
        const userRole = (user.role?.toLowerCase() || 'user') as 'admin' | 'user';

        // Project access check for non-admins
        if (userRole !== 'admin') {
            const projectUsers = await prisma.projectUser.findMany({
                where: { userId: user.id as string }
            });
            if (!canAccessProject(projectId, user.id as string, userRole, projectUsers as any)) {
                return NextResponse.json({ error: "You don't have access to this project" }, { status: 403 });
            }
        }

        // Determine approval status
        const approvalStatus = requiresApproval('photo', 'create', userRole)
            ? 'pending-create'
            : 'approved';

        const photo = await prisma.photo.create({
            data: {
                url,
                description: description || '',
                projectId,
                organizationId: user.organizationId as string,
                createdBy: user.id as string,
                approvalStatus,
                submittedBy: userRole === 'user' ? user.id as string : undefined,
                requestMessage: userRole === 'user' ? requestMessage : undefined,
            },
        });

        return NextResponse.json(photo);
    } catch (error: unknown) {
        console.error("Error creating photo:", error);
        return apiResponse.internalError(error);
    }
}

export async function PUT(req: Request) {
    const session = await auth();

    if (!session || !session.user.organizationId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id, url, description, projectId, requestMessage } = await req.json();

        if (!id) {
            return NextResponse.json({ error: "Photo ID is required" }, { status: 400 });
        }

        const photo = await prisma.photo.findUnique({
            where: { id },
        });

        if (!photo || photo.organizationId !== session.user.organizationId) {
            return NextResponse.json({ error: "Photo not found or unauthorized" }, { status: 404 });
        }

        const userRole = (session.user.role?.toLowerCase() || 'user') as 'admin' | 'user';

        // Check if approval is required
        if (requiresApproval('photo', 'edit', userRole)) {
            // User: Create pending edit request
            const updated = await prisma.photo.update({
                where: { id },
                data: {
                    approvalStatus: 'pending-edit',
                    submittedBy: session.user.id,
                    requestMessage: requestMessage,
                    pendingData: {
                        url,
                        description,
                        projectId,
                    } as any,
                }
            });
            return NextResponse.json(updated);
        } else {
            // Admin or no approval required: Apply immediately
            const updatedPhoto = await prisma.photo.update({
                where: { id },
                data: {
                    url,
                    description,
                    projectId,
                    approvalStatus: 'approved',
                },
            });
            return NextResponse.json(updatedPhoto);
        }
    } catch (error: unknown) {
        console.error("Error updating photo:", error);
        return apiResponse.internalError(error);
    }
}

export async function DELETE(req: Request) {
    const session = await auth();

    if (!session || !session.user.organizationId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        const requestMessage = searchParams.get("message");

        if (!id) {
            return NextResponse.json({ error: "Photo ID is required" }, { status: 400 });
        }

        const photo = await prisma.photo.findUnique({
            where: { id },
        });

        if (!photo || photo.organizationId !== session.user.organizationId) {
            return NextResponse.json({ error: "Photo not found or unauthorized" }, { status: 404 });
        }

        const userRole = (session.user.role?.toLowerCase() || 'user') as 'admin' | 'user';

        if (requiresApproval('photo', 'delete', userRole)) {
            // User: Mark for pending deletion
            const updated = await prisma.photo.update({
                where: { id },
                data: {
                    approvalStatus: 'pending-delete',
                    submittedBy: session.user.id,
                    requestMessage: requestMessage || undefined,
                }
            });
            return NextResponse.json({ success: true, status: 'pending-delete', photo: updated });
        } else {
            // Admin: Delete immediately
            await prisma.photo.delete({
                where: { id },
            });
            return NextResponse.json({ success: true });
        }
    } catch (error: unknown) {
        console.error("Error deleting photo:", error);
        return apiResponse.internalError(error);
    }
}
