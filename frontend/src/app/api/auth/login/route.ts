import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string; username?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  // Compat: el formulario antiguo enviaba "username"; ahora es email de Supabase Auth
  const email = (body.email ?? body.username)?.trim() ?? "";
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email y contraseña son obligatorios" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message === "Invalid login credentials"
        ? "Email o contraseña incorrectos"
        : error?.message || "No se pudo iniciar sesión" },
      { status: 401 }
    );
  }

  return NextResponse.json({ ok: true, username: data.user.email });
}
