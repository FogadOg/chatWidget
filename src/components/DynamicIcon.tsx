import React, { useEffect, useState } from 'react';

type Props = {
  name: string;
  className?: string;
  fallback?: React.ReactNode;
  // `forceAsync` is intended for tests only: when true it bypasses the
  // test-environment synchronous `require` path and forces the runtime
  // dynamic-import branch so tests can exercise that behavior without
  // mutating `process.env` or global test markers.
  forceAsync?: boolean;
  // `importer` is for tests only: it allows injecting a custom dynamic import
  // implementation so tests can deterministically control module loading
  // without relying on jest module system or changing the runtime env.
  importer?: () => Promise<Record<string, any>>;
};

function RuntimeDynamicIcon({ name, className, fallback, importer }: Props) {
  const [Icon, setIcon] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    if (!name) return
    const { promise, cancel } = loadAndSetIcon(name, importer, (comp) => setIcon(comp))
    return () => cancel()
  }, [name, importer]);

  if (Icon) {
    const Comp = Icon;
    return <Comp className={className} />;
  }

  return <>{fallback ?? null}</>;
}

function SyncDynamicIcon({ name, className, fallback }: Pick<Props, 'name' | 'className' | 'fallback'>) {
  const Comp = resolveSyncIcon(name)
  if (!Comp) {
    return <>{fallback ?? null}</>
  }
  return React.createElement(Comp, { className })
}

export default function DynamicIcon(props: Props) {
  const { forceAsync = false } = props
  const isTestEnv = process.env.NODE_ENV === 'test' || typeof (global as any).jest !== 'undefined'

  if (!forceAsync && isTestEnv) {
    return <SyncDynamicIcon {...props} />
  }

  return <RuntimeDynamicIcon {...props} />
}

// Export a helper for loading icons so tests can exercise the dynamic-import
// path without rendering the component (which can trigger hook/environment
// issues in some Jest setups). Returns the component constructor or null.
export function loadIcon(name: string, importer?: () => Promise<Record<string, any>>): Promise<React.ComponentType<any> | null> {
  const loader = importer ? importer() : import('lucide-react')
  return loader
    .then((mod) => {
      const Comp = (mod as any)[name]
      return Comp ?? null
    })
    .catch(() => null)
}

export function resolveSyncIcon(name: string): React.ComponentType<any> | null {
  try {
    const mod = require('lucide-react')
    const Comp = (mod as any)[name]
    return Comp ?? null
  } catch {
    return null
  }
}

// Testable helper: performs the same dynamic-load logic as the effect but
// exposes a `cancel` to stop updates. Returns the loader promise and a
// cancel function. This lets tests exercise the branch without mounting the
// component (avoiding renderer/React instance mismatches in some Jest setups).
export function loadAndSetIcon(
  name: string,
  importer: (() => Promise<Record<string, any>>) | undefined,
  onSet: (comp: React.ComponentType<any> | null) => void,
) {
  let mounted = true
  const loader = importer ? importer() : import('lucide-react')
  const promise = loader
    .then((mod) => {
      const Comp = (mod as any)[name]
      if (mounted && Comp) onSet(() => Comp)
    })
    .catch(() => {
      /* ignore */
    })

  return {
    promise,
    cancel: () => {
      mounted = false
    },
  }
}
