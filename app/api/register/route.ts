import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiResponse } from "@/lib/api-utils";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/email";
import { z } from "zod";

const registerSchema = z.object({
    orgName: z.string().min(2),
    orgSlug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug must be lowercase, numbers, and hyphens only"),
    email: z.string().email(),
    password: z.string().min(6),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validation = registerSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({
                error: "Invalid input",
                details: validation.error.flatten().fieldErrors
            }, { status: 400 });
        }

        const { orgName, orgSlug, email, password } = validation.data;

        // Check if slug is taken
        const existingOrg = await prisma.organization.findUnique({
            where: { slug: orgSlug },
        });

        if (existingOrg) {
            return NextResponse.json({ error: "Organization slug already taken" }, { status: 400 });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Organization
            const org = await tx.organization.create({
                data: {
                    name: orgName,
                    slug: orgSlug,
                },
            });

            // 2. Find or Create User (Global)
            const user = await tx.user.upsert({
                where: { email },
                update: {
                    password: hashedPassword,
                },
                create: {
                    email,
                    password: hashedPassword,
                    status: "PENDING",
                }
            });

            // 3. Create Membership with ADMIN role
            const existingMembership = await tx.membership.findUnique({
                where: {
                    userId_organizationId: {
                        userId: user.id,
                        organizationId: org.id
                    }
                }
            });

            if (!existingMembership) {
                await tx.membership.create({
                    data: {
                        userId: user.id,
                        organizationId: org.id,
                        role: "ADMIN",
                    },
                });
            }

            // 4. Create Verification Token
            const token = crypto.randomBytes(32).toString("hex");
            const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours

            await tx.verificationToken.create({
                data: {
                    identifier: email,
                    token,
                    expires,
                }
            });

            return { org, user, token };
        });

        // 5. Send Verification Email
        try {
            const verificationLink = `${process.env.NEXTAUTH_URL}/api/verify?token=${result.token}`;
            await sendVerificationEmail({
                email,
                verificationLink,
            });
        } catch (emailError) {
            console.error("Failed to send verification email:", emailError);
            // We don't throw here so the user is still registered
            // They can request a resend later or admin can verify
        }

        return NextResponse.json({ success: true, email: result.user.email });
    } catch (error: unknown) {
        console.error("Registration error:", error);
        return apiResponse.internalError(new Error("Internal Server Error"));
    }
}
