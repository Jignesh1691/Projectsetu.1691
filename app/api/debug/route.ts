import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const count = await prisma.user.count();
        const orgs = await prisma.organization.findMany({ select: { slug: true } });
        return NextResponse.json({
            status: "ok",
            userCount: count,
            orgs: orgs,
            env: process.env.DATABASE_URL ? "Set" : "Unset"
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        const stack = error instanceof Error ? error.stack : undefined;
        return NextResponse.json({ status: "error", message, stack }, { status: 500 });
    }
}
