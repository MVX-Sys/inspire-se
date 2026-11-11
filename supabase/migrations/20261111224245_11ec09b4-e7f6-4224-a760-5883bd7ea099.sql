REVOKE EXECUTE ON FUNCTION public.set_pedido_status(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.delete_pedido(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.set_produtos_ordem(uuid[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.decrement_stock(uuid, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.log_estoque_change() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.set_pedido_status(uuid, text), public.delete_pedido(uuid), public.set_produtos_ordem(uuid[]), public.admin_list_users(), public.decrement_stock(uuid, integer) TO authenticated;