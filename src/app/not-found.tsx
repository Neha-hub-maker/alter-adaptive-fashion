import Link from "next/link";
export default function NotFound() {
  return <main id="main-content" tabIndex={-1} className="canvas error-state">
    <p className="label text-muted mb-3">ALTER / 404</p><h1>This hour slipped away.</h1>
    <p className="mt-3 mb-4">The page you’re looking for isn’t here. Start again with the current edit.</p>
    <Link href="/" className="primary-button label">Back to ALTER</Link>
  </main>;
}
