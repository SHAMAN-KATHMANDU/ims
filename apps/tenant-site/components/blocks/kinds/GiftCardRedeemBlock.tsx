"use client";

/**
 * gift-card-redeem — customer-facing form that hits POST
 * /public/gift-cards/redeem via the same-origin forwarder.
 *
 * On success the block shows the remaining balance inline; on failure it
 * shows the backend's error message. The POST runs in the browser so no
 * server secrets ever reach the client bundle.
 */

import { useState } from "react";
import type { GiftCardRedeemProps } from "@repo/shared";
import { postGiftCardRedeem, type GiftCardRedeemResponse } from "@/lib/api";
import { formatPrice, getSiteFormatOptions } from "@/lib/format";
import type { BlockComponentProps } from "../registry";

type Status = "idle" | "submitting" | "ok" | "error";

export function GiftCardRedeemBlock({
  node,
  props,
  dataContext,
}: BlockComponentProps<GiftCardRedeemProps>) {
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<GiftCardRedeemResponse | null>(null);

  const { locale, currency } = getSiteFormatOptions(dataContext.site);
  const fmt = (n: number) => formatPrice(n, { locale, currency });

  const wrapperHasPadY = node.style?.paddingY !== undefined;
  const variant = props.variant ?? "card";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!code || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setStatus("error");
      setResult({ message: "Enter a valid code and amount." });
      return;
    }
    setStatus("submitting");
    setResult(null);
    const resp = await postGiftCardRedeem({ code, amount: parsedAmount });
    setResult(resp);
    setStatus(resp.giftCard ? "ok" : "error");
  }

  const successTemplate =
    props.successMessage ?? "Redeemed! Remaining balance: {balance}";

  return (
    <section
      style={{
        padding: wrapperHasPadY ? undefined : "var(--section-padding) 0",
      }}
    >
      <div
        className="container"
        style={{
          maxWidth: 520,
          padding: variant === "card" ? "2rem" : undefined,
          border:
            variant === "card" ? "1px solid var(--color-border)" : undefined,
          borderRadius: variant === "card" ? "var(--radius)" : undefined,
          background: variant === "card" ? "var(--color-surface)" : undefined,
        }}
      >
        {props.heading && (
          <h2
            style={{
              fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
              fontFamily: "var(--font-display)",
              marginBottom: "0.5rem",
            }}
          >
            {props.heading}
          </h2>
        )}
        {props.subtitle && (
          <p
            style={{
              color: "var(--color-muted)",
              marginBottom: "1.5rem",
              lineHeight: 1.6,
            }}
          >
            {props.subtitle}
          </p>
        )}
        <form
          onSubmit={onSubmit}
          noValidate
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: "0.85rem" }}>
              {props.codeLabel ?? "Gift card code"}
            </span>
            <input
              type="text"
              required
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{
                padding: "0.75rem",
                minHeight: 44,
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius)",
                background: "var(--color-background)",
                color: "var(--color-text)",
                fontSize: "1rem",
              }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: "0.85rem" }}>
              {props.amountLabel ?? "Amount to redeem"}
            </span>
            <input
              type="number"
              required
              min={1}
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{
                padding: "0.75rem",
                minHeight: 44,
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius)",
                background: "var(--color-background)",
                color: "var(--color-text)",
                fontSize: "1rem",
              }}
            />
          </label>
          <button
            type="submit"
            className="btn"
            disabled={status === "submitting"}
            style={{
              minHeight: 44,
              justifyContent: "center",
              opacity: status === "submitting" ? 0.7 : 1,
              cursor: status === "submitting" ? "progress" : "pointer",
            }}
          >
            {status === "submitting"
              ? "Redeeming…"
              : (props.buttonLabel ?? "Redeem")}
          </button>
          <p
            role={status === "error" ? "alert" : "status"}
            aria-live="polite"
            style={{
              margin: 0,
              minHeight: "1.25rem",
              fontSize: "0.9rem",
              color:
                status === "ok"
                  ? "var(--color-success)"
                  : status === "error"
                    ? "var(--color-error)"
                    : "var(--color-muted)",
            }}
          >
            {status === "ok" && result?.giftCard
              ? successTemplate.replace(
                  "{balance}",
                  fmt(result.giftCard.balance),
                )
              : status === "error"
                ? (result?.message ?? "Redemption failed.")
                : ""}
          </p>
        </form>
      </div>
    </section>
  );
}
