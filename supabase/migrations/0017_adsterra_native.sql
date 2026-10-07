-- Allow Adsterra Native Banner CMS section
alter table page_sections
drop constraint if exists page_sections_type_check;

alter table page_sections
add constraint page_sections_type_check
check (
  type in (
    'hero',
    'text',
    'image_text',
    'image',
    'product_grid',
    'featured_products',
    'category_grid',
    'collection_grid',
    'promo_banner',
    'rich_text',
    'cta',
    'newsletter',
    'spacer',
    'adsterra_native'
  )
);
