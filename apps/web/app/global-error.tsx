"use client";

// Only import error-page CSS so we don't request the main app CSS chunk
// (avoids Turbopack "No link element found for chunk" when error boundary mounts)
import "./global-error.css";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
}) {
  const goBack = () => {
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
      <body className="global-error-body">
        <div className="error-container">
          <div className="error-content">
            <h1 className="error-title">Oops! Something went wrong</h1>
            <p className="error-message">
              Well, that escalated quickly. Our delivery truck didn&apos;t make
              it.
            </p>

            <div className="truck-loader-wrapper">
              <div className="road" />
              <div className="road-lines" />

              {/* Wall moves from right toward the truck (front of truck) */}
              <div className="wall" />

              <div className="tire-explosion">
                <div className="explosion-flash" />
                <div className="explosion-particle" />
                <div className="explosion-particle" />
                <div className="explosion-particle" />
                <div className="explosion-particle" />
                <div className="explosion-particle" />
                <div className="explosion-particle" />
                <div className="explosion-particle" />
                <div className="explosion-particle" />
              </div>

              <div className="impact-effect">
                <div className="impact-ring" />
                <div className="impact-ring" />
                <div className="impact-ring" />
              </div>

              <svg
                className="truck"
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
                  <g className="truck__body">
                    <g strokeDasharray="105 105">
                      <polyline
                        className="truck__outside1"
                        points="2 17,1 17,1 11,5 9,7 1,39 1,39 6"
                      />
                      <polyline
                        className="truck__outside2"
                        points="39 12,39 17,31.5 17"
                      />
                      <polyline
                        className="truck__outside3"
                        points="22.5 17,11 17"
                      />
                      <polyline
                        className="truck__window1"
                        points="6.5 4,8 4,8 9,5 9"
                      />
                      <polygon
                        className="truck__window2"
                        points="10 4,10 9,14 9,14 4"
                      />
                    </g>
                    <polyline
                      className="truck__line"
                      points="43 8,31 8"
                      strokeDasharray="10 2 10 2 10 2 10 2 10 2 10 26"
                    />
                    <polyline
                      className="truck__line"
                      points="47 10,31 10"
                      strokeDasharray="14 2 14 2 14 2 14 2 14 18"
                    />
                  </g>
                  <g strokeDasharray="15.71 15.71">
                    <g className="truck__wheel">
                      <circle
                        className="truck__wheel-spin"
                        r={2.5}
                        cx={6.5}
                        cy={17}
                      />
                    </g>
                    <g className="truck__wheel">
                      <circle
                        className="truck__wheel-spin"
                        r={2.5}
                        cx={27}
                        cy={17}
                      />
                    </g>
                  </g>
                </g>
              </svg>
            </div>

            <button type="button" className="try-again-btn" onClick={goBack}>
              Go back
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
