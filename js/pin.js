// js/pin.js — 4-digit PIN modal for confirming destructive actions.

import * as data from "./db.js";
import { $ } from "./ui.js";

function openPinModal({ title, hint, validate }) {
  return new Promise((resolve) => {
    const modal = $("pin-modal");
    const titleEl = $("pin-title");
    const hintEl = $("pin-hint");
    const errorEl = $("pin-error");
    const wrap = $("pin-inputs");
    const inputs = Array.from(wrap.querySelectorAll(".pin-cell"));

    titleEl.textContent = title || "Enter PIN";
    hintEl.textContent = hint || "";
    errorEl.textContent = "";
    inputs.forEach((i) => {
      i.value = "";
      i.classList.remove("filled");
    });
    modal.classList.remove("hidden");
    setTimeout(() => inputs[0].focus(), 60);

    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      modal.classList.add("hidden");
      document.removeEventListener("keydown", escHandler);
      resolve(result);
    };
    const escHandler = (e) => {
      if (e.key === "Escape" && !modal.classList.contains("hidden")) finish(null);
    };
    document.addEventListener("keydown", escHandler);
    modal.onclick = (e) => {
      if (e.target === modal) finish(null);
    };
    $("pin-close").onclick = () => finish(null);

    const shakeIt = (msg) => {
      errorEl.textContent = msg || "";
      wrap.classList.add("pin-shake");
      setTimeout(() => {
        wrap.classList.remove("pin-shake");
        inputs.forEach((i) => {
          i.value = "";
          i.classList.remove("filled");
        });
        inputs[0].focus();
      }, 360);
    };

    const complete = () => {
      const v = inputs.map((i) => i.value).join("");
      if (v.length !== 4) return;
      const r = validate(v);
      if (r && r.ok) finish(r.value !== undefined ? r.value : v);
      else shakeIt((r && r.message) || "Wrong PIN");
    };

    inputs.forEach((inp, idx) => {
      inp.oninput = (e) => {
        const val = String(e.target.value || "").replace(/\D/g, "").slice(-1);
        e.target.value = val;
        e.target.classList.toggle("filled", !!val);
        if (val && idx < inputs.length - 1) inputs[idx + 1].focus();
        errorEl.textContent = "";
        if (inputs.every((i) => i.value)) complete();
      };
      inp.onkeydown = (e) => {
        if (e.key === "Backspace" && !e.target.value && idx > 0) {
          inputs[idx - 1].value = "";
          inputs[idx - 1].classList.remove("filled");
          inputs[idx - 1].focus();
        } else if (e.key === "ArrowLeft" && idx > 0) {
          inputs[idx - 1].focus();
        } else if (e.key === "ArrowRight" && idx < inputs.length - 1) {
          inputs[idx + 1].focus();
        }
      };
      inp.onpaste = (e) => {
        e.preventDefault();
        const text = String((e.clipboardData && e.clipboardData.getData("text")) || "")
          .replace(/\D/g, "")
          .slice(0, 4);
        text.split("").forEach((d, i) => {
          if (inputs[i]) {
            inputs[i].value = d;
            inputs[i].classList.add("filled");
          }
        });
        const next = inputs.findIndex((i) => !i.value);
        (next === -1 ? inputs[3] : inputs[next]).focus();
        if (inputs.every((i) => i.value)) complete();
      };
    });
  });
}

export function promptPin({ title, hint, expected }) {
  return openPinModal({
    title: title || "Enter PIN",
    hint: hint || "4-digit code required",
    validate: (v) =>
      v === expected
        ? { ok: true, value: true }
        : { ok: false, message: "Wrong PIN. Try again." }
  });
}

export async function promptNewPin() {
  const first = await openPinModal({
    title: "Set a 4-digit PIN",
    hint: "You'll enter this to confirm deletes.",
    validate: (v) => ({ ok: true, value: v })
  });
  if (!first) return null;

  const second = await openPinModal({
    title: "Confirm PIN",
    hint: "Enter the same 4 digits again.",
    validate: (v) =>
      v === first
        ? { ok: true, value: v }
        : { ok: false, message: "PINs don't match. Try again." }
  });
  if (!second) return null;

  await data.setPin(second);
  return second;
}