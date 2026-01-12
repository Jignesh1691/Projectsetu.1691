import { processBillFlow } from "@/ai/flows";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { apiResponse } from "@/lib/api-utils";

export async function POST(req: Request) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { imageUrl } = await req.json();

        if (!imageUrl) {
            return NextResponse.json({ error: "Image URL is required" }, { status: 400 });
        }

        const result = await processBillFlow({ imageUrl });

        return NextResponse.json(result);
    } catch (error: unknown) {
        console.error("AI API Error:", error);
        return apiResponse.internalError(error);
    }
}
