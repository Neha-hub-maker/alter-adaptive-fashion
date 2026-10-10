import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";
export default async function Icon() {
  const font = await readFile(join(process.cwd(), "src/fonts/InstrumentSerif-Regular.ttf"));
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Instrument Serif", fontSize: 58, background: "#F4F1EA", color: "#0E0E10" }}>A</div>, { ...size, fonts: [{ name: "Instrument Serif", data: new Uint8Array(font).buffer, weight: 400, style: "normal" }] });
}
