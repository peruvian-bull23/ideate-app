"use client";

import { useState } from "react";

interface ExpandableTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  lines?: number;
}

export default function ExpandableText({ text, className = "", style = {}, lines = 2 }: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);

  const clampStyle = expanded ? {} : {
    display: "-webkit-box",
    WebkitLineClamp: lines,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
  };

  return (
    <div>
      <p
        className={className}
        style={{ ...style, ...clampStyle }}
      >
        {text}
      </p>
      {text.length > 120 && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(!expanded); }}
          className="text-base mt-1 font-medium"
          style={{ color: "var(--gold)" }}
        >
          {expanded ? "Show less" : "See more"}
        </button>
      )}
    </div>
  );
}
