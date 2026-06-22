import Link from "next/link";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth.actions";
import { SubmitButton } from "@/app/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import type { CurrentUser } from "@/app/lib/session";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppShell({
  user,
  children,
}: {
  user?: CurrentUser | null;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--muted))_0,transparent_36%),linear-gradient(to_bottom,hsl(var(--background)),hsl(var(--background)))] text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="font-heading text-lg font-semibold uppercase tracking-wider">
            Smart Campus
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            {user ? (
              <>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/dashboard">
                    <LayoutDashboard />
                    Dashboard
                  </Link>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/maintenance/new">
                    <Plus />
                    New Ticket
                  </Link>
                </Button>
                {user.role !== "STUDENT" ? (
                  <>
                    <Button asChild size="sm" variant="ghost">
                      <Link href="/admin/maintenance">
                        <Settings />
                        Manage Tickets
                      </Link>
                    </Button>
                    {user.role === "ADMINISTRATOR" ? (
                      <Button asChild size="sm" variant="ghost">
                        <Link href="/admin/users">
                          <Users />
                          Users
                        </Link>
                      </Button>
                    ) : null}
                  </>
                ) : null}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Avatar size="sm">
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <span className="max-w-32 truncate">{user.name}</span>
                      <ChevronDown />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>
                      <span className="block">{user.email}</span>
                      <span className="mt-1 block text-[0.65rem] text-muted-foreground">
                        {user.role.replaceAll("_", " ")}
                      </span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard">Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/maintenance/new">New ticket</Link>
                    </DropdownMenuItem>
                    {user.role === "ADMINISTRATOR" ? (
                      <DropdownMenuItem asChild>
                        <Link href="/admin/users">Users</Link>
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuSeparator />
                    <form action={logoutAction} className="px-1.5 py-1">
                      <SubmitButton
                        className="w-full justify-start"
                        loadingText="Signing out..."
                        variant="secondary"
                      >
                        <LogOut />
                        Sign out
                      </SubmitButton>
                    </form>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/register">Register</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <Card
      className="border-0 bg-transparent py-4 shadow-none ring-0"
      size="sm"
    >
      <CardContent className="space-y-2 border-l pl-4">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {label}
        </p>
        <p className="font-heading text-3xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

export function StatusPill({ status }: { status: string }) {
  const label = status.replaceAll("_", " ").toLowerCase();

  return (
    <Badge className="capitalize" variant="secondary">
      {label}
    </Badge>
  );
}
