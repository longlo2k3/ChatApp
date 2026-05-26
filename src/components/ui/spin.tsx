interface SpinProps {
  size?: number;
  color?: string;
  title?: string;
}

function Spin({ size = 24, title }: SpinProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div
        className="rounded-full animate-spin border-[hsl(var(--primary)/0.2)] border-t-[hsl(var(--primary))]"
        style={{
          width: size,
          height: size,
          borderWidth: "4px",
        }}
      />

      {title && (
        <span className="text-sm text-[hsl(var(--primary))] font-medium">
          {title}
        </span>
      )}
    </div>
  );
}

export default Spin;
