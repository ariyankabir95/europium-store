import "server-only";
import { uploadEntityImage } from "@/lib/storage";

export const MAX_GALLERY_UPLOAD = 12;

/**
 * Image rows for one product in display order.
 * color_name = null means shared image.
 */
export async function orderedImages(sb, productId) {
  const { data } = await sb
    .from("product_images")
    .select("id,url,alt,sort,color_name")
    .eq("product_id", productId)
    .order("sort", { ascending: true })
    .order("id", { ascending: true });

  return data ?? [];
}

/** Writes sort = 0..n-1 following the given id order. */
export async function writeOrder(sb, productId, ids) {
  for (let i = 0; i < ids.length; i++) {
    const { error } = await sb
      .from("product_images")
      .update({ sort: i })
      .eq("id", ids[i])
      .eq("product_id", productId);

    if (error) {
      console.error("[product-images] reorder failed", error.message);
      return false;
    }
  }

  return true;
}

/**
 * Uploads selected files and attaches them to an optional color.
 *
 * colorName = null → shared image
 * colorName = "Black" → Black color images
 */
export async function addProductImages(
  sb,
  productId,
  files,
  alt,
  colorName = null
) {
  const picked = files
    .filter((f) => f instanceof File && f.size > 0)
    .slice(0, MAX_GALLERY_UPLOAD);

  const errors = [];

  if (!picked.length) {
    return { added: 0, errors };
  }

  const { data: last } = await sb
    .from("product_images")
    .select("sort")
    .eq("product_id", productId)
    .order("sort", { ascending: false })
    .limit(1);

  let next = (last?.[0]?.sort ?? -1) + 1;
  let added = 0;

  for (const f of picked) {
    const up = await uploadEntityImage(sb, "products", productId, f);

    if (up.status !== "ok") {
      errors.push(
        `${f.name}: ${
          up.status === "error" ? up.error : "no file"
        }`
      );
      continue;
    }

    const { error } = await sb
      .from("product_images")
      .insert({
        product_id: productId,
        url: up.url,
        alt: alt || null,
        sort: next,
        color_name: colorName || null,
      });

    if (error) {
      console.error("[product-images] insert failed", error.message);

      await sb.storage
        .from("products")
        .remove([up.path]);

      errors.push(
        `${f.name}: the image was uploaded but could not be saved.`
      );

      continue;
    }

    next++;
    added++;
  }

  return { added, errors };
}
