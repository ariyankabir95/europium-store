"use client";
/** Submit button that asks for confirmation first (used for destructive admin actions). */
export default function ConfirmButton({ children, message, className, formAction, type = "submit", name, value }) {
    return <button type={type} formAction={formAction} name={name} value={value} className={className} onClick={(e) => { if (!window.confirm(message))
        e.preventDefault(); }}>{children}</button>;
}
