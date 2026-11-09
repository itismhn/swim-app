"use client";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type Pref = "light" | "dark" | "system";
const KEY = "theme";
const ORDER: Pref[] = ["light", "dark", "system"];
const LABEL: Record<Pref, string> = { light: "پوسته روشن", dark: "پوسته تیره", system: "پوسته هماهنگ با سیستم" };

/** Runs before paint (inlined in <head>) so the page never flashes the wrong theme. */
export const themeInitScript = `(function(){try{var p=localStorage.getItem("${KEY}");var d=p==="dark"||(p!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){}})()`;

function read(): Pref {
  try { const p = localStorage.getItem(KEY); return p === "light" || p === "dark" ? p : "system"; } catch { return "system"; }
}

function apply(p: Pref) {
  const dark = p === "dark" || (p === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0a121b" : "#0a73a1");
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [pref, setPref] = useState<Pref | null>(null);

  useEffect(() => { setPref(read()); }, []);
  useEffect(() => {
    if (!pref) return;
    apply(pref);
    if (pref !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const on = () => apply("system");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [pref]);

  const next = () => {
    const n = ORDER[(ORDER.indexOf(pref ?? "system") + 1) % ORDER.length];
    try { if (n === "system") localStorage.removeItem(KEY); else localStorage.setItem(KEY, n); } catch {}
    setPref(n);
  };

  const Icon = pref === "dark" ? Moon : pref === "light" ? Sun : Monitor;
  const label = pref ? `${LABEL[pref]} — برای تغییر کلیک کنید` : "تغییر پوسته";
  return (
    <button type="button" onClick={next} className={`btn-secondary btn-sm size-10 rounded-xl px-0 ${className}`} aria-label={label} title={pref ? LABEL[pref] : undefined}>
      <Icon aria-hidden className="!size-[18px]" />
    </button>
  );
}
