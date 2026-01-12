import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/api-utils";

/**
 * GET /api/users/list
 * Get list of users in the organization for filtering
 */
export async function GET(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user.organizationId) {
            return apiResponse.unauthorized();
        }

        // Get all users in the organization
        const users = await prisma.user.findMany({
            where: {
                memberships: {
                    some: {
                        organizationId: session.user.organizationId as string
                    }
                }
            },
            select: {
                id: true,
                name: true,
                email: true,
            },
            orderBy: {
                name: 'asc'
            }
        });

        return apiResponse.success(users);
    } catch (error: unknown) {
        return apiResponse.internalError(error);
    }
}
