import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Briefcase,
  CircleUser,
  LayoutDashboard,
  LineChart,
  Landmark,
  PiggyBank,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const USER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/deposits", label: "Deposits", icon: PiggyBank },
  { href: "/performance", label: "Performance", icon: LineChart },
  { href: "/dividends", label: "Dividends", icon: Landmark },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/profile", label: "Profile", icon: CircleUser },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/investments", label: "Investments", icon: Wallet },
  { href: "/admin/portfolios", label: "Portfolio management", icon: Briefcase },
  { href: "/admin/dividends", label: "Dividends", icon: Landmark },
  { href: "/admin/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/profile", label: "Profile", icon: CircleUser },
];
