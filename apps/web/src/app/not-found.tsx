import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-light-grey dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold text-navy/20 dark:text-gray-700 mb-4">404</p>
        <h1 className="text-2xl font-bold text-navy dark:text-white mb-2">Page not found</h1>
        <p className="text-navy/60 dark:text-gray-400 mb-6">
          The page you are looking for does not exist or is no longer available.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-5 py-2.5 bg-sky text-white rounded-lg hover:bg-sky/90 transition"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
