import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

export const alt = "ALTER — Dress for the hour you're in. A fictional adaptive fashion portfolio.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function SocialImage() {
  const [photo, display, mono] = await Promise.all([
    readFile(join(process.cwd(), "public/images/raw/editorial-bw-suit.jpg")),
    readFile(join(process.cwd(), "src/fonts/InstrumentSerif-Regular.ttf")),
    readFile(join(process.cwd(), "src/fonts/DMMono-Regular.ttf")),
  ]);
  const lettering = new ImageResponse(<div style={{ display: "flex", width: "100%", height: "100%", background: "#0E0E10", color: "#F4F1EA" }}>
    <div style={{ display: "flex", width: 640, flexShrink: 0, flexDirection: "column", justifyContent: "center", padding: 64 }}>
      <div style={{ fontFamily: "Instrument Serif", fontSize: 142, letterSpacing: -5 }}>ALTER</div>
      <div style={{ fontFamily: "Instrument Serif", fontSize: 46, marginTop: 24 }}>Dress for the hour you&apos;re in.</div>
      <div style={{ fontFamily: "DM Mono", fontSize: 16, marginTop: 48, letterSpacing: 1 }}>FICTIONAL BRAND / UX PORTFOLIO</div>
    </div>

  </div>, { ...size, fonts: [{ name: "Instrument Serif", data: new Uint8Array(display).buffer, weight: 400, style: "normal" }, { name: "DM Mono", data: new Uint8Array(mono).buffer, weight: 400, style: "normal" }] });
  // Composite the stock photo explicitly: keep raster decoding separate from
  // typography so both layers remain reliable in the production OG renderer.
  const cropped = await sharp(photo).resize(560, 630, { fit: "cover" }).png().toBuffer();
  const preview = await sharp(Buffer.from(await lettering.arrayBuffer())).composite([{ input: cropped, left: 640, top: 0 }]).png().toBuffer();
  return new Response(new Uint8Array(preview), { headers: { "Content-Type": contentType } });
}
