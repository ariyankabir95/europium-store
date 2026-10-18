import { supabaseServer, hasSupabase } from "@/lib/supabase/server";

export default async function Reviews({ slug }) {
    if (!hasSupabase()) return null;

    try {
        const { data, error } = await (await supabaseServer())
            .from("reviews")
            .select("rating,body,created_at,products!inner(slug)")
            .eq("status", "approved")
            .eq("products.slug", slug)
            .order("created_at", { ascending: false })
            .limit(20);

        if (error) {
            // Reviews are optional storefront content; a review query failure must not
            // prevent the product itself from rendering.
            console.error("[product-reviews] Query failed:", error.message);
            return null;
        }

        if (!data?.length) {
            return <p className="mt-16 text-sm text-umber">No reviews yet.</p>;
        }

        return (
            <section className="mt-16 max-w-2xl">
                <h2 className="mb-4 font-serif text-3xl">Reviews</h2>
                <ul className="divide-y divide-sand border-y border-sand text-sm">
                    {data.map((r, i) => (
                        <li key={i} className="py-4">
                            <p aria-label={`${r.rating} out of 5`}>{"★".repeat(Math.max(0, Math.min(5, Number(r.rating) || 0)))}</p>
                            <p className="mt-1 text-umber">{r.body}</p>
                        </li>
                    ))}
                </ul>
            </section>
        );
    } catch (error) {
        // Supabase initialization/network failures should not take down the product page.
        console.error("[product-reviews] Could not load reviews:", error);
        return null;
    }
}
