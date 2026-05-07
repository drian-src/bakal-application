-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.background_jobs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  job_type character varying NOT NULL CHECK (job_type::text = ANY (ARRAY['scrape_query'::character varying, 'refresh_product'::character varying, 'update_metadata'::character varying]::text[])),
  query_text text,
  product_id uuid,
  priority integer DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'failed'::character varying, 'retry'::character varying]::text[])),
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  error_message text,
  data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  next_run_at timestamp with time zone,
  result_data jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT background_jobs_pkey PRIMARY KEY (id),
  CONSTRAINT background_jobs_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.cart (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cart_pkey PRIMARY KEY (id),
  CONSTRAINT cart_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.cart_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  cart_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  added_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cart_items_pkey PRIMARY KEY (id),
  CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.cart(id),
  CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.platforms (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT platforms_pkey PRIMARY KEY (id)
);
CREATE TABLE public.product_sources (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  search_id uuid NOT NULL,
  product_id uuid NOT NULL,
  rank integer NOT NULL DEFAULT 1 CHECK (rank > 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_sources_pkey PRIMARY KEY (id),
  CONSTRAINT product_sources_search_id_fkey FOREIGN KEY (search_id) REFERENCES public.searches(id),
  CONSTRAINT product_sources_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  price numeric,
  rating numeric,
  reviews_count integer DEFAULT 0,
  seller_name text,
  product_url text NOT NULL UNIQUE,
  image_url text,
  platform_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  embedding USER-DEFINED,
  original_price double precision,
  discount_percent double precision,
  is_on_sale boolean,
  promo_label text,
  specs jsonb DEFAULT '{}'::jsonb,
  last_scraped timestamp with time zone DEFAULT now(),
  view_count integer DEFAULT 0,
  is_available boolean DEFAULT true,
  sku text,
  brand text,
  variation text,
  free_items jsonb,
  stock integer,
  price_updated_at timestamp with time zone,
  stock_updated_at timestamp with time zone,
  rating_updated_at timestamp with time zone,
  specs_updated_at timestamp with time zone,
  is_fresh boolean DEFAULT false,
  needs_refresh boolean DEFAULT false,
  scrape_attempt_count integer DEFAULT 0,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_platform_id_fkey FOREIGN KEY (platform_id) REFERENCES public.platforms(id)
);
CREATE TABLE public.recommendations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  search_id uuid NOT NULL,
  product_id uuid NOT NULL,
  score numeric NOT NULL DEFAULT 0 CHECK (score >= 0::numeric AND score <= 1::numeric),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT recommendations_pkey PRIMARY KEY (id),
  CONSTRAINT recommendations_search_id_fkey FOREIGN KEY (search_id) REFERENCES public.searches(id),
  CONSTRAINT recommendations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.search_cache_metadata (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  query_text text NOT NULL UNIQUE,
  last_scraped_at timestamp with time zone DEFAULT now(),
  is_fresh boolean DEFAULT true,
  product_count integer DEFAULT 0,
  scraped_stores ARRAY DEFAULT ARRAY[]::text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT search_cache_metadata_pkey PRIMARY KEY (id)
);
CREATE TABLE public.searches (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  query text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT searches_pkey PRIMARY KEY (id),
  CONSTRAINT searches_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.ttl_settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  platform_name character varying NOT NULL,
  field_type character varying NOT NULL CHECK (field_type::text = ANY (ARRAY['price'::character varying, 'stock'::character varying, 'rating'::character varying, 'specs'::character varying, 'availability'::character varying]::text[])),
  ttl_minutes integer NOT NULL CHECK (ttl_minutes > 0),
  is_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ttl_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_interactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  product_id uuid,
  event_type text NOT NULL CHECK (event_type = ANY (ARRAY['search'::text, 'click'::text, 'view'::text, 'cart_add'::text])),
  query text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_interactions_pkey PRIMARY KEY (id),
  CONSTRAINT user_interactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_interactions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.user_product_interactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  product_id uuid NOT NULL,
  interaction_type character varying NOT NULL CHECK (interaction_type::text = ANY (ARRAY['view'::character varying, 'click'::character varying, 'cart_add'::character varying, 'compare'::character varying, 'wishlist'::character varying]::text[])),
  query_text text,
  timestamp timestamp with time zone DEFAULT now(),
  CONSTRAINT user_product_interactions_pkey PRIMARY KEY (id),
  CONSTRAINT user_product_interactions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.user_recommendations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  explanation text NOT NULL,
  reason_type text NOT NULL CHECK (reason_type = ANY (ARRAY['searched_for'::text, 'similar_to_viewed'::text, 'similar_to_clicked'::text, 'users_also_viewed'::text, 'popular_in_category'::text, 'trending'::text, 'cart_similar'::text])),
  computed_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '06:00:00'::interval),
  CONSTRAINT user_recommendations_pkey PRIMARY KEY (id),
  CONSTRAINT user_recommendations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_recommendations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email text NOT NULL UNIQUE,
  name text,
  password_hash text,
  google_id text UNIQUE,
  auth_provider text NOT NULL DEFAULT 'email'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_login timestamp with time zone,
  avatar_url text,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);