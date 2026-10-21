"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, BookOpenText, FileCheck2, FileText, LayoutDashboard, Settings2, ShieldAlert, Users, WalletCards, UsersRound, UsersRound as ParentLinksIcon } from "lucide-react";
const groups = [
 { label:"ESPACE DE TRAVAIL", links:[
  ["/admin","Vue d’ensemble",LayoutDashboard], ["/admin/documents","Documents",FileText], ["/admin/modeles","Modèles de documents",BookOpenText], ["/admin/signatures","Signatures",FileCheck2]
 ]},
 { label:"GESTION ASSOCIATIVE", links:[
  ["/admin/utilisateurs","Membres & accès",Users], ["/admin/rattachements","Rattachements parent–joueur",ParentLinksIcon], ["/admin/equipes","Équipes & rosters",UsersRound], ["/admin/discipline","Discipline",ShieldAlert], ["/admin/comptabilite","Comptabilité",WalletCards]
 ]},
 { label:"CONFIGURATION", links:[["/admin/parametres","Paramètres",Settings2]] }
] as const;
export default function AdminLayout({children}:{children:React.ReactNode}) {
 const path=usePathname();
 const [role,setRole]=useState<string>("");
 useEffect(()=>{fetch("/api/auth/me",{cache:"no-store"}).then(r=>r.json()).then(d=>setRole(d.user?.role??"")).catch(()=>setRole(""))},[]);
 const allowed=(href:string)=>{
  if(!role) return true;
  if(role==="OWNER"||role==="ADMIN") return true;
  if(role==="MANAGER") return !["/admin/utilisateurs","/admin/parametres","/admin/comptabilite"].includes(href);
  if(role==="ACCOUNTANT") return ["/admin/comptabilite"].includes(href);
  if(role==="RECRUITER") return ["/admin/equipes"].includes(href);
  return false;
 };
 return <div className="admin-shell">
  <aside className="admin-sidebar">
   <Link href="/tableau-de-bord" className="admin-brand"><span className="admin-logo"><img src="/rageux-logo.png" alt="" /></span><span><b>LES RAGEUX <i>2.0</i></b><small>ADMINISTRATION</small></span></Link>
   <div className="admin-workspace"><span className="admin-workspace-mark">R2</span><span><b>Espace de gestion</b><small>Portail administratif</small></span><span className="admin-online" /></div>
   {groups.filter(group=>group.links.some(([href])=>allowed(href))).map(group=><div className="admin-nav-group" key={group.label}><p>{group.label}</p>{group.links.filter(([href])=>allowed(href)).map(([href,label,Icon])=><Link key={href} href={href} className={`admin-nav-link ${(href==="/admin"?path===href:path===href||path.startsWith(href+"/"))?"active":""}`}><Icon size={17}/><span>{label}</span>{(href==="/admin/documents"||href==="/admin/signatures")&&<span className="admin-nav-arrow">↗</span>}</Link>)}</div>)}
   <div className="admin-sidebar-bottom"><div className="admin-security"><Activity size={16}/><span><b>Accès protégé</b><small>Sessions sécurisées</small></span></div><Link href="/tableau-de-bord" className="admin-back">← Retour au portail</Link></div>
  </aside>
  <div className="admin-main"><header className="admin-topbar"><div><span className="admin-crumb">LES RAGEUX 2.0</span><span className="admin-crumb-sep">/</span><b>Administration</b></div><div className="admin-top-actions"><span><i/> Espace de gestion</span><Link href="/tableau-de-bord">Quitter l’administration ↗</Link></div></header><div className="admin-page">{children}</div><footer className="admin-footer"><span>LES RAGEUX 2.0 · PORTAIL ADMINISTRATIF</span><span>Interface de gestion · Noir & Or</span></footer></div>
 </div>
}
