import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
export const runtime="nodejs";
export async function GET(request:Request){try{await requireRole("ADMIN");const url=new URL(request.url);const q=(url.searchParams.get("q")??"").trim();const status=url.searchParams.get("status");const users=await prisma.user.findMany({where:{...(q?{OR:[{name:{contains:q}},{email:{contains:q}}]}:{}),...(status&&["PENDING","ACTIVE","SUSPENDED","DISABLED"].includes(status)?{status:status as never}:{})},orderBy:{createdAt:"desc"},take:200,select:{id:true,name:true,email:true,role:true,status:true,emailVerifiedAt:true,createdAt:true,lastLoginAt:true}});return NextResponse.json({users})}catch(e){const m=e instanceof Error?e.message:"";return NextResponse.json({error:m==="UNAUTHENTICATED"?"Connexion requise.":"Accès réservé à l’administration."},{status:m==="UNAUTHENTICATED"?401:403})}}
