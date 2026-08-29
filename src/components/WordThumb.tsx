import { resolveImageSrc } from "@/lib/image-library";

/** Compact vocab thumbnail — fits card rows without growing their height. */
export function WordThumb({
  src,
  size = "md",
  className = "",
}: {
  src?: string | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const resolved = resolveImageSrc(src ?? undefined);
  if (!resolved) return null;
  const box = size === "sm" ? "size-9" : "size-11";
  return (
    <img
      src={resolved}
      alt=""
      decoding="async"
      className={`${box} shrink-0 rounded-lg object-contain bg-white/90 ring-1 ring-black/8 ${className}`}
    />
  );
}
