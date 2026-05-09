"use client";

import type { ReactNode } from "react";

interface TemplateThumbnailProps {
  slug: string;
}

export function TemplateThumbnail({ slug }: TemplateThumbnailProps) {
  const width = 200;
  const height = 140;

  // Minimal SVG previews per template — each is a stylized mockup of its home page
  const thumbnails: Record<string, ReactNode> = {
    blank: (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <rect width={width} height={height} fill="#f9fafb" />
        <rect x="0" y="0" width={width} height="20" fill="#e5e7eb" />
        <rect x="10" y="30" width={width - 20} height="30" fill="#f3f4f6" />
        <rect
          x="10"
          y="70"
          width={(width - 20) / 2 - 5}
          height="25"
          fill="#f3f4f6"
        />
        <rect
          x={width / 2 + 5}
          y="70"
          width={(width - 20) / 2 - 5}
          height="25"
          fill="#f3f4f6"
        />
      </svg>
    ),
    auric: (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <rect width={width} height={height} fill="#fffbf0" />
        <rect x="0" y="0" width={width} height="20" fill="#d4af37" />
        <rect x="10" y="30" width={width - 20} height="35" fill="#f4e4c1" />
        <text
          x={width / 2}
          y="85"
          fontSize="14"
          fontWeight="bold"
          textAnchor="middle"
          fill="#8b7500"
          fontFamily="Georgia, serif"
        >
          Auric
        </text>
      </svg>
    ),
    fold: (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <rect width={width} height={height} fill="#f5f5f5" />
        <rect x="0" y="0" width={width} height="16" fill="#222" />
        <rect
          x="8"
          y="25"
          width={(width - 16) / 2 - 2}
          height="30"
          fill="#e0e0e0"
        />
        <rect
          x={width / 2 + 6}
          y="25"
          width={(width - 16) / 2 - 2}
          height="60"
          fill="#ddd"
        />
        <rect x="8" y="65" width={width - 16} height="8" fill="#f0f0f0" />
      </svg>
    ),
    forge: (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <rect width={width} height={height} fill="#1a1a1a" />
        <rect x="0" y="0" width={width} height="20" fill="#2a2a2a" />
        <rect x="10" y="30" width={width - 20} height="15" fill="#333" />
        <rect x="10" y="50" width={width - 20} height="12" fill="#2a2a2a" />
        <rect x="10" y="68" width={width - 20} height="12" fill="#333" />
      </svg>
    ),
    foxglove: (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <rect width={width} height={height} fill="#fce7f3" />
        <rect x="0" y="0" width={width} height="18" fill="#f472b6" />
        <rect x="10" y="28" width={width - 20} height="28" fill="#f0d9e8" />
        <circle cx="30" cy="75" r="12" fill="#e879b9" />
        <circle cx={width - 30} cy="75" r="12" fill="#d946a6" />
      </svg>
    ),
    lumen: (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <rect width={width} height={height} fill="#fafafa" />
        <rect
          x="0"
          y="0"
          width={width}
          height="16"
          fill="white"
          stroke="#e5e5e5"
          strokeWidth="0.5"
        />
        <rect x="20" y="28" width={width - 40} height="8" fill="#f0f0f0" />
        <rect
          x="20"
          y="42"
          width={(width - 40) / 3}
          height="15"
          fill="#f5f5f5"
        />
        <rect
          x={20 + (width - 40) / 3 + 4}
          y="42"
          width={(width - 40) / 3}
          height="15"
          fill="#f5f5f5"
        />
        <rect
          x={20 + (2 * (width - 40)) / 3 + 8}
          y="42"
          width={(width - 40) / 3}
          height="15"
          fill="#f5f5f5"
        />
      </svg>
    ),
    maison: (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <rect width={width} height={height} fill="#faf8f3" />
        <rect x="0" y="0" width={width} height="18" fill="#d4c5b0" />
        <rect
          x="10"
          y="26"
          width={(width - 20) / 2}
          height="35"
          fill="#e8ddd0"
        />
        <rect
          x={10 + (width - 20) / 2 + 4}
          y="26"
          width={(width - 20) / 2 - 4}
          height="18"
          fill="#d9cdc0"
        />
        <rect
          x={10 + (width - 20) / 2 + 4}
          y="48"
          width={(width - 20) / 2 - 4}
          height="13"
          fill="#d4c5b0"
        />
      </svg>
    ),
    pantry: (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <rect width={width} height={height} fill="#fffcf0" />
        <rect x="0" y="0" width={width} height="18" fill="#8b6f47" />
        <circle cx="30" cy="50" r="12" fill="#d4a574" />
        <circle cx="70" cy="50" r="12" fill="#c89968" />
        <circle cx="110" cy="50" r="12" fill="#a0785c" />
        <circle cx="150" cy="50" r="12" fill="#d4a574" />
        <rect x="10" y="75" width={width - 20} height="8" fill="#f5e6d3" />
      </svg>
    ),
    ridge: (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <rect width={width} height={height} fill="#e8dcc8" />
        <rect x="0" y="0" width={width} height="18" fill="#6b5344" />
        <polygon
          points={`${width / 2},30 ${width - 20},50 20,50`}
          fill="#8b7355"
        />
        <rect x="10" y="58" width={width - 20} height="10" fill="#d4c1ad" />
        <rect x="10" y="72" width={width - 20} height="10" fill="#a89968" />
      </svg>
    ),
    verdant: (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <rect width={width} height={height} fill="#f0fdf4" />
        <rect x="0" y="0" width={width} height="18" fill="#22c55e" />
        <circle cx="30" cy="65" r="10" fill="#86efac" />
        <circle cx="60" cy="55" r="10" fill="#16a34a" />
        <circle cx="90" cy="65" r="10" fill="#4ade80" />
        <circle cx="120" cy="55" r="10" fill="#22c55e" />
        <circle cx="150" cy="68" r="10" fill="#86efac" />
      </svg>
    ),
    volt: (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <rect width={width} height={height} fill="#0f172a" />
        <rect x="0" y="0" width={width} height="18" fill="#00ff88" />
        <rect
          x="10"
          y="28"
          width={width - 20}
          height="20"
          fill="#00ff88"
          opacity="0.2"
        />
        <line
          x1="0"
          y1="55"
          x2={width}
          y2="55"
          stroke="#00ff88"
          strokeWidth="1"
          opacity="0.5"
        />
        <rect
          x="10"
          y="65"
          width={(width - 20) / 2 - 3}
          height="15"
          fill="#0080ff"
          opacity="0.3"
        />
        <rect
          x={width / 2 + 7}
          y="65"
          width={(width - 20) / 2 - 3}
          height="15"
          fill="#00ff88"
          opacity="0.3"
        />
      </svg>
    ),
  };

  const thumbnail = thumbnails[slug] || thumbnails.blank;

  return (
    <div className="aspect-[200/140] bg-gray-100 border border-gray-200 rounded overflow-hidden">
      {thumbnail}
    </div>
  );
}
