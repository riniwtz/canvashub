export function WorkColorDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="size-2 shrink-0 rounded-full ring-1 ring-foreground/10"
      style={{ backgroundColor: color }}
    />
  );
}
