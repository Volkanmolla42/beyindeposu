
interface AutomotiveStripeProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function AutomotiveStripe({
  className = "",
  size = "md",
}: AutomotiveStripeProps) {
  const solidHeight =
    size === "sm" ? "h-1.5" : size === "lg" ? "h-2.5 sm:h-3" : "h-2 sm:h-2.5";
  const hazardHeight =
    size === "sm" ? "h-1" : size === "lg" ? "h-1.5 sm:h-2" : "h-1.5";
  const stripeWidth = size === "sm" ? 4 : size === "lg" ? 7 : 5;

  return (
    <div
      className={`w-full overflow-hidden select-none pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <div className={`w-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.35)] ${solidHeight}`} />
      <div
        className={`w-full ${hazardHeight}`}
        style={{
          background: `repeating-linear-gradient(
            -45deg,
            #fbbf24,
            #fbbf24 ${stripeWidth}px,
            #0B0D10 ${stripeWidth}px,
            #0B0D10 ${stripeWidth * 2}px
          )`,
        }}
      />
    </div>
  );
}
