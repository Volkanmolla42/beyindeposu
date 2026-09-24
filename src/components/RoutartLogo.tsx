import React from "react";

interface RoutartLogoProps {
  variant?: "light" | "dark" | "pill";
  showTagline?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function RoutartLogo({
  variant = "dark",
  showTagline = false,
  className = "",
  size = "md",
}: RoutartLogoProps) {
  const isDarkBg = variant === "dark";
  const isPill = variant === "pill";

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const taglineSizes = {
    sm: "text-[9px]",
    md: "text-[10px]",
    lg: "text-xs",
  };

  const content = (
    <div className={`inline-flex items-center gap-2 group transition-all select-none ${className}`}>
      <div className="flex items-center font-black tracking-tight leading-none">
        <span
          className={`transition-colors font-extrabold ${
            isDarkBg ? "text-white group-hover:text-slate-200" : "text-slate-900 group-hover:text-slate-700"
          } ${sizeClasses[size]}`}
        >
          ROUT
        </span>
        <span
          className={`text-[#ff5a1f] group-hover:text-[#ff7543] transition-colors font-black ${sizeClasses[size]}`}
        >
          ART
        </span>
      </div>

      {showTagline && (
        <span
          className={`uppercase tracking-widest font-semibold opacity-70 group-hover:opacity-100 transition-opacity ${
            taglineSizes[size]
          } ${isDarkBg ? "text-slate-300" : "text-slate-600"}`}
        >
          Digital Strategy Studio
        </span>
      )}
    </div>
  );

  return (
    <a
      href="https://routart.com/"
      target="_blank"
      rel="noopener noreferrer"
      title="ROUTART - Digital Strategy Studio"
      className={
        isPill
          ? `inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700/60 bg-slate-800/80 hover:bg-slate-800 hover:border-slate-600 transition-all ${className}`
          : className
      }
    >
      {content}
    </a>
  );
}
