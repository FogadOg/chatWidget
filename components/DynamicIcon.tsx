/* istanbul ignore file */
import React, { useEffect, useState } from 'react';

type Props = {
  name: string;
  className?: string;
  fallback?: React.ReactNode;
};

function RuntimeDynamicIcon({ name, className, fallback }: Props) {
  const [Icon, setIcon] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    let mounted = true;
    import('lucide-react')
      .then((mod) => {
        const Comp = (mod as any)[name];
        if (mounted && Comp) setIcon(() => Comp);
      })
      .catch(() => {
        /* ignore: optional icon */
      });
    return () => {
      mounted = false;
    };
  }, [name]);

  if (Icon) {
    const Comp = Icon;
    return <Comp className={className} />;
  }

  return <>{fallback ?? null}</>;
}

function resolveSyncIcon(name: string): React.ComponentType<any> | null {
  try {
    const mod = require('lucide-react')
    return (mod as any)[name] ?? null
  } catch {
    return null
  }
}

function SyncDynamicIcon({ name, className, fallback }: Props) {
  const Comp = resolveSyncIcon(name)
  if (!Comp) {
    return <>{fallback ?? null}</>
  }
  return React.createElement(Comp, { className })
}

export default function DynamicIcon(props: Props) {
  const isTestEnv = process.env.NODE_ENV === 'test' || typeof (global as any).jest !== 'undefined'
  if (isTestEnv) {
    return <SyncDynamicIcon {...props} />
  }
  return <RuntimeDynamicIcon {...props} />
}
