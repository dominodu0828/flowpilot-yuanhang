export default function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-[12px] bg-white shadow-sheet ${className}`}>
      <img src="/brand/flowpilot-mark.svg" alt="" aria-hidden="true" className="h-full w-full object-contain" />
    </span>
  );
}
