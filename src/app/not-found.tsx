import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <div className="text-6xl">❄️</div>
        <h1 className="text-4xl font-bold text-gray-800">404</h1>
        <p className="text-gray-500">This page doesn&apos;t exist.</p>
        <Link
          href="/"
          className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-2.5 text-sm font-semibold transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
