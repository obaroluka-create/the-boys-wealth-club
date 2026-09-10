import { Badge } from "@/components/ui/badge";
import type { AccountStatus, DividendStatus } from "@/types";

export function StatusBadge({ status }: { status: AccountStatus }) {
  const label = status[0].toUpperCase() + status.slice(1);
  if (status === "active") return <Badge className="bg-gain/10 text-gain">{label}</Badge>;
  if (status === "disabled") return <Badge variant="destructive">{label}</Badge>;
  return <Badge variant="secondary">{label}</Badge>;
}

export function DividendStatusBadge({ status }: { status: DividendStatus }) {
  const label = status[0].toUpperCase() + status.slice(1);
  if (status === "paid") return <Badge className="bg-gain/10 text-gain">{label}</Badge>;
  if (status === "processing") return <Badge variant="secondary">{label}</Badge>;
  return <Badge variant="outline">{label}</Badge>;
}
