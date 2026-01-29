import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, FinancialAccountSchema } from "@/lib/api-utils";

export async function GET(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user.organizationId) {
            return apiResponse.unauthorized();
        }

        const accounts = await (prisma as any).financialAccount.findMany({
            where: {
                organizationId: session.user.organizationId,
            },
            orderBy: {
                createdAt: 'asc',
            }
        });

        return apiResponse.success(accounts);
    } catch (error: unknown) {
        console.error("GET Financial Accounts Error:", error);
        return apiResponse.internalError(error);
    }
}

export async function POST(req: Request) {
    const session = await auth();

    if (!session || !session.user.organizationId) {
        return apiResponse.unauthorized();
    }

    if (session.user.role?.toUpperCase() !== "ADMIN") {
        return apiResponse.forbidden("Only administrators can create financial accounts.");
    }

    try {
        const json = await req.json();
        const validation = FinancialAccountSchema.safeParse(json);

        if (!validation.success) {
            return apiResponse.error(validation.error.issues[0].message);
        }

        const data = validation.data;
        const organizationId = session.user.organizationId;

        const existingAccount = await (prisma as any).financialAccount.findUnique({
            where: {
                organizationId_name: {
                    organizationId,
                    name: data.name,
                }
            }
        });

        if (existingAccount) {
            return apiResponse.error("An account with this name already exists");
        }

        const account = await (prisma as any).financialAccount.create({
            data: {
                ...data,
                organizationId,
            },
        });

        return apiResponse.success(account, 201);
    } catch (error: unknown) {
        console.error("POST Financial Account Error:", error);
        return apiResponse.internalError(error);
    }
}

export async function PUT(req: Request) {
    const session = await auth();

    if (!session || !session.user.organizationId) {
        return apiResponse.unauthorized();
    }

    if (session.user.role?.toUpperCase() !== "ADMIN") {
        return apiResponse.forbidden("Only administrators can update financial accounts.");
    }

    try {
        const json = await req.json();
        const { id, ...data } = json;

        if (!id) {
            return apiResponse.error("Account ID is required");
        }

        const validation = FinancialAccountSchema.partial().safeParse(data);

        if (!validation.success) {
            return apiResponse.error(validation.error.issues[0].message);
        }

        const organizationId = session.user.organizationId;

        const updatedAccount = await (prisma as any).financialAccount.update({
            where: { id },
            data: {
                ...validation.data,
                organizationId,
            },
        });

        return apiResponse.success(updatedAccount);
    } catch (error: unknown) {
        console.error("PUT Financial Account Error:", error);
        return apiResponse.internalError(error);
    }
}
