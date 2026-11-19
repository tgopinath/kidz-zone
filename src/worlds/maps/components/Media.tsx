"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { flagUrl, mediaFor } from "@/lib/explorer";
import { flagOf, getCountry } from "@/lib/world";

/** A Wikipedia/Commons photo with a loading shimmer, an error state and a credit line. */
export function Photo({ id, alt, className = "", ratio = "aspect-[4/3]", credit = true }: { id: string; alt: string; className?: string; ratio?: string; credit?: boolean }) {
  const m = mediaFor(id);
  const [state, setState] = useState<"loading" | "ok" | "error">(m?.image ? "loading" : "error");
  return (
    <figure className={className}>
      <div className={`relative overflow-hidden rounded-2xl bg-line ${ratio}`}>
        {m?.image && state !== "error" && (
          // eslint-disable-next-line @next/next/no-img-element -- remote Commons images, credited below
          <img
            src={m.image}
            alt={alt}
            loading="lazy"
            onLoad={() => setState("ok")}
            onError={() => setState("error")}
            className={`size-full object-cover transition-opacity duration-500 ${state === "ok" ? "opacity-100" : "opacity-0"}`}
          />
        )}
        {state === "loading" && <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-line via-white to-line" />}
        {state === "error" && (
          <div className="absolute inset-0 grid place-items-center text-ink-soft">
            <span className="flex flex-col items-center gap-1 text-sm font-semibold">
              <ImageOff className="size-7" /> Photo not available
            </span>
          </div>
        )}
      </div>
      {credit && m?.credit && state !== "error" && (
        <figcaption className="mt-1 truncate text-[11px] text-ink-soft">
          Photo:{" "}
          <a href={m.credit.page} target="_blank" rel="noreferrer" className="underline">
            {m.credit.artist}
          </a>{" "}
          · {m.credit.license} · Wikimedia Commons
        </figcaption>
      )}
    </figure>
  );
}

/** Country flag image (flagcdn), falling back to the emoji flag. */
export function Flag({ id, size = 40, className = "" }: { id: string; size?: number; className?: string }) {
  const c = getCountry(id);
  const src = flagUrl(c?.iso2 ?? null, size > 80 ? 320 : 160);
  const [failed, setFailed] = useState(false);
  if (!c) return null;
  if (!src || failed)
    return (
      <span className={className} style={{ fontSize: size * 0.8, lineHeight: 1 }} aria-hidden>
        {flagOf(c)}
      </span>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny remote flag images
    <img
      src={src}
      alt={`Flag of ${c.name}`}
      width={size}
      height={Math.round(size * 0.66)}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`inline-block rounded-md object-cover shadow-sm ring-1 ring-black/10 ${className}`}
      style={{ width: size, height: Math.round(size * 0.66) }}
    />
  );
}
