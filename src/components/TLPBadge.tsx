import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type TLP = "red" | "amber_strict" | "amber" | "green" | "clear";

const TLP_META: Record<TLP, { label: string; cls: string; desc: string }> = {
  red:          { label: "TLP:RED",          cls: "bg-[#FF2B2B] text-white border-[#FF2B2B]",        desc: "Destinataire seul" },
  amber_strict: { label: "TLP:AMBER+STRICT", cls: "bg-[#FFC000] text-black border-[#FFC000]",        desc: "Organisation uniquement" },
  amber:        { label: "TLP:AMBER",        cls: "bg-[#FFC000] text-black border-[#FFC000]",        desc: "Organisation et clients" },
  green:        { label: "TLP:GREEN",        cls: "bg-[#33FF00] text-black border-[#33FF00]",        desc: "Communauté de confiance" },
  clear:        { label: "TLP:CLEAR",        cls: "bg-white text-black border-foreground/40",        desc: "Diffusion publique" },
};

export function TLPBadge({ tlp, className, showDesc = false }: { tlp: TLP; className?: string; showDesc?: boolean }) {
  const m = TLP_META[tlp] ?? TLP_META.amber;
  return (
    <Badge title={m.desc} className={cn("font-mono text-[10px] tracking-tight", m.cls, className)}>
      {m.label}{showDesc && <span className="ml-1 opacity-70">· {m.desc}</span>}
    </Badge>
  );
}

export const TLP_OPTIONS: { value: TLP; label: string; desc: string }[] = [
  { value: "red",          label: "TLP:RED",          desc: "Destinataire seul" },
  { value: "amber_strict", label: "TLP:AMBER+STRICT", desc: "Organisation uniquement" },
  { value: "amber",        label: "TLP:AMBER",        desc: "Organisation + clients" },
  { value: "green",        label: "TLP:GREEN",        desc: "Communauté de confiance" },
  { value: "clear",        label: "TLP:CLEAR",        desc: "Public" },
];
