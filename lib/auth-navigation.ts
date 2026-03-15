import type { NavLinkItem } from "@/lib/navigation";
import { createClient } from "@/utils/supabase/server";

export type AuthNavigationState = {
  isAuthenticated: boolean;
  accountAction: NavLinkItem;
  primaryAction: NavLinkItem;
};

export async function getAuthNavigationState(): Promise<AuthNavigationState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = Boolean(user);

  return {
    isAuthenticated,
    accountAction: isAuthenticated
      ? {
          label: "Dashboard",
          href: "/dashboard",
          prefetch: true,
        }
      : {
          label: "Log in",
          href: "/login",
          prefetch: true,
        },
    primaryAction: isAuthenticated
      ? {
          label: "Continue revising",
          href: "/subjects",
          prefetch: true,
        }
      : {
          label: "Start Revising",
          href: "/login",
          prefetch: true,
        },
  };
}
