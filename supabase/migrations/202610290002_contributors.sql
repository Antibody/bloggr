BEGIN;
CREATE TABLE public.blog_members (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 role text NOT NULL CHECK(role IN ('editor','author')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.blog_author_profiles (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 slug text NOT NULL UNIQUE CHECK(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug)<=100),
 display_name text NOT NULL CHECK(length(display_name) BETWEEN 1 AND 100),
 bio text NOT NULL DEFAULT '' CHECK(length(bio)<=2000),
 avatar_url text NOT NULL DEFAULT '' CHECK(length(avatar_url)<=2000),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.blog_posts ADD COLUMN author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.blog_posts ADD COLUMN cover_caption text NOT NULL DEFAULT '';
CREATE INDEX blog_post_author ON public.blog_posts(author_id);
ALTER TABLE public.blog_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_author_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.blog_members,public.blog_author_profiles FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.blog_members TO authenticated;
GRANT ALL ON public.blog_members,public.blog_author_profiles TO service_role;
CREATE POLICY own_membership ON public.blog_members FOR SELECT TO authenticated USING(user_id=auth.uid());
-- Only these deliberately public profile fields are projected. Membership and email remain private.
CREATE VIEW public.blog_authors AS SELECT user_id,slug,display_name,bio,avatar_url FROM public.blog_author_profiles;
REVOKE ALL ON public.blog_authors FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.blog_authors TO anon,authenticated,service_role;
CREATE TABLE public.blog_redirects (
 old_slug text PRIMARY KEY,
 post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE
);
ALTER TABLE public.blog_redirects ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.blog_redirects FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.blog_redirects TO anon,authenticated;
GRANT ALL ON public.blog_redirects TO service_role;
CREATE POLICY published_redirects ON public.blog_redirects FOR SELECT TO anon,authenticated
 USING(EXISTS(SELECT 1 FROM public.blog_posts WHERE id=post_id AND status='published' AND published_at<=now() AND deleted_at IS NULL));
-- Remove the actor-less RPC, which would bypass the contributor capability checks.
DROP FUNCTION public.edit_blog_post(text,jsonb,text,bigint,uuid,uuid);
CREATE OR REPLACE FUNCTION public.edit_blog_post(p_slug text,p_draft jsonb,p_action text,p_version bigint,p_id uuid DEFAULT NULL,p_revision uuid DEFAULT NULL,p_actor_id uuid DEFAULT NULL,p_actor_role text DEFAULT NULL,p_new_slug text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE post public.blog_posts; draft jsonb;
BEGIN
 IF p_actor_id IS NULL OR p_actor_role IS NULL OR p_actor_role NOT IN ('owner','editor','author') THEN RAISE EXCEPTION 'actor_required' USING ERRCODE='42501';END IF;
 -- Only trusted server code can assert owner; contributor roles are checked again atomically.
 IF p_actor_role<>'owner' AND NOT EXISTS(SELECT 1 FROM public.blog_members WHERE user_id=p_actor_id AND role=p_actor_role) THEN RAISE EXCEPTION 'membership_required' USING ERRCODE='42501';END IF;
 IF p_actor_role='author' AND p_action IN ('publish','unpublish') THEN RAISE EXCEPTION 'publication_denied' USING ERRCODE='42501';END IF;
 IF (p_action='create' AND p_slug IN ('admin','login','api','preview','author','reset-password')) OR (p_action='rename' AND p_new_slug IN ('admin','login','api','preview','author','reset-password')) THEN RAISE EXCEPTION 'reserved_permalink' USING ERRCODE='22023';END IF;
 IF p_action IN ('create','rename') THEN PERFORM pg_advisory_xact_lock(7294813);END IF;
 IF p_action='create' THEN
  IF p_id IS NULL OR p_slug IS NULL OR length(p_slug)=0 THEN RAISE EXCEPTION 'invalid_create' USING ERRCODE='22023';END IF;
  -- The stable client-generated UUID makes a retried creation idempotent.
  SELECT * INTO post FROM public.blog_posts WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN
   IF EXISTS(SELECT 1 FROM public.blog_redirects WHERE old_slug=p_slug) THEN RAISE EXCEPTION 'reserved_permalink' USING ERRCODE='23505';END IF;
   INSERT INTO public.blog_posts(id,slug,title,content,status,author_id) VALUES(p_id,p_slug,'','', 'draft',p_actor_id) RETURNING * INTO post;
   INSERT INTO public.blog_post_drafts(post_id,data) VALUES(post.id,p_draft);
  ELSIF p_actor_role='author' AND (post.author_id IS DISTINCT FROM p_actor_id OR post.status<>'draft') THEN
   RAISE EXCEPTION 'author_scope' USING ERRCODE='42501';
  END IF;
 ELSE
  SELECT * INTO post FROM public.blog_posts WHERE slug=p_slug FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'post_not_found' USING ERRCODE='P0002';END IF;
  IF p_actor_role='author' AND (post.author_id IS DISTINCT FROM p_actor_id OR post.status<>'draft') THEN RAISE EXCEPTION 'author_scope' USING ERRCODE='42501';END IF;
  IF p_version IS NULL OR post.version<>p_version THEN RAISE EXCEPTION 'version_conflict' USING ERRCODE='40001';END IF;
  IF post.deleted_at IS NOT NULL AND p_action<>'restore' THEN RAISE EXCEPTION 'post_in_trash' USING ERRCODE='22023';END IF;
  IF p_action IN ('save','publish') THEN
   UPDATE public.blog_post_drafts SET data=p_draft WHERE post_id=post.id;
  ELSIF p_action='revision' THEN
   SELECT data INTO draft FROM public.blog_revisions WHERE id=p_revision AND post_id=post.id;
   IF NOT FOUND THEN RAISE EXCEPTION 'revision_not_found' USING ERRCODE='P0002';END IF;
   UPDATE public.blog_post_drafts SET data=draft WHERE post_id=post.id;
  ELSIF p_action='rename' THEN
   IF p_new_slug IS NULL OR length(p_new_slug)>120 OR p_new_slug !~ '^[[:alnum:]]+(-[[:alnum:]]+)*$' OR p_new_slug=post.slug THEN RAISE EXCEPTION 'invalid_permalink' USING ERRCODE='22023';END IF;
   IF EXISTS(SELECT 1 FROM public.blog_redirects WHERE old_slug=p_new_slug) THEN RAISE EXCEPTION 'reserved_permalink' USING ERRCODE='23505';END IF;
   INSERT INTO public.blog_redirects(old_slug,post_id) VALUES(post.slug,post.id);
   UPDATE public.blog_posts SET slug=p_new_slug WHERE id=post.id;
  ELSIF p_action NOT IN ('unpublish','trash','restore') THEN
   RAISE EXCEPTION 'invalid_action' USING ERRCODE='22023';
  END IF;
  IF p_action='publish' THEN
   INSERT INTO public.blog_revisions(post_id,data) VALUES(post.id,p_draft);
   UPDATE public.blog_posts SET title=p_draft->>'title',content=p_draft->>'htmlContent',published_at=(p_draft->>'date')::timestamptz,
    description=p_draft->>'seoDescription',keywords=p_draft->>'seoKeywords',excerpt=p_draft->>'excerpt',
    cover_image=p_draft->>'coverImage',cover_alt=p_draft->>'coverAlt',cover_caption=coalesce(p_draft->>'coverCaption',''),author_name=p_draft->>'authorName',
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
REVOKE ALL ON FUNCTION public.edit_blog_post(text,jsonb,text,bigint,uuid,uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.edit_blog_post(text,jsonb,text,bigint,uuid,uuid,uuid,text,text) TO service_role;
COMMIT;
