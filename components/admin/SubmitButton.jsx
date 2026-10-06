"use client";
import { useFormStatus } from "react-dom";
/** Submit button that disables itself and shows progress while the server action (e.g. an upload) is running. */
export default function SubmitButton({ children, pending = "Saving…", className = "btn-dark" }) {
    const { pending: busy } = useFormStatus();
    return <button type="submit" disabled={busy} aria-busy={busy} className={`${className} disabled:opacity-60`}>{busy ? pending : children}</button>;
}
