import { createServerClient, } from "@supabase/ssr";
import { NextResponse } from "next/server";
export async function middleware(req) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const toLogin = () => {
        const u = new URL("/login", req.url);
        u.searchParams.set("next", req.nextUrl.pathname);
        return NextResponse.redirect(u);
    };
    if (!url || !key)
        return toLogin();
    let res = NextResponse.next({ request: req });
    const sb = createServerClient(url, key, {
        cookies: {
            getAll: () => req.cookies.getAll(),
            setAll: (cookiesToSet) => {
                cookiesToSet.forEach(({ name, value }) => {
                    req.cookies.set(name, value);
                });
                res = NextResponse.next({ request: req });
                cookiesToSet.forEach(({ name, value, options }) => {
                    res.cookies.set(name, value, options);
                });
            },
        },
    });
    const { data: { user }, } = await sb.auth.getUser();
    return user ? res : toLogin();
}
// Role check for /admin happens again in app/admin/layout.jsx.
// Never rely on middleware alone.
export const config = {
    matcher: ["/account/:path*", "/admin/:path*"],
};
