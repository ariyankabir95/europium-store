-- 0022_category_hierarchy.sql
-- Adds parent/child categories for admin-managed subcategories.
-- Existing categories stay top-level (parent_id NULL), so current storefront URLs remain valid.

alter table categories
  add column if not exists parent_id uuid references categories(id) on delete set null;

create index if not exists categories_parent_sort_idx
  on categories(parent_id, sort, name);

create or replace function validate_category_parent()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  cycle_found boolean := false;
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'category_parent_cycle';
  end if;

  if not exists (select 1 from categories where id = new.parent_id) then
    raise exception 'category_parent_not_found';
  end if;

  with recursive ancestors(id, parent_id) as (
    select id, parent_id
    from categories
    where id = new.parent_id
    union all
    select category.id, category.parent_id
    from categories category
    join ancestors ancestor on category.id = ancestor.parent_id
    where ancestor.parent_id is not null
  )
  select exists(select 1 from ancestors where id = new.id)
    into cycle_found;

  if cycle_found then
    raise exception 'category_parent_cycle';
  end if;

  return new;
end;
$$;

drop trigger if exists categories_validate_parent on categories;
create trigger categories_validate_parent
before insert or update of parent_id
on categories
for each row
execute function validate_category_parent();
