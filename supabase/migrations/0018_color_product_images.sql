-- Color-specific product images
-- NULL color_name = shared/product-wide image

alter table product_images
  add column if not exists color_name text;

create index if not exists product_images_product_color_sort_idx
  on product_images(product_id, color_name, sort);

comment on column product_images.color_name is
  'Optional variant color name. NULL means the image is shared across all colors.';
