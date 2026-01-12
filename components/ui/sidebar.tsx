
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { PanelLeft } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DialogTitle, DialogDescription } from "@radix-ui/react-dialog"

const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days
const SIDEBAR_WIDTH_EXPANDED = "16rem"
const SIDEBAR_WIDTH_COLLAPSED = "3.5rem"
const SIDEBAR_WIDTH_MOBILE = "16rem"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

interface SidebarContextProps {
  isCollapsed: boolean
  isMobile: boolean
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  toggle: () => void
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null)

export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}

interface SidebarProviderProps {
  children: React.ReactNode
  defaultCollapsed?: boolean
  collapsible?: boolean
  storageKey?: string
}

export function SidebarProvider({
  children,
  defaultCollapsed = false,
  collapsible = true,
  storageKey = SIDEBAR_COOKIE_NAME,
}: SidebarProviderProps) {
  const isMobile = useIsMobile()
  const pathname = usePathname()

  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    if (!collapsible) return false
    if (isMobile) return true

    if (typeof window !== "undefined") {
      const storedValue = window.localStorage.getItem(storageKey)
      return storedValue ? JSON.parse(storedValue) : defaultCollapsed
    }

    return defaultCollapsed
  })

  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true)
    } else {
      const storedValue = window.localStorage.getItem(storageKey)
      setIsCollapsed(storedValue ? JSON.parse(storedValue) : defaultCollapsed)
    }
  }, [isMobile, storageKey, defaultCollapsed])

  React.useEffect(() => {
    if (isMobile) {
      setIsOpen(false)
    }
  }, [pathname, isMobile])

  React.useEffect(() => {
    if (collapsible && !isMobile) {
      window.localStorage.setItem(storageKey, JSON.stringify(isCollapsed))
    }
  }, [isCollapsed, collapsible, isMobile, storageKey])


  const toggle = React.useCallback(() => {
    if (isMobile) {
      setIsOpen((prev) => !prev)
    } else if (collapsible) {
      setIsCollapsed((prev: boolean) => !prev)
    }
  }, [isMobile, collapsible])

  const contextValue = React.useMemo(
    () => ({ isCollapsed, isMobile, isOpen, setIsOpen, toggle }),
    [isCollapsed, isMobile, isOpen, toggle]
  )

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        style={
          {
            "--sidebar-width-expanded": SIDEBAR_WIDTH_EXPANDED,
            "--sidebar-width-collapsed": SIDEBAR_WIDTH_COLLAPSED,
          } as React.CSSProperties
        }
        className={cn(
          "group/sidebar-wrapper flex min-h-screen w-full flex-col md:flex-row",
        )}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

export function Sidebar({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { isMobile, isOpen, setIsOpen, isCollapsed } = useSidebar()

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="left"
          className="w-[var(--sidebar-width)] bg-sidebar p-0 text-sidebar-foreground"
          style={{ "--sidebar-width": SIDEBAR_WIDTH_MOBILE } as React.CSSProperties}
          {...props}
        >
          <DialogTitle className="sr-only">Mobile Navigation Menu</DialogTitle>
          <DialogDescription className="sr-only">Main navigation links for the application.</DialogDescription>
          <div className="flex h-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <aside
      data-collapsed={isCollapsed}
      className={cn(
        "hidden md:flex flex-col z-40 transition-all duration-300 ease-in-out bg-sidebar text-sidebar-foreground border-r fixed left-0 top-0 h-screen",
        "data-[collapsed=false]:w-[var(--sidebar-width-expanded)] data-[collapsed=true]:w-[var(--sidebar-width-collapsed)]",
        className
      )}
      {...props}
    >
      <div className="flex flex-col h-full w-full overflow-hidden">{children}</div>
    </aside>
  )
}

export function SidebarTrigger({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggle } = useSidebar()
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={toggle}
      {...props}
    >
      <PanelLeft />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
}

export function SidebarHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { isCollapsed } = useSidebar()
  return (
    <div
      data-collapsed={isCollapsed}
      className={cn(
        "flex h-16 items-center border-b border-sidebar-border p-4",
        "data-[collapsed=true]:px-2",
        className
      )}
      {...props}
    />
  )
}

export function SidebarBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex min-h-0 flex-1 flex-col overflow-auto", className)}
      {...props}
    />
  )
}

export function SidebarMenu({
  className,
  ...props
}: React.HTMLAttributes<HTMLUListElement>) {
  const { isCollapsed } = useSidebar()
  return (
    <ul
      data-collapsed={isCollapsed}
      className={cn(
        "flex w-full flex-col gap-1 p-2",
        className
      )}
      {...props}
    />
  )
}

interface SidebarMenuItemProps extends React.HTMLAttributes<HTMLLIElement> {
  href: string
  isActive?: boolean
  tooltip?: React.ReactNode
}

export function SidebarMenuItem({
  href,
  isActive,
  tooltip,
  className,
  children,
  ...props
}: SidebarMenuItemProps) {
  const { isCollapsed, isMobile, setIsOpen } = useSidebar()
  const router = useRouter()

  return (
    <li
      className={cn(
        "group/item relative rounded-lg text-sm font-medium border-2 border-transparent",
        isActive ? "bg-sidebar-primary text-sidebar-primary-foreground border-transparent" : "hover:border-primary",
        className
      )}
      {...props}
    >
      <div
        onClick={(e) => {
          e.preventDefault();

          if (isActive) {
            if (isMobile) setIsOpen(false);
            return;
          }

          if (isMobile) setIsOpen(false);
          router.push(href);
        }}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg p-2 text-left outline-none ring-sidebar-ring transition-colors focus-visible:ring-2 cursor-pointer select-none",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
        role="button"
        tabIndex={0}
      >
        {children}
      </div>
    </li>
  )
}

export function SidebarFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { isCollapsed } = useSidebar()
  return (
    <div
      data-collapsed={isCollapsed}
      className={cn(
        "mt-auto flex flex-col gap-2 p-4 border-t border-sidebar-border",
        "data-[collapsed=true]:p-2",
        className
      )}
      {...props}
    />
  )
}
