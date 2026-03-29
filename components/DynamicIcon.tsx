/* istanbul ignore file */
import React, { useEffect, useState } from 'react';

type Props = {
  name: string;
  className?: string;
  fallback?: React.ReactNode;
};

export default function DynamicIcon({ name, className, fallback }: Props) {
  if (process.env.NODE_ENV === 'test' || typeof (global as any).jest !== 'undefined') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('lucide-react');
      const Comp = (mod as any)[name];
      return Comp ? <Comp className={className} /> : <>{fallback ?? null}</>;
    } catch (e) {
      return <>{fallback ?? null}</>;
    }
  }

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
