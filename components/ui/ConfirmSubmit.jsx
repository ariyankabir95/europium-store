"use client";
/**
 * Submit button that asks for confirmation before the form is sent (delete actions).
 * Carries name/value so one form can hold several action buttons (e.g. op=approved / op=delete).
 */
export default function ConfirmSubmit({ children, message, name, value, className }) {
    return (<button type="submit" name={name} value={value} className={className} onClick={(e) => { if (!window.confirm(message))
        e.preventDefault(); }}>
      {children}
    </button>);
}
