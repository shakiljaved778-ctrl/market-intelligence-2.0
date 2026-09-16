"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // In production this would go to the error reporter; keep it quiet for users.
    console.error(error);
  }, [error]);

  return (
    <div className="py-24 text-center">
      <p className="eyebrow">error</p>
      <h1 className="font-editorial text-text-hi mt-2 text-[34px]">
        A figure didn&rsquo;t settle.
      </h1>
      <p className="text-text-mid mx-auto mt-3 max-w-[46ch] text-[15px]">
        Something went wrong rendering this page. The data is safe; this is a display
        issue.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="pill border-line text-text-hi hover:bg-surface border px-4 py-2 text-[13px]"
        >
          Try again
        </button>
        <Link
          href="/"
          className="pill border-line text-text-hi hover:bg-surface border px-4 py-2 text-[13px]"
        >
          The Board
        </Link>
      </div>
    </div>
  );
}
