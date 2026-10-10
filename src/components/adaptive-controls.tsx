"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { demoPresets, type DemoPreset } from "@/lib/adaptation";
import { exitDemo, resetProfile, setPersonalization, startDemo, useProfile } from "@/lib/profile";
import { openDialog, trapDialogFocus } from "@/lib/dialog";

const DemoPanelContent = dynamic(() => import("./demo-panel-content"), { ssr: false, loading: () => <p className="py-3" role="status">Loading demo presets…</p> });

export function DemoBar() {
  const { demo, ready } = useProfile();
  return <aside className="demo-bar" aria-label="Adaptation demo" data-ready={ready}>
    <p className="label">Demo mode{demo ? ` / ${demoPresets[demo].label}` : ""}</p><button type="button" className="choice" onClick={() => { exitDemo(); document.getElementById("adaptation-demo-trigger")?.focus(); }}>Demo mode: Exit</button>
  </aside>;
}
export function AdaptiveControls() {
  const { enabled } = useProfile();
  const [confirmation, setConfirmation] = useState("");
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open && dialog.current) return openDialog(dialog.current, trigger.current); }, [open]);
  const choose = (preset: DemoPreset) => { startDemo(preset); setConfirmation(""); setOpen(false); requestAnimationFrame(() => document.getElementById("main-content")?.focus()); };
  return <div className="adaptive-controls">
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="choice" aria-pressed={enabled} onClick={() => { setPersonalization(!enabled); setConfirmation(""); }}><span>Personalization: </span><span className="personalization-on">On</span><span className="personalization-off">Off</span></button>
      <button type="button" className="choice" onClick={() => { const scope = resetProfile(); setConfirmation(scope === "demo" ? "Demo data cleared. Your saved profile is unchanged." : scope === "memory" ? "Viewed pieces and visit count cleared for this page. Device storage is unavailable." : "Your viewed pieces and visit count have been cleared from this device."); }}>Clear my data</button>
      <button id="adaptation-demo-trigger" ref={trigger} type="button" className="choice" aria-haspopup="dialog" onClick={() => setOpen(true)}>See how ALTER adapts</button>
    </div>
    <p className="text-small text-muted mt-2">Viewed pieces and visit count stay only on this device. Turn personalization off to stop recording, or use Clear my data to remove them.</p>
    <p className="adaptive-confirmation text-small" role="status" aria-live="polite" aria-atomic="true">{confirmation}</p>
    <dialog ref={dialog} className="adaptive-dialog" aria-labelledby="adaptive-demo-title" onCancel={(event) => { event.preventDefault(); setOpen(false); }} onKeyDown={trapDialogFocus}>
      <div className="flex items-center justify-between gap-2 mb-3"><h2 id="adaptive-demo-title" className="text-h3">See how ALTER adapts</h2><button type="button" className="choice" onClick={() => setOpen(false)}>Close demo panel</button></div>
      {open && <DemoPanelContent onChoose={choose} />}
    </dialog>
  </div>;
}
