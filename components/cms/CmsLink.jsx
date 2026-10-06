import Link from "next/link";
import { isExternal } from "@/lib/cms-schema";
/** Internal URLs use next/link; external / mailto / tel use a plain anchor (new tab only when asked). */
export default function CmsLink({ href, className, newTab = false, children }) {
    if (isExternal(href) || newTab) {
        return <a href={href} className={className} {...(newTab || /^https?:/i.test(href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{children}</a>;
    }
    return <Link href={href} className={className}>{children}</Link>;
}
