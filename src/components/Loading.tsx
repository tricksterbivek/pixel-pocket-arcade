/** Visible fallback while a lazy game route loads. */
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[40vh] items-center justify-center font-display text-muted"
    >
      Loading game...
    </div>
  );
}
