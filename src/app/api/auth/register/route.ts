import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(254).transform(v => v.toLowerCase()),
  password: z.string().min(12).max(128)
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Informations invalides. Le mot de passe doit contenir au moins 12 caractères." }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) return NextResponse.json({ error: "Un compte existe déjà pour cette adresse." }, { status: 409 });

    // Public registration can only create a pending MEMBER. An administrator must activate it.
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: await bcrypt.hash(parsed.data.password, 12),
        role: "MEMBER",
        status: "PENDING"
      },
      select: { id: true, email: true, name: true, status: true }
    });
    return NextResponse.json({ message: "Compte créé. Il doit être activé par un administrateur avant connexion.", user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Impossible de créer le compte pour le moment." }, { status: 500 });
  }
}
