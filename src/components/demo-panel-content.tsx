"use client";
import { demoPresets, type DemoPreset } from "@/lib/adaptation";
export default function DemoPanelContent({ onChoose }: { onChoose: (preset: DemoPreset) => void }) {
  return <>
      <p className="text-small">Your theme and hour shape the current edit. Viewed pieces gently influence which categories lead; the data stays only on your device. These presets are temporary previews and never overwrite your saved profile.</p>
      <ul className="mt-3 flex flex-col gap-2">{(Object.keys(demoPresets) as DemoPreset[]).map((preset) => <li key={preset}><button type="button" className="choice w-full" onClick={() => onChoose(preset)}>{demoPresets[preset].label}</button></li>)}</ul>
  </>;
}
