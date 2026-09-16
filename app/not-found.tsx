import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="font-editorial text-text-hi mt-2 text-[34px]">
        Nothing priced here.
      </h1>
      <p className="text-text-mid mx-auto mt-3 max-w-[46ch] text-[15px]">
        That page doesn&rsquo;t exist, or the story has aged out of our 90-day window.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          href="/"
          className="pill border-line text-text-hi hover:bg-surface border px-4 py-2 text-[13px]"
        >
          The Board
        </Link>
        <Link
          href="/news"
          className="pill border-line text-text-hi hover:bg-surface border px-4 py-2 text-[13px]"
        >
          The wire
        </Link>
      </div>
    </div>
  );
}
