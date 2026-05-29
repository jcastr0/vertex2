import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `postgres` es un paquete nativo de Node; manténlo fuera del bundle del servidor.
  serverExternalPackages: ["postgres"],
  images: {
    remotePatterns: [
      // Imágenes/adjuntos servidos desde Supabase Storage (fases posteriores).
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
