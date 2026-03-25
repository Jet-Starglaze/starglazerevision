import AppShellNavbar from "@/components/app-shell-navbar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <AppShellNavbar />
      {children}
    </div>
  );
}
