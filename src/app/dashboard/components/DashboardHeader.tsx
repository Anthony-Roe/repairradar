"use client";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Bell, Settings, User } from "lucide-react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@radix-ui/react-tooltip";
import { Dispatch, SetStateAction } from "react";

export default function DashboardHeader({ 
  meta, 
  activeTab, 
  setActiveTab 
}: DashboardHeaderProps) {
  return (
    <header className="p-fill sticky top-0 z-500">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left Section: Logo and Tabs */}
        <div className="flex items-center gap-4">
        <nav className="flex items-center gap-4 text-sm xl:gap-6">
            <h1 className="text-lg font-bold flex items-center gap-2 tracking-tight">
              <a className="text-foreground" href="">
                {meta.name}
              </a>
            </h1>
            <a className="transition-colors hover:text-foreground text-foreground/80" href="/docs/installation">Docs</a>
            <a className="transition-colors hover:text-foreground text-foreground/80" href="/docs/components">Components</a>
            <a className="transition-colors hover:text-foreground text-foreground/80" href="/blocks">Blocks</a>
            <a className="transition-colors hover:text-foreground text-foreground/80" href="/charts">Charts</a>
            <a className="transition-colors hover:text-foreground text-foreground/80" href="/themes">Themes</a>
            <a className="transition-colors hover:text-foreground text-foreground/80" href="/colors">Colors</a>
          </nav>
        </div>

        {/* Right Section: Action Buttons */}
        <div className="flex items-center gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground hover:bg-primary rounded-full transition-colors"
                >
                  <Bell className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs font-medium bg-muted text-foreground px-2 py-1 rounded-md border border-border">
                  Notifications
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
  
          <Button
            variant="ghost"
            size="icon"
            className=" text-muted-foreground hover:text-foreground hover:bg-primary rounded-full transition-colors"
          >
            <Settings className="h-5 w-5" />
          </Button>
  
          <Button
            variant="outline"
            className="gap-2 bg-background/5 border-border hover:bg-primary hover:text-foreground text-muted-foreground transition-colors rounded-md"
          >
            <User className="h-4 w-4" />
            <span>Profile</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

interface DashboardHeaderProps {
    meta: { name: string };
    activeTab: string;
    setActiveTab: Dispatch<SetStateAction<string>>;
  }