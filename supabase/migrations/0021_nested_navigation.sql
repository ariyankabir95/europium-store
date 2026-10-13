-- 0021_nested_navigation.sql
-- Adds admin-managed parent/child navigation items for desktop dropdowns and mobile submenus.
-- Existing menu rows remain top-level because parent_id defaults to NULL.

alter table navigation_items
  add column if not exists parent_id uuid references navigation_items(id) on delete cascade;

create index if not exists navigation_items_parent_sort_idx
  on navigation_items(parent_id, sort);

create or replace function validate_navigation_item_parent()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_menu uuid;
  cycle_found boolean := false;
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'navigation_parent_cycle';
  end if;

  select menu_id into parent_menu
  from navigation_items
  where id = new.parent_id;

  if parent_menu is null then
    raise exception 'navigation_parent_not_found';
  end if;

  if parent_menu <> new.menu_id then
    raise exception 'navigation_parent_menu_mismatch';
  end if;

  with recursive ancestors(id, parent_id) as (
    select id, parent_id
    from navigation_items
    where id = new.parent_id
    union all
    select item.id, item.parent_id
    from navigation_items item
    join ancestors ancestor on item.id = ancestor.parent_id
    where ancestor.parent_id is not null
  )
  select exists(select 1 from ancestors where id = new.id)
    into cycle_found;

  if cycle_found then
    raise exception 'navigation_parent_cycle';
  end if;

  return new;
end;
$$;

drop trigger if exists navigation_items_validate_parent on navigation_items;
create trigger navigation_items_validate_parent
before insert or update of parent_id, menu_id
on navigation_items
for each row
execute function validate_navigation_item_parent();
