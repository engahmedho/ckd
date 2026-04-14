import React from "react";
import { cn } from "../lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className }) => {
  return (
    <div className={cn(
      "bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden",
      className
    )}>
      {children}
    </div>
  );
};
