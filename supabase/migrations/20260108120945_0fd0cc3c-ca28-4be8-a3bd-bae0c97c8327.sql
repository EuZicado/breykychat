-- Add is_private column to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;

-- Update the get_ranked_feed function to exclude private posts
CREATE OR REPLACE FUNCTION public.get_ranked_feed(p_user_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, creator_id uuid, content_url text, content_type content_type, description text, tags text[], likes_count integer, comments_count integer, shares_count integer, saves_count integer, engagement_score numeric, created_at timestamp with time zone, creator_username text, creator_display_name text, creator_avatar_url text, creator_is_verified boolean, creator_verification_type verification_type, rank_score numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.creator_id,
    p.content_url,
    p.content_type,
    p.description,
    p.tags,
    p.likes_count,
    p.comments_count,
    p.shares_count,
    p.saves_count,
    p.engagement_score,
    p.created_at,
    pr.username AS creator_username,
    pr.display_name AS creator_display_name,
    pr.avatar_url AS creator_avatar_url,
    pr.is_verified AS creator_is_verified,
    pr.verification_type AS creator_verification_type,
    (
      (p.likes_count * 2 + p.comments_count * 5 + p.shares_count * 10 + p.saves_count * 15) /
      POWER(EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 + 2, 1.5)
    ) * (CASE WHEN pr.is_verified THEN 1.5 ELSE 1.0 END) AS rank_score
  FROM public.posts p
  JOIN public.profiles pr ON p.creator_id = pr.id
  WHERE (p.is_private = false OR p.creator_id = p_user_id)
  ORDER BY rank_score DESC, p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

-- Create function to delete post
CREATE OR REPLACE FUNCTION public.delete_user_post(post_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete related data first
  DELETE FROM public.post_likes WHERE post_likes.post_id = delete_user_post.post_id;
  DELETE FROM public.comments WHERE comments.post_id = delete_user_post.post_id;
  DELETE FROM public.saved_posts WHERE saved_posts.post_id = delete_user_post.post_id;
  DELETE FROM public.notifications WHERE notifications.post_id = delete_user_post.post_id;
  
  -- Delete the post (only if user owns it)
  DELETE FROM public.posts 
  WHERE posts.id = delete_user_post.post_id 
  AND posts.creator_id = auth.uid();
  
  RETURN FOUND;
END;
$$;