"use client";

import React, { useEffect, useMemo, useState } from "react";
const ReactMarkdown: any = typeof require !== 'undefined' ? require("react-markdown") : (null as any);
const remarkGfm: any = typeof require !== 'undefined' ? require("remark-gfm") : (null as any);

type Props = {
  content: string;
};

export default function Markdown({ content }: Props) {
  const [rehypePlugins, setRehypePlugins] = useState<any[]>([]);

  const hasMath = useMemo(() => /(^|\s)\${1,2}[^\n]+\${1,2}($|\s)/.test(content), [content]);

  useEffect(() => {
    let mounted = true;

    // Dynamically load KaTeX/rehype-katex only when math is present.
    if (hasMath) {
      // Use an indirect dynamic import to avoid build-time static resolution
      // (webpack may try to resolve literal imports during build).
      const pkgName = "rehype-katex";
      try {
        const dynamicImport = new Function("pkg", "return import(pkg)");

        dynamicImport(pkgName)
          .then((mod: any) => {
            if (!mounted) return;
            setRehypePlugins((p) => [...p, mod.default || mod]);
          })
          .catch(() => {
            /* ignore missing plugin at runtime */
          });
      } catch (err) {
        // If dynamic import creation fails, ignore and proceed without math rendering.
      }
    }

    return () => {
      mounted = false;
    };
  }, [hasMath]);

  return (
    <div className="prose max-w-full">
      {(() => {
        const R = ReactMarkdown as any;
        return (
          <R remarkPlugins={[remarkGfm]} rehypePlugins={rehypePlugins}>
            {content}
          </R>
        );
      })()}
    </div>
  );
}
