import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Layout() {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-12 items-center border-b px-4 gap-6">
        <span className="text-sm font-semibold">kagent</span>
        <nav className="flex gap-4">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                "text-sm transition-colors hover:text-foreground",
                isActive ? "text-foreground font-medium" : "text-muted-foreground",
              )
            }
          >
            Chat
          </NavLink>
          <NavLink
            to="/create-agent"
            className={({ isActive }) =>
              cn(
                "text-sm transition-colors hover:text-foreground",
                isActive ? "text-foreground font-medium" : "text-muted-foreground",
              )
            }
          >
            Create Agent
          </NavLink>
        </nav>
      </header>
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
