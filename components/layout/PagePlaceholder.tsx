/**
 * Meaningful placeholder in the interface's own voice (§12 quality floor) —
 * not "Coming soon!". Names the phase that fills the surface in.
 */
export function PagePlaceholder({
  title,
  phase,
  children,
}: {
  title: string;
  phase: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-12">
      <p className="text-text-low text-[12px]">{phase}</p>
      <h1 className="font-editorial text-text-hi mt-2 text-[34px] leading-tight">
        {title}
      </h1>
      <div className="text-text-mid mt-4 max-w-[68ch] text-[15px] leading-relaxed">
        {children}
      </div>
    </div>
  );
}
