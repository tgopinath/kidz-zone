"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { AlertTriangle, ArrowLeft, BadgeCheck, ChevronDown, ChevronUp, Info, Star } from "lucide-react";
import type { DataStatus } from "@/lib/content";
import { speakLines } from "@/lib/speech";
import { useProgress } from "@/lib/progress";

type Tone = "primary" | "secondary" | "success" | "accent" | "ghost" | "white";

const TONES: Record<Tone, string> = {
  // KidZ Zone: flat buttons in the world's accent
  primary: "bg-primary text-white hover:bg-primary-dark",
  secondary: "bg-secondary text-ink hover:brightness-105",
  success: "bg-success text-white hover:brightness-110",
  accent: "bg-accent text-white hover:brightness-110",
  white: "bg-white text-ink ring-1 ring-line hover:bg-primary-soft",
  ghost: "bg-transparent text-primary hover:bg-primary-soft",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-display text-lg font-bold leading-none transition active:translate-y-[3px] active:shadow-none disabled:pointer-events-none disabled:opacity-45";

export function Button({ tone = "primary", className = "", ...rest }: ComponentProps<"button"> & { tone?: Tone }) {
  return <button type="button" className={`${base} ${TONES[tone]} ${className}`} {...rest} />;
}

export function LinkButton({ tone = "primary", className = "", ...rest }: ComponentProps<typeof Link> & { tone?: Tone }) {
  return <Link className={`${base} ${TONES[tone]} ${className}`} {...rest} />;
}

export function Card({ className = "", children, ...rest }: ComponentProps<"div">) {
  return (
    <div className={`rounded-[var(--radius-card)] bg-card p-5 shadow-[var(--shadow-card)] ${className}`} {...rest}>
      {children}
    </div>
  );
}

/** Page title with an optional inline back button (a link, or a callback for in-page steps). */
export function PageHeader({
  title,
  subtitle,
  children,
  back,
  backLabel = "Go back",
  say,
}: {
  /** what tapping the title reads; default: the title, then the subtitle */
  say?: () => void;
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
  back?: string | (() => void);
  backLabel?: string;
}) {
  // On wide screens the arrow hangs in the margin so the title lines up with the content below.
  const cls =
    "mt-1 grid size-11 shrink-0 place-items-center rounded-full bg-white text-primary ring-1 ring-line transition hover:bg-primary-soft active:translate-y-px xl:absolute xl:-left-[4.25rem] xl:top-0 xl:mt-0 xl:size-12";
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="relative flex min-w-0 items-start gap-3 xl:gap-0">
        {back &&
          (typeof back === "string" ? (
            <Link href={back} aria-label={backLabel} title={backLabel} className={`m3-web ${cls}`}>
              <ArrowLeft className="size-6" />
            </Link>
          ) : (
            <button type="button" onClick={back} aria-label={backLabel} title={backLabel} className={cls}>
              <ArrowLeft className="size-6" />
            </button>
          ))}
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="cursor-pointer text-3xl font-extrabold leading-tight text-ink sm:text-4xl" data-no-announce onClick={() => (say ? say() : speakLines([title, typeof subtitle === "string" ? subtitle : ""], { force: true }))}>{title}</h1>
          </div>
          {subtitle && <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export function Stars({ count, max = 3, size = "size-6" }: { count: number; max?: number; size?: string }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${count} of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`${size} ${i < count ? "fill-secondary text-[#e5a100]" : "fill-line text-line"}`}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

export function Chip({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${className}`}>{children}</span>
  );
}

/**
 * Tells kids and parents how trustworthy a map is. Minimal by default (a small icon chip);
 * hover, focus or tap shows the full message. Pass `full` to always show the words.
 */
export function DataStatusBadge({ status, issues = [], full = false }: { status: DataStatus; issues?: string[]; full?: boolean }) {
  const [open, setOpen] = useState(false);
  const v =
    status === "verified"
      ? { Icon: BadgeCheck, short: "Verified", label: "Verified map", detail: "District list checked against the state's current list.", cls: "bg-success-soft text-[#1d7a52]" }
      : status === "issues"
        ? { Icon: AlertTriangle, short: "Update", label: "Map data needs update", detail: issues.join(" "), cls: "bg-danger-soft text-[#a8262b]" }
        : { Icon: Info, short: "2023", label: "LGD 2023 map · review pending", detail: "Official LGD boundaries, December 2023 snapshot. Not yet reviewed against the latest district list.", cls: "bg-secondary-soft text-[#8a5b00]" };
  if (full)
    return (
      <Chip className={v.cls}>
        <v.Icon className="size-4" /> <span title={v.detail}>{v.label}</span>
      </Chip>
    );
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={`${v.label}. ${v.detail}`}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
        onBlur={() => setOpen(false)}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${v.cls}`}
      >
        <v.Icon className="size-3.5" /> {v.short}
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute bottom-full left-0 z-30 mb-2 w-60 rounded-2xl bg-ink px-3 py-2 text-sm font-semibold leading-snug text-white shadow-lg transition ${
          open ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
        }`}
      >
        <b className="block">{v.label}</b>
        <span className="font-normal text-white/85">{v.detail}</span>
      </span>
    </span>
  );
}

export function ProgressBar({ value, tone = "bg-primary", className = "" }: { value: number; tone?: string; className?: string }) {
  return (
    <div className={`h-3 overflow-hidden rounded-full bg-line ${className}`}>
      <div className={`h-full rounded-full ${tone} transition-[width] duration-500`} style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }} />
    </div>
  );
}

export function Loading({ label = "Unfolding the map…" }: { label?: string }) {
  return (
    <div className="grid min-h-[40vh] place-items-center rounded-[var(--radius-card)] bg-sea text-ink-soft">
      <div className="flex flex-col items-center gap-3">
        <div className="size-10 animate-spin rounded-full border-4 border-primary-soft border-t-primary" />
        <p className="font-display text-lg">{label}</p>
      </div>
    </div>
  );
}

/**
 * Shows the first few items with a "More" button for the rest, so pages stay short and calm.
 * `className` styles the wrapper the items sit in (e.g. a grid); `as="ul"` for lists.
 */
export function ShowMore<T>({
  items,
  initial,
  render,
  className = "",
  noun = "more",
  as: Tag = "div",
}: {
  items: T[];
  initial: number;
  render: (item: T, index: number) => ReactNode;
  className?: string;
  noun?: string;
  as?: "div" | "ul";
}) {
  const [open, setOpen] = useState(false);
  const shown = open ? items : items.slice(0, initial);
  const hidden = items.length - initial;
  return (
    <>
      <Tag className={className}>{shown.map(render)}</Tag>
      {hidden > 0 && (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={open ? "Show less" : `Show ${hidden} ${noun}`}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-display text-lg font-bold text-primary ring-1 ring-line transition hover:bg-primary-soft active:translate-y-px"
          >
            {open ? (
              <>
                Show less <ChevronUp className="size-5" />
              </>
            ) : (
              <>
                More <span className="rounded-full bg-primary-soft px-2 text-sm">+{hidden}</span> <ChevronDown className="size-5" />
              </>
            )}
          </button>
        </div>
      )}
    </>
  );
}

/**
 * No speaker buttons: this keeps the old name and props but draws nothing. It hands its speech to the element it
 * sits in (a card), so tapping the card reads it — after Maps' own announcer, so this richer text wins.
 */
export function SpeakButton({ label, onSpeak }: { label: string; onSpeak: () => void; className?: string; tone?: "primary" | "white" }) {
  const ref = useRef<HTMLSpanElement>(null);
  const speakNow = useRef(onSpeak);
  speakNow.current = onSpeak;
  useEffect(() => {
    const host = ref.current?.parentElement;
    if (!host) return;
    const onTap = () => speakNow.current();
    host.addEventListener("click", onTap);
    return () => host.removeEventListener("click", onTap);
  }, []);
  return <span ref={ref} hidden data-speak={label} />;
}

/** Tamil name under an English one — only shown when the child has chosen Tamil. */
export function TamilName({ text, className = "" }: { text?: string | null; className?: string }) {
  const lang = useProgress().voiceLang;
  if (!text || lang !== "ta") return null;
  return (
    <p lang="ta" className={className}>
      {text}
    </p>
  );
}
