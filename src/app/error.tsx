"use client";
import { ErrorMessage } from "@/components/error-message";
export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) { return <ErrorMessage retry={retry} />; }
