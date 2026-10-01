-- Unpublished homepage blocks must be readable so the storefront can honour the flag instead of falling back to defaults.
drop policy if exists "public read" on homepage_sections;
create policy "public read" on homepage_sections for select using (true);
