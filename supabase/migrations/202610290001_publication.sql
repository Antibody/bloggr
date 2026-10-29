BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS public.blog_posts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL DEFAULT '', slug text UNIQUE NOT NULL,
 content text NOT NULL DEFAULT '', published_at timestamptz NOT NULL DEFAULT now(), description text, keywords text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
-- Legacy installations have no publication timestamp default.
ALTER TABLE public.blog_posts ALTER COLUMN published_at SET DEFAULT now();
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published';
ALTER TABLE public.blog_posts ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS excerpt text NOT NULL DEFAULT '';
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS cover_image text NOT NULL DEFAULT '';
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS cover_alt text NOT NULL DEFAULT '';
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS author_name text NOT NULL DEFAULT '';
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 1;
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE TABLE IF NOT EXISTS public.blog_post_drafts (
 post_id uuid PRIMARY KEY REFERENCES public.blog_posts(id) ON DELETE CASCADE, data jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS public.blog_revisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
 data jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.blog_settings (id integer PRIMARY KEY CHECK(id=1),data jsonb NOT NULL);
INSERT INTO public.blog_settings VALUES (1,'{"title":"Bloggr","description":"Ideas, stories, and things worth sharing.","accent":"#245d48","logo_url":"","locale":"en","timezone":"UTC","home_mode":"publication","social_url":""}') ON CONFLICT DO NOTHING;
INSERT INTO public.blog_post_drafts(post_id,data)
 SELECT id,jsonb_build_object('title',title,'htmlContent',content,'date',published_at,'seoDescription',coalesce(description,''),'seoKeywords',coalesce(keywords,''),'excerpt',excerpt,'coverImage',cover_image,'coverAlt',cover_alt,'tags',tags,'authorName',author_name)
 FROM public.blog_posts ON CONFLICT DO NOTHING;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_settings ENABLE ROW LEVEL SECURITY;
-- Remove every pre-existing post policy: permissive policies combine with OR.
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname,tablename FROM pg_policies WHERE schemaname='public' AND tablename IN ('blog_posts','blog_post_drafts','blog_revisions','blog_settings') LOOP
 EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,p.tablename);
END LOOP;END $$;
REVOKE ALL ON public.blog_posts,public.blog_post_drafts,public.blog_revisions,public.blog_settings FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.blog_posts,public.blog_settings TO anon,authenticated;
GRANT ALL ON public.blog_posts,public.blog_post_drafts,public.blog_revisions,public.blog_settings TO service_role;
CREATE POLICY published_posts ON public.blog_posts FOR SELECT TO anon,authenticated USING(status='published' AND published_at<=now() AND deleted_at IS NULL);
CREATE POLICY publication_settings ON public.blog_settings FOR SELECT TO anon,authenticated USING(true);
CREATE INDEX IF NOT EXISTS blog_publication_date ON public.blog_posts(published_at DESC) WHERE status='published' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS blog_post_tags ON public.blog_posts USING gin(tags);
CREATE INDEX IF NOT EXISTS blog_revision_post ON public.blog_revisions(post_id,created_at DESC);

CREATE OR REPLACE FUNCTION public.edit_blog_post(p_slug text,p_draft jsonb,p_action text,p_version bigint,p_id uuid DEFAULT NULL,p_revision uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE post public.blog_posts; draft jsonb;
BEGIN
 IF p_action='create' THEN
  IF p_id IS NULL OR p_slug IS NULL OR length(p_slug)=0 THEN RAISE EXCEPTION 'invalid_create' USING ERRCODE='22023';END IF;
  -- The stable client-generated UUID makes a retried creation idempotent.
  SELECT * INTO post FROM public.blog_posts WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN
   INSERT INTO public.blog_posts(id,slug,title,content,status) VALUES(p_id,p_slug,'','', 'draft') RETURNING * INTO post;
   INSERT INTO public.blog_post_drafts(post_id,data) VALUES(post.id,p_draft);
  END IF;
 ELSE
  SELECT * INTO post FROM public.blog_posts WHERE slug=p_slug FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'post_not_found' USING ERRCODE='P0002';END IF;
  IF p_version IS NULL OR post.version<>p_version THEN RAISE EXCEPTION 'version_conflict' USING ERRCODE='40001';END IF;
  IF post.deleted_at IS NOT NULL AND p_action<>'restore' THEN RAISE EXCEPTION 'post_in_trash' USING ERRCODE='22023';END IF;
  IF p_action IN ('save','publish') THEN
   UPDATE public.blog_post_drafts SET data=p_draft WHERE post_id=post.id;
  ELSIF p_action='revision' THEN
   SELECT data INTO draft FROM public.blog_revisions WHERE id=p_revision AND post_id=post.id;
   IF NOT FOUND THEN RAISE EXCEPTION 'revision_not_found' USING ERRCODE='P0002';END IF;
   UPDATE public.blog_post_drafts SET data=draft WHERE post_id=post.id;
  ELSIF p_action NOT IN ('unpublish','trash','restore') THEN
   RAISE EXCEPTION 'invalid_action' USING ERRCODE='22023';
  END IF;
  IF p_action='publish' THEN
   INSERT INTO public.blog_revisions(post_id,data) VALUES(post.id,p_draft);
   UPDATE public.blog_posts SET title=p_draft->>'title',content=p_draft->>'htmlContent',published_at=(p_draft->>'date')::timestamptz,
    description=p_draft->>'seoDescription',keywords=p_draft->>'seoKeywords',excerpt=p_draft->>'excerpt',
    cover_image=p_draft->>'coverImage',cover_alt=p_draft->>'coverAlt',author_name=p_draft->>'authorName',
    tags=ARRAY(SELECT jsonb_array_elements_text(p_draft->'tags')),status='published' WHERE id=post.id;
  ELSIF p_action='unpublish' THEN UPDATE public.blog_posts SET status='draft' WHERE id=post.id;
  ELSIF p_action='trash' THEN UPDATE public.blog_posts SET status='draft',deleted_at=now() WHERE id=post.id;
  ELSIF p_action='restore' THEN UPDATE public.blog_posts SET status='draft',deleted_at=NULL WHERE id=post.id;
  END IF;
  UPDATE public.blog_posts SET version=version+1,updated_at=clock_timestamp() WHERE id=post.id RETURNING * INTO post;
 END IF;
 SELECT data INTO draft FROM public.blog_post_drafts WHERE post_id=post.id;
 RETURN to_jsonb(post)||jsonb_build_object('draft',draft);
END $$;
REVOKE ALL ON FUNCTION public.edit_blog_post(text,jsonb,text,bigint,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.edit_blog_post(text,jsonb,text,bigint,uuid,uuid) TO service_role;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('blog-images','blog-images',true,5242880,ARRAY['image/webp','image/jpeg','image/png','image/gif']) ON CONFLICT(id) DO UPDATE SET file_size_limit=5242880,allowed_mime_types=EXCLUDED.allowed_mime_types;
DROP POLICY IF EXISTS "Admin Write Access for blog-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access for blog-images" ON storage.objects;
CREATE POLICY "Public Read Access for blog-images" ON storage.objects FOR SELECT TO anon,authenticated USING(bucket_id='blog-images');
-- Restrictive policies also block broader pre-existing storage write policies for this bucket.
CREATE POLICY blog_images_no_browser_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO anon,authenticated WITH CHECK(bucket_id<>'blog-images');
CREATE POLICY blog_images_no_browser_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon,authenticated USING(bucket_id<>'blog-images') WITH CHECK(bucket_id<>'blog-images');
CREATE POLICY blog_images_no_browser_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO anon,authenticated USING(bucket_id<>'blog-images');
COMMIT;
