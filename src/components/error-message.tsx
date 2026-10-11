"use client";
import { useEffect, useRef } from "react";
export function ErrorMessage({ retry }: { retry: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return <main id="main-content" tabIndex={-1} className="canvas error-state">
    <p className="label text-muted mb-3">ALTER / A pause in the day</p><h1 ref={heading} tabIndex={-1}>Let’s try that again.</h1>
    <p className="mt-3 mb-4">This edit couldn’t load. Give it another moment and retry.</p>
    <button type="button" className="primary-button label" onClick={retry}>Try again</button>
  </main>;
}
