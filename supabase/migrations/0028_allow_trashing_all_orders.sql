-- 0028_allow_trashing_all_orders.sql
-- Make every order reversible-hideable from the admin Orders list.
-- This operation does not alter order/payment status, stock reservations, or order history.

CREATE OR REPLACE FUNCTION public.admin_set_order_trashed(
  p_order UUID,
  p_trashed BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_order IS NULL OR p_trashed IS NULL THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;

  UPDATE public.orders
  SET trashed_at = CASE WHEN p_trashed THEN NOW() ELSE NULL END
  WHERE id = p_order;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_order_trashed(UUID, BOOLEAN)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_set_order_trashed(UUID, BOOLEAN)
  TO authenticated;
