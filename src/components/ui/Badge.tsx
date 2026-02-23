import { cn } from "@/lib/utils";
import { CompetitionSource } from "@/types";

interface BadgeProps {
  source: CompetitionSource;
  className?: string;
}

const SOURCE_CONFIG: Record<CompetitionSource, { label: string; className: string }> = {
  ibjjf: { label: "IBJJF", className: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  jjwl:  { label: "JJWL",  className: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  agf:   { label: "AGF",   className: "bg-green-500/20 text-green-300 border-green-500/30" },
  naga:  { label: "NAGA",  className: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  adcc:  { label: "ADCC",  className: "bg-red-500/20 text-red-300 border-red-500/30" },
};

export function Badge({ source, className }: BadgeProps) {
  const config = SOURCE_CONFIG[source] ?? { label: source.toUpperCase(), className: "bg-gray-500/20 text-gray-300 border-gray-500/30" };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
