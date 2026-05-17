"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="text-6xl">❄️</div>
        <h2 className="text-xl font-bold text-gray-800">Something went wrong</h2>
        <p className="text-sm text-gray-500">
          An unexpected error occurred. Your data is safe.
        </p>
        <button
          onClick={reset}
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-2.5 text-sm font-semibold transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
