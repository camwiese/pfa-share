"use client";

import { useRef } from "react";

// Six-cell OTP code input. Mirrors WSV's UX:
//   - one digit per cell, auto-advances focus on type
//   - backspace clears current; if empty, moves to and clears previous
//   - paste fills all six cells in one shot
//   - calls onComplete(code) when the six digits are filled (typed or pasted)
//
// Controlled via an array-of-6 string value, parent owns state.

export default function CodeInput({ value, onChange, onComplete, disabled, autoFocus = true }) {
  const refs = useRef([]);

  function handleInput(i, e) {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[i] = digit;
    onChange(next);

    if (digit && i < 5) refs.current[i + 1]?.focus();
    if (digit && i === 5) {
      const code = next.join("");
      if (code.length === 6) onComplete?.(code);
    }
  }

  function handleKeyDown(i, e) {
    if (e.key === "Backspace") {
      if (value[i]) {
        const next = [...value];
        next[i] = "";
        onChange(next);
      } else if (i > 0) {
        const next = [...value];
        next[i - 1] = "";
        onChange(next);
        refs.current[i - 1]?.focus();
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && i > 0) {
      refs.current[i - 1]?.focus();
      e.preventDefault();
    } else if (e.key === "ArrowRight" && i < 5) {
      refs.current[i + 1]?.focus();
      e.preventDefault();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = Array.from({ length: 6 }, (_, idx) => pasted[idx] || "");
    onChange(next);
    const focusIdx = Math.min(pasted.length, 5);
    refs.current[focusIdx]?.focus();
    if (pasted.length === 6) onComplete?.(pasted);
  }

  return (
    <div className="code-input">
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]"
          maxLength={1}
          autoComplete={i === 0 ? "one-time-code" : "off"}
          autoFocus={autoFocus && i === 0}
          value={value[i] || ""}
          onChange={(e) => handleInput(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          className="code-input__cell"
        />
      ))}
    </div>
  );
}
