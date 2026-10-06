"use client";
export default function Error({ reset }) {
    return <div role="alert" className="container-site py-40"><h1 className="font-serif text-4xl">Something went wrong</h1><p className="mt-3 text-umber">Please try again. If it keeps happening, contact us.</p><button onClick={reset} className="btn-dark mt-6">Try again</button></div>;
}
