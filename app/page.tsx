import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-8 py-16 px-8 bg-white dark:bg-zinc-900 sm:px-16">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="rounded-full bg-zinc-900 dark:bg-zinc-100 p-4">
            <svg className="w-12 h-12 text-white dark:text-zinc-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Companin Customer Support AI Assistant Widget
          </h1>
          <p className="max-w-md text-lg leading-7 text-zinc-600 dark:text-zinc-400">
            Customer Support AI Assistant widget for your website. Embed intelligent conversations anywhere with just a few lines of code.
          </p>
        </div>
        <div className="flex flex-col gap-4 w-full max-w-md">
          <Link
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-6 text-white font-medium transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            href="/docs/getting-started"
          >
            Get Started
          </Link>
          <Link
            className="flex h-12 items-center justify-center rounded-lg border border-solid border-zinc-300 px-6 font-medium text-zinc-900 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            href="/preview"
          >
            View Demo
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3 max-w-2xl">
          <div className="flex flex-col gap-2 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Easy Integration</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Add to any website with a simple script tag</p>
          </div>
          <div className="flex flex-col gap-2 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Customizable</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Match your brand with full styling control</p>
          </div>
          <div className="flex flex-col gap-2 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Multi-language</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Support for 9 languages out of the box</p>
          </div>
        </div>
      </main>
    </div>
  );
}
