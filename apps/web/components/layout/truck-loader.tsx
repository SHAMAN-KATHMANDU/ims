"use client";

import styles from "./truck-loader.module.css";

export function TruckLoader({ className }: { className?: string }) {
  return (
    <svg
      className={`${styles.truck} ${className ?? ""}`}
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
        <g className={styles.truck__body}>
          <g strokeDasharray="105 105">
            <polyline
              className={styles.truck__outside1}
              points="2 17,1 17,1 11,5 9,7 1,39 1,39 6"
            />
            <polyline
              className={styles.truck__outside2}
              points="39 12,39 17,31.5 17"
            />
            <polyline
              className={styles.truck__outside3}
              points="22.5 17,11 17"
            />
            <polyline
              className={styles.truck__window1}
              points="6.5 4,8 4,8 9,5 9"
            />
            <polygon
              className={styles.truck__window2}
              points="10 4,10 9,14 9,14 4"
            />
          </g>
          <polyline
            className={styles.truck__line}
            points="43 8,31 8"
            strokeDasharray="10 2 10 2 10 2 10 2 10 2 10 26"
          />
          <polyline
            className={styles.truck__line}
            points="47 10,31 10"
            strokeDasharray="14 2 14 2 14 2 14 2 14 18"
          />
        </g>
        <g strokeDasharray="15.71 15.71">
          <g className={styles.truck__wheel}>
            <circle
              className={styles.truck__wheelSpin}
              r={2.5}
              cx={6.5}
              cy={17}
            />
          </g>
          <g className={styles.truck__wheel}>
            <circle
              className={styles.truck__wheelSpin}
              r={2.5}
              cx={27}
              cy={17}
            />
          </g>
        </g>
      </g>
    </svg>
  );
}
