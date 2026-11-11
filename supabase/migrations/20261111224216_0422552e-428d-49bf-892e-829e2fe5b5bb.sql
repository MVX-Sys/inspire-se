CREATE TYPE public.app_role AS ENUM ('admin','funcionario','user');
CREATE TYPE public.hero_type AS ENUM ('gradient','image','video');

-- ROLES / PERMISSIONS
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role public.app_role NOT NULL, created_at timestamptz DEFAULT now(), UNIQUE(user_id, role));
CREATE TABLE public.user_permissions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, permission text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id, permission));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles, public.user_permissions TO authenticated;
GRANT ALL ON public.user_roles, public.user_permissions TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','funcionario')) $$;
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT public.has_role(_user_id,'admin') OR (public.is_staff(_user_id) AND EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = _user_id AND permission = _permission)) $$;

CREATE POLICY "own or admin read roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "admin manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_permission(auth.uid(),'usuarios.manage')) WITH CHECK (public.has_permission(auth.uid(),'usuarios.manage'));
CREATE POLICY "own or admin read perms" ON public.user_permissions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "admin manage perms" ON public.user_permissions FOR ALL TO authenticated USING (public.has_permission(auth.uid(),'usuarios.manage')) WITH CHECK (public.has_permission(auth.uid(),'usuarios.manage'));

CREATE OR REPLACE FUNCTION public.admin_list_users() RETURNS TABLE(id uuid, email text, phone text, created_at timestamptz, last_sign_in_at timestamptz, email_confirmed_at timestamptz) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_permission(auth.uid(),'usuarios.manage') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY SELECT u.id, u.email::text, u.phone::text, u.created_at, u.last_sign_in_at, u.email_confirmed_at FROM auth.users u;
END $$;

CREATE OR REPLACE FUNCTION public.slug_upper(_txt text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT upper(regexp_replace(coalesce(_txt,''), '[^a-zA-Z0-9]+', '', 'g')) $$;

-- CATALOG
CREATE TABLE public.categorias (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL, slug text NOT NULL UNIQUE, ordem integer NOT NULL DEFAULT 0, hash_id text, criado_em timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.produtos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL, descricao text, preco numeric NOT NULL, categoria_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL, codigo_base text NOT NULL, marca text, novidade boolean NOT NULL DEFAULT false, promocao boolean NOT NULL DEFAULT false, preco_promocional numeric, promocao_ate timestamptz, ativo boolean NOT NULL DEFAULT true, ordem integer NOT NULL DEFAULT 0, personalizacao_tipo text, personalizacoes jsonb NOT NULL DEFAULT '[]'::jsonb, gestaoclick_id text, hash_id text, criado_em timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.variacoes_produto (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE, nome_cor text NOT NULL, hex_cor text NOT NULL DEFAULT '#000000', tamanho text NOT NULL, quantidade_estoque integer NOT NULL DEFAULT 0, criado_em timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.imagens_produto (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE, storage_path text NOT NULL, principal boolean NOT NULL DEFAULT false, ordem integer NOT NULL DEFAULT 0, criado_em timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.personalizacao_presets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL, opcoes jsonb NOT NULL DEFAULT '[]'::jsonb, criado_em timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.hero_slides (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), titulo text NOT NULL, subtitulo text, tipo public.hero_type NOT NULL DEFAULT 'gradient', media_url text, ordem integer NOT NULL DEFAULT 0, ativo boolean NOT NULL DEFAULT true, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE public.site_config (id text PRIMARY KEY DEFAULT 'current', hero_title text, hero_subtitle text, hero_type text NOT NULL DEFAULT 'gradient', hero_media_url text, destaques_novidades text[] NOT NULL DEFAULT '{}', destaques_ofertas text[] NOT NULL DEFAULT '{}', manutencao_ativa boolean NOT NULL DEFAULT false, manutencao_inicio timestamptz, manutencao_fim timestamptz, manutencao_mensagem text, restock_modo text NOT NULL DEFAULT 'rodizio', restock_rodizio_idx integer NOT NULL DEFAULT 0, restock_whatsapp text, restock_whatsapp_list text[] DEFAULT '{}', updated_at timestamptz DEFAULT now());
INSERT INTO public.site_config (id) VALUES ('current');
CREATE TABLE public.atendentes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL, whatsapp text NOT NULL, cargo text, horario text, foto_path text, ativo boolean DEFAULT true, criado_em timestamptz DEFAULT now());
CREATE TABLE public.pix_chaves (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tipo text NOT NULL, chave text NOT NULL, nome_recebedor text NOT NULL, cidade text, banco text, ativo boolean NOT NULL DEFAULT true, principal boolean NOT NULL DEFAULT false, criado_em timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.cupons (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), codigo text NOT NULL UNIQUE, tipo_desconto text NOT NULL DEFAULT 'percentual', valor_desconto numeric NOT NULL, ativo boolean NOT NULL DEFAULT true, validade timestamptz, preco_minimo_pedido numeric, quantidade_minima_itens integer NOT NULL DEFAULT 0, produtos_ids uuid[], categorias_ids uuid[], created_at timestamptz DEFAULT now());

GRANT SELECT ON public.categorias, public.produtos, public.variacoes_produto, public.imagens_produto, public.personalizacao_presets, public.hero_slides, public.site_config, public.atendentes, public.pix_chaves, public.cupons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias, public.produtos, public.variacoes_produto, public.imagens_produto, public.personalizacao_presets, public.hero_slides, public.site_config, public.atendentes, public.pix_chaves, public.cupons TO authenticated;
GRANT ALL ON public.categorias, public.produtos, public.variacoes_produto, public.imagens_produto, public.personalizacao_presets, public.hero_slides, public.site_config, public.atendentes, public.pix_chaves, public.cupons TO service_role;

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variacoes_produto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imagens_produto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalizacao_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atendentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pix_chaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON public.categorias FOR SELECT USING (true);
CREATE POLICY "staff manage" ON public.categorias FOR ALL TO authenticated USING (public.has_permission(auth.uid(),'produtos.manage')) WITH CHECK (public.has_permission(auth.uid(),'produtos.manage'));
CREATE POLICY "public read" ON public.produtos FOR SELECT USING (ativo OR public.is_staff(auth.uid()));
CREATE POLICY "staff manage" ON public.produtos FOR ALL TO authenticated USING (public.has_permission(auth.uid(),'produtos.manage')) WITH CHECK (public.has_permission(auth.uid(),'produtos.manage'));
CREATE POLICY "public read" ON public.variacoes_produto FOR SELECT USING (true);
CREATE POLICY "staff manage" ON public.variacoes_produto FOR ALL TO authenticated USING (public.has_permission(auth.uid(),'produtos.manage')) WITH CHECK (public.has_permission(auth.uid(),'produtos.manage'));
CREATE POLICY "public read" ON public.imagens_produto FOR SELECT USING (true);
CREATE POLICY "staff manage" ON public.imagens_produto FOR ALL TO authenticated USING (public.has_permission(auth.uid(),'produtos.manage')) WITH CHECK (public.has_permission(auth.uid(),'produtos.manage'));
CREATE POLICY "public read" ON public.personalizacao_presets FOR SELECT USING (true);
CREATE POLICY "staff manage" ON public.personalizacao_presets FOR ALL TO authenticated USING (public.has_permission(auth.uid(),'produtos.manage')) WITH CHECK (public.has_permission(auth.uid(),'produtos.manage'));
CREATE POLICY "public read" ON public.hero_slides FOR SELECT USING (true);
CREATE POLICY "staff manage" ON public.hero_slides FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "public read" ON public.site_config FOR SELECT USING (true);
CREATE POLICY "staff manage" ON public.site_config FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "public read" ON public.atendentes FOR SELECT USING (true);
CREATE POLICY "staff manage" ON public.atendentes FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "public read active" ON public.pix_chaves FOR SELECT USING (ativo OR public.is_staff(auth.uid()));
CREATE POLICY "admin manage" ON public.pix_chaves FOR ALL TO authenticated USING (public.has_permission(auth.uid(),'admin.advanced')) WITH CHECK (public.has_permission(auth.uid(),'admin.advanced'));
CREATE POLICY "public read active" ON public.cupons FOR SELECT USING (ativo OR public.is_staff(auth.uid()));
CREATE POLICY "staff manage" ON public.cupons FOR ALL TO authenticated USING (public.has_permission(auth.uid(),'cupons.manage')) WITH CHECK (public.has_permission(auth.uid(),'cupons.manage'));

-- ORDERS
CREATE TABLE public.pedidos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, atendente_id uuid REFERENCES public.atendentes(id) ON DELETE SET NULL, cliente_nome text, cliente_whatsapp text, endereco jsonb, forma_envio text NOT NULL, forma_pagamento text NOT NULL, observacoes text, status text NOT NULL DEFAULT 'pendente', total numeric NOT NULL, cupom_codigo text, desconto_cupom numeric, gestaoclick_venda_id text, criado_em timestamptz DEFAULT now());
CREATE TABLE public.pedidos_itens (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE, produto_id uuid REFERENCES public.produtos(id) ON DELETE SET NULL, variacao_id uuid REFERENCES public.variacoes_produto(id) ON DELETE SET NULL, quantidade integer NOT NULL, preco_unitario numeric NOT NULL, detalhes jsonb);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos, public.pedidos_itens TO authenticated;
GRANT ALL ON public.pedidos, public.pedidos_itens TO service_role;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or staff read" ON public.pedidos FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own insert" ON public.pedidos FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "staff update" ON public.pedidos FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff delete" ON public.pedidos FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "own or staff read" ON public.pedidos_itens FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id AND (p.user_id = auth.uid() OR public.is_staff(auth.uid()))));
CREATE POLICY "own insert" ON public.pedidos_itens FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id AND p.user_id = auth.uid()));
CREATE POLICY "staff manage" ON public.pedidos_itens FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- RESTOCK REQUESTS
CREATE TABLE public.solicitacoes_reposicao (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE, cor text NOT NULL, tamanho text NOT NULL, cliente_nome text NOT NULL, cliente_whatsapp text NOT NULL, observacao text, status text NOT NULL DEFAULT 'pendente', criado_em timestamptz NOT NULL DEFAULT now(), atualizado_em timestamptz NOT NULL DEFAULT now());
GRANT INSERT ON public.solicitacoes_reposicao TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitacoes_reposicao TO authenticated;
GRANT ALL ON public.solicitacoes_reposicao TO service_role;
ALTER TABLE public.solicitacoes_reposicao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone request" ON public.solicitacoes_reposicao FOR INSERT TO anon, authenticated WITH CHECK (status = 'pendente');
CREATE POLICY "staff manage" ON public.solicitacoes_reposicao FOR ALL TO authenticated USING (public.has_permission(auth.uid(),'solicitacoes.manage')) WITH CHECK (public.has_permission(auth.uid(),'solicitacoes.manage'));

-- LOGS
CREATE TABLE public.estoque_historico (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), variacao_id uuid, produto_id uuid, produto_nome text, cor text, tamanho text, quantidade_anterior integer NOT NULL DEFAULT 0, quantidade_nova integer NOT NULL DEFAULT 0, diferenca integer NOT NULL DEFAULT 0, origem text NOT NULL DEFAULT 'manual', user_id uuid, user_email text, criado_em timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.gestaoclick_sync_log (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gestaoclick_id text NOT NULL, nome text, estoque integer, ok boolean NOT NULL DEFAULT true, mensagem text, criado_em timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.admin_audit_log (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, user_email text, acao text NOT NULL, entidade text NOT NULL, entidade_id text, descricao text, detalhes jsonb, criado_em timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_historico, public.gestaoclick_sync_log, public.admin_audit_log TO authenticated;
GRANT ALL ON public.estoque_historico, public.gestaoclick_sync_log, public.admin_audit_log TO service_role;
ALTER TABLE public.estoque_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gestaoclick_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff all" ON public.estoque_historico FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff all" ON public.gestaoclick_sync_log FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff insert" ON public.admin_audit_log FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "auditors read" ON public.admin_audit_log FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'auditoria.view'));

-- STOCK HISTORY TRIGGER
CREATE OR REPLACE FUNCTION public.log_estoque_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.quantidade_estoque IS DISTINCT FROM OLD.quantidade_estoque THEN
    INSERT INTO public.estoque_historico (variacao_id, produto_id, produto_nome, cor, tamanho, quantidade_anterior, quantidade_nova, diferenca, origem, user_id, user_email)
    SELECT NEW.id, NEW.produto_id, p.nome, NEW.nome_cor, NEW.tamanho, OLD.quantidade_estoque, NEW.quantidade_estoque, NEW.quantidade_estoque - OLD.quantidade_estoque,
      coalesce(current_setting('app.estoque_origem', true), 'manual'), auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid())
    FROM public.produtos p WHERE p.id = NEW.produto_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_log_estoque AFTER UPDATE OF quantidade_estoque ON public.variacoes_produto FOR EACH ROW EXECUTE FUNCTION public.log_estoque_change();

-- RPCs
CREATE OR REPLACE FUNCTION public.decrement_stock(var_id uuid, amount integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM set_config('app.estoque_origem', 'pedido', true);
  UPDATE public.variacoes_produto SET quantidade_estoque = quantidade_estoque - amount WHERE id = var_id AND quantidade_estoque - amount >= 0;
  IF NOT FOUND THEN RAISE EXCEPTION 'Estoque insuficiente'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_pedido_status(_pedido_id uuid, _status text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _old text; it record;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _status NOT IN ('pendente','confirmado','entregue','cancelado') THEN RAISE EXCEPTION 'Status inválido'; END IF;
  SELECT status INTO _old FROM public.pedidos WHERE id = _pedido_id FOR UPDATE;
  IF _old IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  PERFORM set_config('app.estoque_origem', 'pedido', true);
  IF _status = 'cancelado' AND _old <> 'cancelado' THEN
    FOR it IN SELECT variacao_id, quantidade FROM public.pedidos_itens WHERE pedido_id = _pedido_id AND variacao_id IS NOT NULL LOOP
      UPDATE public.variacoes_produto SET quantidade_estoque = quantidade_estoque + it.quantidade WHERE id = it.variacao_id;
    END LOOP;
  ELSIF _old = 'cancelado' AND _status <> 'cancelado' THEN
    FOR it IN SELECT variacao_id, quantidade FROM public.pedidos_itens WHERE pedido_id = _pedido_id AND variacao_id IS NOT NULL LOOP
      UPDATE public.variacoes_produto SET quantidade_estoque = quantidade_estoque - it.quantidade WHERE id = it.variacao_id AND quantidade_estoque >= it.quantidade;
      IF NOT FOUND THEN RAISE EXCEPTION 'Estoque insuficiente para reativar o pedido'; END IF;
    END LOOP;
  END IF;
  UPDATE public.pedidos SET status = _status WHERE id = _pedido_id;
END $$;

CREATE OR REPLACE FUNCTION public.delete_pedido(_pedido_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _old text; it record;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT status INTO _old FROM public.pedidos WHERE id = _pedido_id FOR UPDATE;
  IF _old IS NULL THEN RETURN; END IF;
  IF _old <> 'cancelado' THEN
    PERFORM set_config('app.estoque_origem', 'pedido', true);
    FOR it IN SELECT variacao_id, quantidade FROM public.pedidos_itens WHERE pedido_id = _pedido_id AND variacao_id IS NOT NULL LOOP
      UPDATE public.variacoes_produto SET quantidade_estoque = quantidade_estoque + it.quantidade WHERE id = it.variacao_id;
    END LOOP;
  END IF;
  DELETE FROM public.pedidos WHERE id = _pedido_id;
END $$;

CREATE OR REPLACE FUNCTION public.set_produtos_ordem(_ids uuid[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_permission(auth.uid(),'produtos.manage') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.produtos p SET ordem = x.ord FROM unnest(_ids) WITH ORDINALITY AS x(id, ord) WHERE p.id = x.id;
END $$;

CREATE OR REPLACE FUNCTION public.next_restock_whatsapp() RETURNS text[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.site_config; lista text[]; n int;
BEGIN
  SELECT * INTO c FROM public.site_config WHERE id = 'current' FOR UPDATE;
  IF c.id IS NULL THEN RETURN '{}'; END IF;
  lista := coalesce(c.restock_whatsapp_list, '{}');
  IF cardinality(lista) = 0 THEN
    RETURN CASE WHEN c.restock_whatsapp IS NULL THEN '{}'::text[] ELSE ARRAY[c.restock_whatsapp] END;
  END IF;
  IF c.restock_modo = 'todos' THEN RETURN lista; END IF;
  n := cardinality(lista);
  UPDATE public.site_config SET restock_rodizio_idx = (c.restock_rodizio_idx + 1) % n WHERE id = 'current';
  RETURN ARRAY[lista[(c.restock_rodizio_idx % n) + 1]];
END $$;

CREATE OR REPLACE FUNCTION public.product_color_letter(_produto_id uuid) RETURNS text LANGUAGE sql STABLE SET search_path = public AS $$ SELECT chr(65 + (SELECT count(DISTINCT nome_cor)::int FROM public.variacoes_produto WHERE produto_id = _produto_id) % 26) $$;

GRANT EXECUTE ON FUNCTION public.next_restock_whatsapp() TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM anon;
REVOKE EXECUTE ON FUNCTION public.decrement_stock(uuid, integer) FROM anon;