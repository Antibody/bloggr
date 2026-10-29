CREATE TABLE public.blog_media (
 name text PRIMARY KEY,
 alt text NOT NULL DEFAULT '' CHECK (length(alt)<=300),
 caption text NOT NULL DEFAULT '' CHECK (length(caption)<=500),
 width integer,
 height integer,
 byte_size bigint,
 created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX blog_media_creator ON public.blog_media(created_by);
ALTER TABLE public.blog_media ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.blog_media FROM anon, authenticated;
GRANT ALL ON public.blog_media TO service_role;

ALTER TABLE public.blog_posts ADD COLUMN search_document tsvector GENERATED ALWAYS AS (
 to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(excerpt,'') || ' ' || coalesce(description,'') || ' ' || regexp_replace(coalesce(content,''),'<[^>]*>',' ','g'))
) STORED;
CREATE INDEX blog_posts_search ON public.blog_posts USING gin(search_document);
CREATE FUNCTION public.blog_public_topics() RETURNS SETOF text LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
 SELECT DISTINCT unnest(tags) FROM public.blog_posts WHERE status='published' AND deleted_at IS NULL AND published_at<=now() ORDER BY 1
$$;
REVOKE ALL ON FUNCTION public.blog_public_topics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.blog_public_topics() TO anon,authenticated,service_role;
