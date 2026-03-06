"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Global error page – Kaboom-style minimal aesthetic. Self-contained with inline
 * CSS to avoid Turbopack "No link element found for chunk" when the error
 * boundary replaces the document. Uses DM Sans, Space Mono, and earthy palette.
 */

const GLOBAL_ERROR_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:400,500,700&family=Space+Mono:400,700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #faf9f7;
    --line: #2d2c2b;
    --primary: #5a8f6b;
    --muted: #6d6c6b;
    --destructive: #c94a3d;
    --accent: #b8860b;
    --primary-foreground: #faf9f7;
    --dur: 3s;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #1a1a19;
      --line: #e8e6e4;
      --primary: #7ab88a;
      --muted: #9a9997;
      --destructive: #e05a4a;
      --accent: #d4a84b;
      --primary-foreground: #1a1a19;
    }
  }

  .global-error-body {
    margin: 0;
    padding: 0;
    min-height: 100vh;
  }

  .page {
    min-height: 100vh;
    background: var(--bg);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0;
    overflow: hidden;
    position: relative;
    font-family: 'Space Mono', 'SF Mono', Monaco, monospace;
    color: var(--line);
  }

  /* subtle grain */
  .page::before {
    content: '';
    position: fixed;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0,0,0,0.02) 2px,
      rgba(0,0,0,0.02) 4px
    );
    pointer-events: none;
    z-index: 100;
  }

  .road {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--muted);
  }
  .road::before {
    content: '';
    position: absolute;
    bottom: 8px;
    left: 0;
    right: 0;
    height: 1px;
    background: repeating-linear-gradient(
      90deg,
      var(--muted) 0px,
      var(--muted) 20px,
      transparent 20px,
      transparent 36px
    );
  }

  .scene {
    position: relative;
    width: 380px;
    height: 80px;
    margin-bottom: 8px;
  }

  .truck-wrap {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
  }

  .truck-enter {
    animation: driveIn 1s cubic-bezier(.22,.68,0,1.1) forwards;
  }
  @keyframes driveIn {
    from { transform: translateX(-340px); }
    to { transform: translateX(0); }
  }

  .truck-shake {
    animation: shake 0.06s linear 1.1s 8 alternate;
  }
  @keyframes shake {
    from { transform: translateX(-2px) rotate(-0.4deg); }
    to { transform: translateX(2px) rotate(0.4deg); }
  }

  .truck-die {
    animation: die 0.35s ease-in 1.65s forwards;
  }
  @keyframes die {
    0% { opacity: 1; transform: rotate(0deg) translateY(0); }
    60% { opacity: 1; transform: rotate(-5deg) translateY(-6px); }
    100% { opacity: 0; transform: rotate(8deg) translateY(4px); }
  }

  .truck-svg {
    display: block;
    width: 15em;
    height: auto;
    color: var(--line);
  }
  .truck-svg line,
  .truck-svg polyline,
  .truck-svg polygon,
  .truck-svg circle { stroke: currentColor; }
  .truck-svg .t-line,
  .truck-svg .t-win1,
  .truck-svg .t-win2 { stroke: var(--primary); opacity: 0.6; }

  .t-body { animation: truckBody var(--dur) linear infinite; transform-origin: 17px 11px; }
  .t-line { animation: truckLine var(--dur) linear infinite; }
  .t-out1 { animation: truckOutside1 var(--dur) linear infinite; }
  .t-out2 { animation: truckOutside2 var(--dur) linear infinite; }
  .t-out3 { animation: truckOutside3 var(--dur) linear infinite; }
  .t-win1 { animation: truckWindow1 var(--dur) linear infinite; }
  .t-win2 { animation: truckWindow2 var(--dur) linear infinite; }
  .t-wheel { animation: truckWheel var(--dur) linear infinite; }
  .t-wheel:nth-child(2) { animation-delay: calc(var(--dur) * 0.0625); }
  .t-wspin { animation: truckWheelSpin var(--dur) linear infinite; transform-origin: 6.5px 17px; }
  .t-wheel:nth-child(2) .t-wspin { transform-origin: 27px 17px; }

  @keyframes truckBody {
    0%,12.5%,25%,37.5%,50%,62.5%,75%,87.5%,100% {
      animation-timing-function: cubic-bezier(.33,0,.67,0);
      transform: translate(0,0) rotate(0);
    }
    6.25%,18.75%,31.25%,43.75%,56.25%,68.75%,81.25%,93.75% {
      animation-timing-function: cubic-bezier(.33,1,.67,1);
      transform: translate(0,1px) rotate(-0.75deg);
    }
  }
  @keyframes truckLine { from { stroke-dashoffset: -18; } to { stroke-dashoffset: 78; } }
  @keyframes truckOutside1 { from { stroke-dashoffset: 105; } to { stroke-dashoffset: -105; } }
  @keyframes truckOutside2 { from { stroke-dashoffset: 168; } to { stroke-dashoffset: -42; } }
  @keyframes truckOutside3 { from { stroke-dashoffset: 192; } to { stroke-dashoffset: -18; } }
  @keyframes truckWheel {
    0%,12.5%,25%,37.5%,50%,62.5%,75%,87.5%,100% {
      animation-timing-function: cubic-bezier(.33,0,.67,0);
      transform: translate(0,0);
    }
    6.25%,18.75%,31.25%,43.75%,56.25%,68.75%,81.25%,93.75% {
      animation-timing-function: cubic-bezier(.33,1,.67,1);
      transform: translate(0,-1px);
    }
  }
  @keyframes truckWheelSpin {
    from { stroke-dashoffset: -15.71; transform: rotate(0); }
    to { stroke-dashoffset: 15.71; transform: rotate(-4turn); }
  }
  @keyframes truckWindow1 { from { stroke-dashoffset: -21; } to { stroke-dashoffset: 189; } }
  @keyframes truckWindow2 { from { stroke-dashoffset: -39; } to { stroke-dashoffset: 171; } }

  .explosion {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    pointer-events: none;
  }

  .flash {
    position: fixed;
    inset: 0;
    background: white;
    opacity: 0;
    pointer-events: none;
    z-index: 90;
    animation: flashOut 0.35s ease-out 1.65s forwards;
  }
  @keyframes flashOut {
    0% { opacity: 0.9; }
    100% { opacity: 0; }
  }

  .shockwave {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    border: 1px solid rgba(184,134,11,0.9);
    opacity: 0;
    animation: shockExpand 0.55s ease-out 1.7s forwards;
  }
  @keyframes shockExpand {
    0% { opacity: 1; width: 4px; height: 4px; margin: -2px; }
    100% { opacity: 0; width: 320px; height: 180px; margin: -90px -160px; }
  }

  .fireball {
    position: absolute;
    border-radius: 50%;
    opacity: 0;
  }
  .fb-core {
    width: 48px;
    height: 40px;
    bottom: -20px;
    left: -24px;
    background: radial-gradient(circle, #fff 0%, #d4a84b 30%, #b8860b 60%, var(--destructive) 85%, transparent 100%);
    animation: fbPulse 0.12s ease-out 1.7s 18 alternate, fbFade 0.4s ease-in 4s forwards;
  }
  @keyframes fbPulse {
    0% { opacity: 0; transform: scale(0.2); }
    50% { opacity: 1; transform: scale(1.15); }
    100% { opacity: 0.9; transform: scale(1); }
  }
  @keyframes fbFade { to { opacity: 0; transform: scale(0.1); } }

  .fb-ring {
    width: 90px;
    height: 70px;
    bottom: -35px;
    left: -45px;
    background: radial-gradient(circle, transparent 28%, rgba(184,134,11,0.6) 50%, rgba(201,74,61,0.3) 70%, transparent 88%);
    animation: fbRing 0.7s ease-out 1.7s forwards;
  }
  @keyframes fbRing {
    0% { opacity: 0; transform: scale(0.2); }
    40% { opacity: 1; transform: scale(1.3); }
    100% { opacity: 0; transform: scale(2); }
  }

  .debris {
    position: absolute;
    bottom: 0;
    left: 0;
    background: var(--line);
    opacity: 0;
    border-radius: 1px;
    animation: flyDebris var(--dd, 1s) ease-out var(--ds, 1.7s) forwards;
  }
  @keyframes flyDebris {
    0% { opacity: 1; transform: translate(0,0) rotate(0deg); }
    100% { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(var(--dr, 180deg)); }
  }

  .smoke {
    position: absolute;
    border-radius: 50%;
    background: rgba(100,100,100,0.6);
    opacity: 0;
    animation: smokeUp var(--sd, 3.5s) ease-out var(--ss, 1.9s) forwards;
  }
  @keyframes smokeUp {
    0% { opacity: 0.7; transform: scale(0.3) translateY(0); }
    50% { opacity: 0.4; }
    100% { opacity: 0; transform: scale(2) translateY(-80px); }
  }

  .text-section {
    text-align: center;
    opacity: 0;
    animation: textIn 0.6s cubic-bezier(.22,.68,0,1.2) 2.1s forwards;
  }
  @keyframes textIn {
    from { opacity: 0; transform: translateY(18px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .err-num {
    font-family: 'DM Sans', system-ui, sans-serif;
    font-weight: 700;
    font-size: clamp(72px, 14vw, 120px);
    line-height: 1;
    letter-spacing: -2px;
    color: transparent;
    -webkit-text-stroke: 1.5px var(--line);
    position: relative;
  }
  .err-num::after {
    content: attr(data-text);
    position: absolute;
    inset: 0;
    color: var(--primary);
    -webkit-text-stroke: 0;
    clip-path: inset(0 100% 0 0);
    animation: glitch 0.08s steps(1) 2.1s 6 alternate;
  }
  @keyframes glitch {
    0% { clip-path: inset(20% 0 50% 0); transform: translateX(-3px); color: var(--primary); }
    33% { clip-path: inset(60% 0 10% 0); transform: translateX(3px); color: var(--accent); }
    66% { clip-path: inset(40% 0 30% 0); transform: translateX(-2px); color: var(--line); }
    100% { clip-path: inset(0 100% 0 0); transform: translateX(0); }
  }

  .err-label {
    font-size: 10px;
    letter-spacing: 6px;
    text-transform: uppercase;
    color: var(--muted);
    margin-top: 4px;
    margin-bottom: 28px;
  }

  .err-msg {
    font-size: 13px;
    color: var(--muted);
    letter-spacing: 1px;
    line-height: 2;
    margin-bottom: 32px;
  }
  .err-msg strong {
    color: var(--line);
    font-weight: 400;
  }

  .cursor {
    display: inline-block;
    width: 7px;
    height: 13px;
    background: var(--primary);
    vertical-align: middle;
    margin-left: 4px;
    animation: blink 0.9s step-end infinite;
  }
  @keyframes blink { 50% { opacity: 0; } }

  .btn-row {
    display: flex;
    gap: 12px;
    justify-content: center;
  }
  .btn {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 3px;
    text-transform: uppercase;
    padding: 10px 24px;
    border: 1px solid;
    border-radius: 2px;
    cursor: pointer;
    text-decoration: none;
    background: transparent;
    transition: background 0.15s, color 0.15s;
  }
  .btn-primary {
    color: var(--primary-foreground);
    background: var(--primary);
    border-color: var(--primary);
  }
  .btn-primary:hover {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--bg);
  }
  .btn-ghost {
    color: var(--muted);
    border-color: var(--muted);
  }
  .btn-ghost:hover {
    color: var(--line);
    border-color: var(--line);
  }

  .page.shake {
    animation: screenShake 0.04s linear 0s 10 alternate;
  }
  @keyframes screenShake {
    from { transform: translate(-4px, -2px); }
    to { transform: translate(4px, 2px); }
  }
`;

const DEBRIS = [
  {
    w: 14,
    h: 1,
    dx: "-90px",
    dy: "-55px",
    dr: "-300deg",
    dd: "1.1s",
    ds: "1.7s",
  },
  { w: 10, h: 1, dx: "80px", dy: "-70px", dr: "400deg", dd: "1s", ds: "1.72s" },
  {
    w: 6,
    h: 1,
    dx: "-60px",
    dy: "-90px",
    dr: "-200deg",
    dd: "0.9s",
    ds: "1.68s",
  },
  {
    w: 8,
    h: 1,
    dx: "110px",
    dy: "-40px",
    dr: "250deg",
    dd: "1.2s",
    ds: "1.74s",
  },
  { w: 5, h: 5, dx: "-80px", dy: "-80px", dr: "0", dd: "0.8s", ds: "1.7s" },
  { w: 4, h: 4, dx: "60px", dy: "-100px", dr: "0", dd: "0.85s", ds: "1.71s" },
  { w: 3, h: 3, dx: "-100px", dy: "-30px", dr: "0", dd: "1s", ds: "1.73s" },
  {
    w: 12,
    h: 1,
    dx: "40px",
    dy: "-55px",
    dr: "-150deg",
    dd: "0.95s",
    ds: "1.69s",
  },
];

const SMOKE = [
  { size: 28, dx: "-14px", sd: "3.5s", ss: "1.9s" },
  { size: 36, dx: "10px", sd: "4.5s", ss: "2.1s" },
  { size: 22, dx: "28px", sd: "3s", ss: "2.3s" },
  { size: 40, dx: "-5px", sd: "5s", ss: "2.5s" },
];

function TruckSvg() {
  return (
    <svg
      className="truck-svg"
      viewBox="0 0 48 24"
      width={48}
      height={24}
      aria-hidden
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1}
        transform="translate(0,2)"
      >
        <g className="t-body">
          <g strokeDasharray="105 105">
            <polyline
              className="t-out1"
              points="2 17,1 17,1 11,5 9,7 1,39 1,39 6"
            />
            <polyline className="t-out2" points="39 12,39 17,31.5 17" />
            <polyline className="t-out3" points="22.5 17,11 17" />
            <polyline className="t-win1" points="6.5 4,8 4,8 9,5 9" />
            <polygon className="t-win2" points="10 4,10 9,14 9,14 4" />
          </g>
          <polyline
            className="t-line"
            points="43 8,31 8"
            strokeDasharray="10 2 10 2 10 2 10 2 10 2 10 26"
          />
          <polyline
            className="t-line"
            points="47 10,31 10"
            strokeDasharray="14 2 14 2 14 2 14 2 14 18"
          />
        </g>
        <g strokeDasharray="15.71 15.71">
          <g className="t-wheel">
            <circle className="t-wspin" r={2.5} cx={6.5} cy={17} />
          </g>
          <g className="t-wheel">
            <circle className="t-wspin" r={2.5} cx={27} cy={17} />
          </g>
        </g>
      </g>
    </svg>
  );
}

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
}) {
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShake(true), 1680);
    const t2 = setTimeout(() => setShake(false), 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const handleTryAgain = () => {
    if (typeof reset === "function") {
      reset();
    } else if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  };

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Something went wrong</title>
        <style dangerouslySetInnerHTML={{ __html: GLOBAL_ERROR_STYLES }} />
      </head>
      <body className="global-error-body">
        <div className={`page${shake ? " shake" : ""}`}>
          <div className="flash" aria-hidden />
          <div className="road" aria-hidden />

          <div className="scene">
            <div className="truck-wrap">
              <div className="truck-enter truck-shake truck-die">
                <TruckSvg />
              </div>
            </div>

            <div className="explosion" aria-hidden>
              <div className="shockwave" />
              <div className="fireball fb-ring" />
              <div className="fireball fb-core" />

              {SMOKE.map((s, i) => (
                <div
                  key={`smoke-${i}`}
                  className="smoke"
                  style={
                    {
                      width: s.size,
                      height: s.size,
                      bottom: 10,
                      left: `calc(50% + ${s.dx})`,
                      "--sd": s.sd,
                      "--ss": s.ss,
                    } as React.CSSProperties & {
                      "--sd": string;
                      "--ss": string;
                    }
                  }
                />
              ))}

              {DEBRIS.map((d, i) => (
                <div
                  key={`debris-${i}`}
                  className="debris"
                  style={
                    {
                      width: d.w,
                      height: d.h,
                      borderRadius: d.h > 2 ? "50%" : "1px",
                      "--dx": d.dx,
                      "--dy": d.dy,
                      "--dr": d.dr,
                      "--dd": d.dd,
                      "--ds": d.ds,
                    } as React.CSSProperties & {
                      "--dx": string;
                      "--dy": string;
                      "--dr": string;
                      "--dd": string;
                      "--ds": string;
                    }
                  }
                />
              ))}
            </div>
          </div>

          <div className="text-section">
            <div className="err-num" data-text="500">
              500
            </div>
            <div className="err-label">internal server error</div>
            <div className="err-msg">
              <strong>something went kaboom.</strong>
              <br />
              our truck didn&apos;t make it.
              <br />
              engineers have been paged.
              <span className="cursor" aria-hidden />
            </div>
            <div className="btn-row">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleTryAgain}
              >
                try again
              </button>
              <Link href="/" className="btn btn-ghost">
                go home
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
