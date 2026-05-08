"use client";

import { forwardRef, ReactNode, useState } from "react";
import type { JSX } from "react";

/* Section — form section header */
interface SectionProps {
  label: string;
  children: ReactNode;
}

export function Section({ label, children }: SectionProps): JSX.Element {
  return (
    <div>
      <div
        className="mono"
        style={{
          fontSize: 10.5,
          color: "var(--ink-4)",
          letterSpacing: 0.5,
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

/* Field — labeled form field */
interface FieldProps {
  label: string;
  children: ReactNode;
}

export function Field({ label, children }: FieldProps): JSX.Element {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 4 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

/* Input — text input */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ mono = false, ...props }, ref) => (
    <input
      ref={ref}
      className={mono ? "mono" : ""}
      style={{
        width: "100%",
        height: 28,
        padding: "0 8px",
        border: "1px solid var(--line)",
        borderRadius: 5,
        background: "var(--bg-elev)",
        fontSize: 12,
        outline: "none",
      }}
      {...props}
    />
  ),
);

Input.displayName = "Input";

/* TextArea — multiline text input */
type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (props, ref) => (
    <textarea
      ref={ref}
      style={{
        width: "100%",
        padding: "6px 8px",
        border: "1px solid var(--line)",
        borderRadius: 5,
        background: "var(--bg-elev)",
        fontSize: 12,
        outline: "none",
        resize: "vertical",
        fontFamily: "var(--font-sans)",
      }}
      {...props}
    />
  ),
);

TextArea.displayName = "TextArea";

/* Select — dropdown button */
interface SelectProps {
  value: string;
  options: string[];
  onChange?: (value: string) => void;
}

export function Select({ value, options, onChange }: SelectProps): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          height: 28,
          padding: "0 8px",
          border: "1px solid var(--line)",
          borderRadius: 5,
          background: "var(--bg-elev)",
          fontSize: 12,
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>{value}</span>
        <span
          style={{
            display: "inline-block",
            width: 0,
            height: 0,
            borderLeft: "4px solid transparent",
            borderRight: "4px solid transparent",
            borderTop: "4px solid var(--ink-4)",
            color: "var(--ink-4)",
          }}
        />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "var(--bg-elev)",
            border: "1px solid var(--line)",
            borderRadius: 5,
            marginTop: 4,
            zIndex: 10,
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange?.(opt);
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "8px",
                textAlign: "left",
                background: opt === value ? "var(--bg-active)" : "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                color: opt === value ? "var(--ink)" : "var(--ink-2)",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* Toggle — switch control */
interface ToggleProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  defaultChecked?: boolean;
}

export function Toggle({
  checked,
  onCheckedChange,
  label,
  defaultChecked = false,
}: ToggleProps): JSX.Element {
  const [on, setOn] = useState(defaultChecked);
  const isControlled = checked !== undefined;
  const value = isControlled ? checked : on;

  const handleChange = (newVal: boolean) => {
    if (!isControlled) setOn(newVal);
    onCheckedChange?.(newVal);
  };

  return (
    <button
      onClick={() => handleChange(!value)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12,
        color: "var(--ink-2)",
        background: "none",
        border: "none",
        padding: 0,
      }}
    >
      <div
        style={{
          width: 26,
          height: 14,
          borderRadius: 999,
          position: "relative",
          background: value ? "var(--accent)" : "var(--line-strong)",
          transition: "background 120ms",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 1.5,
            left: value ? 13 : 1.5,
            width: 11,
            height: 11,
            borderRadius: 999,
            background: "white",
            transition: "left 120ms",
            boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
          }}
        />
      </div>
      {label && <span>{label}</span>}
    </button>
  );
}

/* Slider — range input */
interface SliderProps {
  value?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
}

export function Slider({
  value: initialValue = 50,
  onChange,
  min = 0,
  max = 100,
}: SliderProps): JSX.Element {
  const [v, setV] = useState(initialValue);

  const handleChange = (newVal: number) => {
    setV(newVal);
    onChange?.(newVal);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input
        type="range"
        min={min}
        max={max}
        value={v}
        onChange={(e) => handleChange(+e.target.value)}
        style={{ flex: 1, accentColor: "var(--accent)" }}
      />
      <span
        className="mono"
        style={{
          fontSize: 11,
          color: "var(--ink-3)",
          width: 30,
          textAlign: "right",
        }}
      >
        {v}px
      </span>
    </div>
  );
}

/* Segmented — button group toggle */
interface SegmentedProps {
  options: string[];
  value?: string;
  onChange?: (value: string) => void;
}

export function Segmented({
  options,
  value: initialValue = options[0],
  onChange,
}: SegmentedProps): JSX.Element {
  const [v, setV] = useState(initialValue);

  const handleChange = (newVal: string) => {
    setV(newVal);
    onChange?.(newVal);
  };

  return (
    <div
      style={{
        display: "flex",
        padding: 2,
        background: "var(--bg-sunken)",
        border: "1px solid var(--line)",
        borderRadius: 5,
      }}
    >
      {options.map((o) => (
        <button
          key={o}
          onClick={() => handleChange(o)}
          style={{
            flex: 1,
            height: 22,
            fontSize: 11.5,
            borderRadius: 3,
            background: v === o ? "var(--bg-elev)" : "transparent",
            color: v === o ? "var(--ink)" : "var(--ink-3)",
            boxShadow: v === o ? "var(--shadow-sm)" : "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/* Meter — progress bar with label */
interface MeterProps {
  value: number;
  max: number;
  label: string;
}

export function Meter({ value, max, label }: MeterProps): JSX.Element {
  const percentage = Math.min(100, (value / max) * 100);
  const isOverflow = value > max;

  return (
    <div style={{ marginTop: 4 }}>
      <div
        style={{
          height: 3,
          background: "var(--bg-sunken)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            background: isOverflow ? "var(--warn)" : "var(--accent)",
          }}
        />
      </div>
      <div
        className="mono"
        style={{
          fontSize: 10.5,
          color: "var(--ink-4)",
          marginTop: 2,
        }}
      >
        {label}
      </div>
    </div>
  );
}
