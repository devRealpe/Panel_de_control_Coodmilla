"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Newspaper,
  FileText,
  Images,
  Menu,
  Users,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import ConnectionStatus from "@/components/ConnectionStatus";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Noticias", href: "/noticias", icon: Newspaper },
  { label: "Documentos DIAN-ESAL", href: "/documentos", icon: FileText },
  { label: "Carrusel", href: "/carrusel", icon: Images },
  { label: "Trabajadores", href: "/trabajadores", icon: Users },
];

function SidebarContent() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden shrink-0">
          <Image
            src="/logo.jpeg"
            alt="Coodmilla"
            width={40}
            height={40}
            className="object-cover w-full h-full"
          />
        </div>
        <div>
          <h1 className="text-sm font-bold text-sidebar-foreground leading-tight">Control</h1>
          <p className="text-[11px] text-sidebar-foreground/50">Coodmilla</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-sidebar-primary/15 text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 pt-2 border-t border-sidebar-border/50 space-y-3">
        <ConnectionStatus />
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-red-500/10 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <>
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0">
        <SidebarContent />
      </aside>

      <Sheet>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-4 left-4 z-50 lg:hidden bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent"
            />
          }
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
