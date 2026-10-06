"use client";
/** Submit button that asks for confirmation first (used for destructive admin actions). */
export default function ConfirmButton({ children, message, className }) {
    return <button className={className} onClick={(e) => { if (!window.confirm(message))
        e.preventDefault(); }}>{children}</button>;
}
