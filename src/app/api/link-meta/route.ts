import { NextRequest, NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { createClient } from "@/lib/supabase/server";

/**
 * Metadatos de un enlace para el bloque "Enlace" (@editorjs/link) del editor.
 * Respuesta en el formato que espera la herramienta:
 *   { success: 1, link, meta: { title, description, image: { url } } }
 *
 * Seguridad:
 * - Solo usuarios autenticados del panel (el proxy no cubre /api).
 * - Solo http(s), puertos estándar y hosts que resuelven a IPs públicas
 *   (se bloquean redes privadas, loopback, link-local, metadatos de nube…).
 * - Redirecciones seguidas manualmente (máx. 3) y revalidadas una a una.
 * - Tiempo límite y tamaño máximo de lectura.
 */

export const runtime = "nodejs";

const MAX_BYTES = 512 * 1024;
const TIMEOUT_MS = 6000;
const MAX_REDIRECTS = 3;

function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  const v6 = ip.toLowerCase();
  if (v6 === "::" || v6 === "::1") return true;
  if (v6.startsWith("::ffff:")) return isPrivateIp(v6.slice(7));
  return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(v6);
}

async function assertPublicUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Protocolo no permitido");
  if (url.port && url.port !== "80" && url.port !== "443") throw new Error("Puerto no permitido");
  if (url.username || url.password) throw new Error("URL no permitida");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (!addresses.length || addresses.some((a) => isPrivateIp(a.address))) {
    throw new Error("Host no permitido");
  }
  return url;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}

function metaContent(html: string, keys: string[]): string | undefined {
  for (const key of keys) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`,
      "i"
    );
    const m = re.exec(html);
    const value = m?.[1] ?? m?.[2];
    if (value) return decodeEntities(value);
  }
  return undefined;
}

async function fetchHtml(start: URL): Promise<{ url: URL; html: string }> {
  let url = start;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": "CoodmillaCMS/1.0 (+link preview)", accept: "text/html" },
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error("Redirección inválida");
      url = await assertPublicUrl(new URL(location, url).toString());
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!(res.headers.get("content-type") ?? "").includes("text/html")) throw new Error("No es una página web");

    const reader = res.body?.getReader();
    if (!reader) throw new Error("Respuesta vacía");
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
    }
    await reader.cancel().catch(() => undefined);
    return { url, html: new TextDecoder().decode(Buffer.concat(chunks)) };
  }
  throw new Error("Demasiadas redirecciones");
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: 0, message: "No autorizado" }, { status: 401 });

  const target = request.nextUrl.searchParams.get("url") ?? "";
  try {
    const safe = await assertPublicUrl(target);
    const { url, html } = await fetchHtml(safe);

    const title =
      metaContent(html, ["og:title", "twitter:title"]) ||
      decodeEntities(/<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] ?? "") ||
      url.hostname;
    const description = metaContent(html, ["og:description", "twitter:description", "description"]);
    const imageRaw = metaContent(html, ["og:image", "og:image:url", "twitter:image"]);
    let image: string | undefined;
    if (imageRaw) {
      try {
        const abs = new URL(imageRaw, url);
        if (abs.protocol === "https:") image = abs.toString();
      } catch {
        // imagen inválida: se omite
      }
    }

    return NextResponse.json({
      success: 1,
      link: target,
      meta: {
        title: title.slice(0, 300),
        ...(description ? { description: description.slice(0, 500) } : {}),
        ...(image ? { image: { url: image } } : {}),
      },
    });
  } catch {
    return NextResponse.json({ success: 0, message: "No se pudo obtener la información del enlace" });
  }
}
