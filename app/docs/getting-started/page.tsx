import Link from 'next/link';
import FrameworkTabs from './FrameworkTabs';

export default function GettingStartedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="flex min-h-screen w-full max-w-3xl flex-col gap-10 py-16 px-8 bg-white dark:bg-zinc-900 sm:px-16">

        {/* Back link */}
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
        >
          ← Back
        </Link>

        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Getting Started
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Add the chat widget to your website in 3 steps
          </p>
        </div>

        {/* Prerequisites */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Prerequisites</h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            Before you begin, you'll need the following from your dashboard:
          </p>
          <ul className="flex flex-col gap-2 pl-5 list-disc text-zinc-600 dark:text-zinc-400">
            <li>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">Client ID</span>
              {' '}— from your organization's API keys
            </li>
            <li>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">Assistant ID</span>
              {' '}— the ID of the assistant you want to embed
            </li>
            <li>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">Config ID</span>
              {' '}— the widget configuration ID from the Customize page
            </li>
          </ul>
        </section>

        {/* Step 1 */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
              1
            </span>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Get your credentials</h2>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 pl-10">
            In the dashboard, go to <strong className="text-zinc-900 dark:text-zinc-100">Customize</strong>,
            select your widget config, and copy the Config ID. Find your Client ID and Assistant ID
            under <strong className="text-zinc-900 dark:text-zinc-100">Data Sources → Assistants</strong>.
          </p>
        </section>

        {/* Step 2 */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
              2
            </span>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Add the snippet</h2>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 pl-10">
            Choose your framework and paste the snippet into your app, replacing <code className="font-mono text-sm bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">YOUR_CONFIG_ID</code> with your actual Config ID.
          </p>
          <FrameworkTabs />
        </section>

        {/* Step 3 */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
              3
            </span>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Done</h2>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 pl-10">
            The widget will appear on your page. It respects the position, colors, and behavior you configured in the dashboard.
          </p>
        </section>


      </main>
    </div>
  );
}
