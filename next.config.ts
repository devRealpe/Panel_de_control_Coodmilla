import type { NextConfig } from "next";

function buildRemotePatterns() {
  const patterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
    {
      protocol: "https",
      hostname: "**.supabase.co",
      pathname: "/storage/v1/object/public/**",
    },
  ];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    try {
      const url = new URL(supabaseUrl);
      patterns.push({
        protocol: url.protocol.replace(":", "") as "http" | "https",
        hostname: url.hostname,
        pathname: "/storage/v1/object/public/**",
      });
    } catch {
      // ignore
    }
  }

  return patterns;
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.56.1"],
  images: {
    dangerouslyAllowLocalIP: true,
    remotePatterns: buildRemotePatterns(),
  },
};

export default nextConfig;
