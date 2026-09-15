"use client";

import { useEffect, useState } from "react";
import { checkHealth } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

export default function ConnectionStatus() {
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const poll = async () => {
      const ok = await checkHealth();
      setConnected(ok);
    };
    poll();
    const id = setInterval(poll, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent/50">
      <span
        className={`h-2 w-2 rounded-full ${
          connected === null
            ? "bg-yellow-400 animate-pulse"
            : connected
              ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]"
              : "bg-red-400"
        }`}
      />
      <span className="text-xs font-medium text-sidebar-foreground/80">
        {connected === null
          ? "Verificando..."
          : connected
            ? "Conectado"
            : "Desconectado"}
      </span>
    </div>
  );
}
