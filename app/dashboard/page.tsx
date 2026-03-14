import { redirect } from "next/navigation";
import LogoutButton from "@/components/logout-button";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">
            StarglazeRevision
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Dashboard
          </h1>
          <p className="text-base text-slate-700">
            Signed in as{" "}
            <span className="font-semibold text-slate-950">
              {user.email ?? "Unknown email"}
            </span>
          </p>
          <p className="text-base text-slate-600">Auth is working.</p>
        </div>

        <div className="mt-8">
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
