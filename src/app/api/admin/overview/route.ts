import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
export const runtime="nodejs";
export async function GET(){try{await requireRole("MANAGER");const [users, pendingUsers, documents, drafts, signatures, templates, finance, actions, recent]=await Promise.all([
 prisma.user.count({where:{status:"ACTIVE"}}),prisma.user.count({where:{status:"PENDING"}}),prisma.document.count(),prisma.document.count({where:{status:"DRAFT"}}),prisma.document.count({where:{status:{in:["PENDING_SIGNATURES","PARTIALLY_SIGNED"]}}}),prisma.documentTemplate.count({where:{isActive:true}}),prisma.ledgerEntry.aggregate({where:{status:"VALIDATED"},_sum:{amount:true},_count:true}),prisma.disciplinaryAction.count({where:{OR:[{endsAt:null},{endsAt:{gt:new Date()}}]} }),prisma.document.findMany({take:8,orderBy:{updatedAt:"desc"},select:{id:true,title:true,reference:true,status:true,type:true,updatedAt:true}})
 ]);return NextResponse.json({metrics:{users,pendingUsers,documents,drafts,signatures,templates,financeEntries:finance._count,financeAmount:finance._sum.amount?.toString()??"0",discipline:actions},recent});}catch(e){const m=e instanceof Error?e.message:"";return NextResponse.json({error:m==="UNAUTHENTICATED"?"Connexion requise.":"Accès réservé aux responsables."},{status:m==="UNAUTHENTICATED"?401:403})}}
