import { buttonVariants } from "@/components/ui/button";
import { FileSpreadsheet, FileText, Download } from "lucide-react";

export function ExportBotones({ slug, query }: { slug: string; query: string }) {
  const base = `/reportes/${slug}/export`;
  return (
    <div className="flex flex-wrap gap-2">
      <a href={`${base}?fmt=xlsx&${query}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
        <FileSpreadsheet className="size-4" /> Excel <Download className="size-3.5 opacity-60" />
      </a>
      <a href={`${base}?fmt=csv&${query}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
        <FileText className="size-4" /> CSV <Download className="size-3.5 opacity-60" />
      </a>
    </div>
  );
}
