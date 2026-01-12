import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/api-utils";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session || !session.user.organizationId) {
            return apiResponse.unauthorized();
        }

        const userRole = session.user.role?.toLowerCase();
        if (userRole !== 'admin') {
            return apiResponse.forbidden("Access denied. Admin only.");
        }

        const logs = await prisma.auditLog.findMany({
            where: {
                organizationId: session.user.organizationId,
            },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 200 // Limit to recent 200 logs for now
        });

        return apiResponse.success(logs);
    } catch (error: unknown) {
        return apiResponse.internalError(error);
    }
}
