"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

// ModeToggle Component: Simple Light/Dark Switch
function ModeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Button variant="outline" size="icon" onClick={toggleTheme} className="ml-4">
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

// Footer Component
export default function Footer() {
  return (
    <footer className="w-full bg-background border-t">
      <div className="container mx-auto px-4 h-14 flex items-center justify-center gap-4">
        <h3 className="text-lg font-semibold text-foreground">RepairRadar</h3>
        <ModeToggle />
      </div>
      <div className="container mx-auto px-4 py-2 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} RepairRadar. All rights reserved.
      </div>
    </footer>
  );
}