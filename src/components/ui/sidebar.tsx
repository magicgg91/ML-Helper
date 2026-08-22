"use client";

import { Slot } from "@radix-ui/react-slot";
import { MenuIcon } from "lucide-react";
import {
  createContext,
  useContext,
  useState,
  type ComponentProps,
} from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";

// Trimmed version of shadcn/ui's sidebar: a fixed left rail on desktop and
// an off-canvas Sheet on mobile. Deliberately skips the upstream
// icon-collapse mode, resizable rail and cookie persistence — Bloc 11 only
// asks to move the nav into a sidebar, not to build every sidebar variant.
const SIDEBAR_WIDTH = "16rem";

type SidebarContextValue = {
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

function SidebarProvider({
  className,
  style,
  children,
  ...props
}: ComponentProps<"div">) {
  const [openMobile, setOpenMobile] = useState(false);
  return (
    <SidebarContext.Provider value={{ openMobile, setOpenMobile }}>
      <div
        data-slot="sidebar-wrapper"
        style={{ "--sidebar-width": SIDEBAR_WIDTH, ...style } as React.CSSProperties}
        className={cn("flex min-h-svh w-full", className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

function Sidebar({
  className,
  children,
  navLabel,
  ...props
}: ComponentProps<"div"> & { navLabel: string }) {
  const { openMobile, setOpenMobile } = useSidebar();
  return (
    <>
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent side="left" className="p-0 md:hidden">
          <SheetTitle className="sr-only">{navLabel}</SheetTitle>
          <SheetDescription className="sr-only">{navLabel}</SheetDescription>
          <nav
            aria-label={navLabel}
            className="flex h-full flex-col gap-4 p-4"
          >
            {children}
          </nav>
        </SheetContent>
      </Sheet>
      <nav
        aria-label={navLabel}
        data-slot="sidebar"
        className={cn(
          "bg-sidebar text-sidebar-foreground hidden w-(--sidebar-width) shrink-0 flex-col gap-4 border-r border-sidebar-border p-4 md:flex",
          className,
        )}
        {...props}
      >
        {children}
      </nav>
    </>
  );
}

function SidebarTrigger({ className, ...props }: ComponentProps<"button">) {
  const { setOpenMobile } = useSidebar();
  return (
    <Button
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn("md:hidden", className)}
      onClick={() => setOpenMobile(true)}
      {...props}
    >
      <MenuIcon />
      <span className="sr-only">Menu</span>
    </Button>
  );
}

function SidebarHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn("flex flex-1 flex-col gap-1 overflow-y-auto", className)}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn("mt-auto flex flex-col gap-1", className)}
      {...props}
    />
  );
}

function SidebarMenu({ className, ...props }: ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  );
}

function SidebarMenuItem({ className, ...props }: ComponentProps<"li">) {
  return (
    <li data-slot="sidebar-menu-item" className={className} {...props} />
  );
}

function SidebarMenuButton({
  className,
  isActive = false,
  asChild = false,
  ...props
}: ComponentProps<"a"> & { isActive?: boolean; asChild?: boolean }) {
  const Comp = asChild ? Slot : "a";
  return (
    <Comp
      data-slot="sidebar-menu-button"
      className={cn(
        "flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isActive &&
          "bg-sidebar-accent text-sidebar-accent-foreground font-semibold",
        className,
      )}
      {...props}
    />
  );
}

function SidebarInset({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-inset"
      className={cn("flex min-h-svh flex-1 flex-col", className)}
      {...props}
    />
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
};
