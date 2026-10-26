import React from "react";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function Logo({
  className = "",
  showText = true,
  size = "md",
}: LogoProps) {
  const iconDimensions = {
    sm: "h-7 w-7",
    md: "h-9 w-9",
    lg: "h-12 w-12",
  }[size];

  const textStyles = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  }[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`${iconDimensions} flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 p-2 shadow-md shadow-indigo-200/50`}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
        >
          <path
            d="M6 36C12 34 20 34 24 38C28 34 36 34 42 36V12C36 10 28 10 24 14C20 10 12 10 6 12V36Z"
            fill="white"
            fillOpacity="0.25"
          />
          <path
            d="M8 34C13.5 32.5 19.5 32.5 24 36.5C28.5 32.5 34.5 32.5 40 34V13C34.5 11.5 28.5 11.5 24 15.5C19.5 11.5 13.5 11.5 8 13V34Z"
            fill="white"
          />
          <path
            d="M24 15.5V36.5"
            stroke="#4338CA"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path d="M32 10L36 15L40 10V6H32V10Z" fill="#10B981" />
          <circle cx="24" cy="7" r="2.5" fill="#FBBF24" />
        </svg>
      </div>

      {showText && (
        <span className={`font-black tracking-tight text-slate-900 ${textStyles}`}>
          School<span className="text-indigo-600">Buddy</span>
        </span>
      )}
    </div>
  );
}