-- ================================================================
-- T教练 社区功能 MVP 建表脚本
-- 在 Supabase SQL Editor 中执行
-- ================================================================

-- 1. 用户扩展资料（关联 Supabase Auth）
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 自动为新注册用户创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================================

-- 2. 战术分享表
CREATE TABLE IF NOT EXISTS public.tactical_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  map_id TEXT NOT NULL,
  tactic_data JSONB NOT NULL,
  views INT DEFAULT 0,
  like_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX idx_tactical_shares_map ON public.tactical_shares(map_id);
CREATE INDEX idx_tactical_shares_user ON public.tactical_shares(user_id);
CREATE INDEX idx_tactical_shares_created ON public.tactical_shares(created_at DESC);
CREATE INDEX idx_tactical_shares_likes ON public.tactical_shares(like_count DESC);

-- ================================================================

-- 3. 评论表
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL DEFAULT 'tactic',  -- 未来兼容 'post'
  target_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX idx_comments_target ON public.comments(target_type, target_id, created_at ASC);
CREATE INDEX idx_comments_user ON public.comments(user_id);

-- ================================================================
-- RLS 策略
-- ================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tactical_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- profiles: 所有人可读, 仅自己可改
CREATE POLICY "profiles_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- tactical_shares: 所有人可读, 仅作者可增/改/删
CREATE POLICY "tactics_read" ON public.tactical_shares FOR SELECT USING (true);
CREATE POLICY "tactics_insert" ON public.tactical_shares FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tactics_update" ON public.tactical_shares FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "tactics_delete" ON public.tactical_shares FOR DELETE USING (auth.uid() = user_id);

-- comments: 所有人可读, 登录用户可发, 仅作者可删
CREATE POLICY "comments_read" ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- ================================================================
-- RPC 函数（在 Supabase SQL Editor 中执行）
-- ================================================================

-- 增加浏览量
CREATE OR REPLACE FUNCTION public.increment_view(share_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.tactical_shares SET views = views + 1 WHERE id = share_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 增加评论数（兼容战术、帖子、点位）
CREATE OR REPLACE FUNCTION public.increment_comment_count(target_id UUID, target_type TEXT DEFAULT 'tactic')
RETURNS void AS $$
BEGIN
  IF target_type = 'tactic' THEN
    UPDATE public.tactical_shares SET comment_count = comment_count + 1 WHERE id = target_id;
  ELSIF target_type = 'post' THEN
    UPDATE public.posts SET comment_count = comment_count + 1 WHERE id = target_id;
  ELSIF target_type = 'lineup' THEN
    UPDATE public.lineups SET comment_count = comment_count + 1 WHERE id = target_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 社区 V2 扩展：点赞 + 关注 + 通知 + 帖子
-- ================================================================

-- 4. 点赞表
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,  -- 'tactic' | 'post'
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, target_type, target_id)  -- 一人只能点赞一次
);
CREATE INDEX idx_likes_target ON public.likes(target_type, target_id);

-- 5. 关注表
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id)  -- 不能重复关注
);
CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);

-- 6. 通知表
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- 'like' | 'comment' | 'follow'
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT,    -- 'tactic' | 'post' | null(follow时)
  target_id UUID,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read, created_at DESC);

-- 7. 论坛帖子表
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'discussion',  -- 'discussion' | 'guide' | 'map' | 'team'
  tags TEXT[] DEFAULT '{}',
  views INT DEFAULT 0,
  like_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_posts_category ON public.posts(category, created_at DESC);
CREATE INDEX idx_posts_user ON public.posts(user_id);
CREATE INDEX idx_posts_created ON public.posts(created_at DESC);

-- ================================================================
-- RLS 策略 (V2)
-- ================================================================

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- likes: 所有人可读, 登录用户可点赞/取消
CREATE POLICY "likes_read" ON public.likes FOR SELECT USING (true);
CREATE POLICY "likes_insert" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- follows: 所有人可读, 登录用户可关注/取关
CREATE POLICY "follows_read" ON public.follows FOR SELECT USING (true);
CREATE POLICY "follows_insert" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows_delete" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- notifications: 仅本人可读, 仅本人可标记已读
CREATE POLICY "notif_read" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT WITH CHECK (true);

-- posts: 所有人可读, 仅作者可增/改/删
CREATE POLICY "posts_read" ON public.posts FOR SELECT USING (true);
CREATE POLICY "posts_insert" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_update" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "posts_delete" ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- ================================================================
-- RPC 函数 (V2)
-- ================================================================

-- 点赞：自动更新 like_count
CREATE OR REPLACE FUNCTION public.toggle_like(
  p_user_id UUID, p_target_type TEXT, p_target_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  existing UUID;
  col TEXT;
BEGIN
  SELECT id INTO existing FROM public.likes
    WHERE user_id = p_user_id AND target_type = p_target_type AND target_id = p_target_id;
  IF existing IS NOT NULL THEN
    DELETE FROM public.likes WHERE id = existing;
    IF p_target_type = 'tactic' THEN
      UPDATE public.tactical_shares SET like_count = GREATEST(like_count - 1, 0) WHERE id = p_target_id;
    ELSE
      UPDATE public.posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = p_target_id;
    END IF;
    RETURN false;  -- 已取消点赞
  ELSE
    INSERT INTO public.likes (user_id, target_type, target_id) VALUES (p_user_id, p_target_type, p_target_id);
    IF p_target_type = 'tactic' THEN
      UPDATE public.tactical_shares SET like_count = like_count + 1 WHERE id = p_target_id;
    ELSE
      UPDATE public.posts SET like_count = like_count + 1 WHERE id = p_target_id;
    END IF;
    RETURN true;   -- 已点赞
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建通知
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID, p_type TEXT, p_from_user_id UUID,
  p_target_type TEXT DEFAULT NULL, p_target_id UUID DEFAULT NULL
) RETURNS void AS $$
BEGIN
  IF p_user_id != p_from_user_id THEN  -- 不给自己发通知
    INSERT INTO public.notifications (user_id, type, from_user_id, target_type, target_id)
    VALUES (p_user_id, p_type, p_from_user_id, p_target_type, p_target_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 未读通知数
CREATE OR REPLACE FUNCTION public.unread_count(p_user_id UUID)
RETURNS INT AS $$
  SELECT COUNT(*)::INT FROM public.notifications WHERE user_id = p_user_id AND read = false;
$$ LANGUAGE sql SECURITY DEFINER;

-- 帖子浏览量
CREATE OR REPLACE FUNCTION public.increment_post_view(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.posts SET views = views + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 技能点位 Lineups
-- ================================================================

CREATE TABLE IF NOT EXISTS public.lineups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  map_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  ability_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  start_x DECIMAL, start_y DECIMAL,
  target_x DECIMAL, target_y DECIMAL,
  position_img TEXT,
  aim_img TEXT,
  release_img TEXT,
  effect_img TEXT,
  views INT DEFAULT 0,
  like_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  difficulty INT DEFAULT 1 CHECK(difficulty BETWEEN 1 AND 5),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_lineups_map ON public.lineups(map_id);
CREATE INDEX idx_lineups_agent ON public.lineups(agent_id);
CREATE INDEX idx_lineups_ability ON public.lineups(ability_id);
CREATE INDEX idx_lineups_user ON public.lineups(user_id);
CREATE INDEX idx_lineups_created ON public.lineups(created_at DESC);

ALTER TABLE public.lineups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lineups_read" ON public.lineups FOR SELECT USING (true);
CREATE POLICY "lineups_insert" ON public.lineups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lineups_update" ON public.lineups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "lineups_delete" ON public.lineups FOR DELETE USING (auth.uid() = user_id);

-- 点位浏览量
CREATE OR REPLACE FUNCTION public.increment_lineup_view(lineup_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.lineups SET views = views + 1 WHERE id = lineup_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 战术分享加收藏计数
ALTER TABLE public.tactical_shares ADD COLUMN IF NOT EXISTS favorite_count INT DEFAULT 0;

-- 战术分享加预览图
ALTER TABLE public.tactical_shares ADD COLUMN IF NOT EXISTS preview_image TEXT;

-- 战术发布：多图支持
ALTER TABLE public.tactical_shares ADD COLUMN IF NOT EXISTS lineup_images TEXT[] DEFAULT '{}';
ALTER TABLE public.tactical_shares ADD COLUMN IF NOT EXISTS effect_images TEXT[] DEFAULT '{}';

-- ================================================================
-- 个人主页升级：收藏 + 统计
-- ================================================================

CREATE TABLE IF NOT EXISTS public.profile_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  target_user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, target_user_id)
);
CREATE INDEX idx_favorites_target ON public.profile_favorites(target_user_id);

ALTER TABLE public.profile_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fav_read" ON public.profile_favorites FOR SELECT USING (true);
CREATE POLICY "fav_insert" ON public.profile_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fav_delete" ON public.profile_favorites FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS favorite_count INT DEFAULT 0;

-- 修复 toggle_like 支持 lineup / profile 类型
CREATE OR REPLACE FUNCTION public.toggle_like(
  p_user_id UUID, p_target_type TEXT, p_target_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  existing UUID;
BEGIN
  SELECT id INTO existing FROM public.likes
    WHERE user_id = p_user_id AND target_type = p_target_type AND target_id = p_target_id;
  IF existing IS NOT NULL THEN
    DELETE FROM public.likes WHERE id = existing;
    IF p_target_type = 'tactic' THEN
      UPDATE public.tactical_shares SET like_count = GREATEST(like_count - 1, 0) WHERE id = p_target_id;
    ELSIF p_target_type = 'post' THEN
      UPDATE public.posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = p_target_id;
    ELSIF p_target_type = 'lineup' THEN
      UPDATE public.lineups SET like_count = GREATEST(like_count - 1, 0) WHERE id = p_target_id;
    END IF;
    RETURN false;
  ELSE
    INSERT INTO public.likes (user_id, target_type, target_id) VALUES (p_user_id, p_target_type, p_target_id);
    IF p_target_type = 'tactic' THEN
      UPDATE public.tactical_shares SET like_count = like_count + 1 WHERE id = p_target_id;
    ELSIF p_target_type = 'post' THEN
      UPDATE public.posts SET like_count = like_count + 1 WHERE id = p_target_id;
    ELSIF p_target_type = 'lineup' THEN
      UPDATE public.lineups SET like_count = like_count + 1 WHERE id = p_target_id;
    END IF;
    RETURN true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 用户统计一次性查询
CREATE OR REPLACE FUNCTION public.get_profile_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  tc INT; pc INT; lc INT; tl INT; fc INT;
BEGIN
  SELECT COUNT(*)::INT INTO tc FROM public.tactical_shares WHERE user_id = p_user_id;
  SELECT COUNT(*)::INT INTO pc FROM public.posts WHERE user_id = p_user_id;
  SELECT COUNT(*)::INT INTO lc FROM public.lineups WHERE user_id = p_user_id;
  SELECT COALESCE(SUM(like_count),0)::INT INTO tl FROM (
    SELECT like_count FROM public.tactical_shares WHERE user_id = p_user_id
    UNION ALL SELECT like_count FROM public.posts WHERE user_id = p_user_id
    UNION ALL SELECT like_count FROM public.lineups WHERE user_id = p_user_id
  ) t;
  SELECT favorite_count INTO fc FROM public.profiles WHERE id = p_user_id;
  RETURN json_build_object(
    'tacticCount', tc, 'postCount', pc, 'lineupCount', lc,
    'totalLikes', tl, 'favoriteCount', COALESCE(fc,0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_favorite_count(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles SET favorite_count = COALESCE(favorite_count,0) + 1 WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decrement_favorite_count(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles SET favorite_count = GREATEST(COALESCE(favorite_count,0) - 1, 0) WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创作者排行榜 RPC
CREATE OR REPLACE FUNCTION public.creator_ranking(p_limit INT DEFAULT 30, p_sort_by TEXT DEFAULT 'creation')
RETURNS TABLE(
  user_id UUID, username TEXT, avatar_url TEXT,
  creation_count BIGINT, total_likes BIGINT,
  follower_count BIGINT, favorite_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (
    SELECT
      p.id AS user_id,
      p.username,
      p.avatar_url,
      (COALESCE(tc.cnt, 0) + COALESCE(lc.cnt, 0) + COALESCE(pc.cnt, 0)) AS creation_count,
      COALESCE(tl.likes, 0) AS total_likes,
      COALESCE(fc.followers, 0) AS follower_count,
      COALESCE(p.favorite_count, 0) AS favorite_count
    FROM profiles p
    LEFT JOIN (SELECT user_id, COUNT(*) AS cnt FROM tactical_shares GROUP BY user_id) tc ON tc.user_id = p.id
    LEFT JOIN (SELECT user_id, COUNT(*) AS cnt FROM lineups GROUP BY user_id) lc ON lc.user_id = p.id
    LEFT JOIN (SELECT user_id, COUNT(*) AS cnt FROM posts GROUP BY user_id) pc ON pc.user_id = p.id
    LEFT JOIN (
      SELECT user_id, SUM(tc) AS likes FROM (
        SELECT user_id, SUM(like_count) AS tc FROM tactical_shares GROUP BY user_id
        UNION ALL SELECT user_id, SUM(like_count) FROM posts GROUP BY user_id
        UNION ALL SELECT user_id, SUM(like_count) FROM lineups GROUP BY user_id
      ) t GROUP BY user_id
    ) tl ON tl.user_id = p.id
    LEFT JOIN (SELECT following_id, COUNT(*) AS followers FROM follows GROUP BY following_id) fc ON fc.following_id = p.id
  ) r
  ORDER BY
    CASE WHEN p_sort_by = 'likes' THEN r.total_likes END DESC,
    CASE WHEN p_sort_by = 'follows' THEN r.follower_count END DESC,
    CASE WHEN p_sort_by = 'favs' THEN r.favorite_count END DESC,
    r.creation_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 知识蒸馏 — 从对话中提取战术洞察
CREATE TABLE IF NOT EXISTS public.knowledge_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT DEFAULT 'conversation',
  category TEXT DEFAULT '战术',
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.knowledge_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ki_read" ON public.knowledge_insights FOR SELECT USING (true);
CREATE POLICY "ki_insert" ON public.knowledge_insights FOR INSERT WITH CHECK (true);
CREATE POLICY "ki_update" ON public.knowledge_insights FOR UPDATE USING (true);

-- 知识贡献（用户提交）
CREATE TABLE IF NOT EXISTS public.knowledge_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT DEFAULT '战术',
  content TEXT NOT NULL,
  source TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.knowledge_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kc_read" ON public.knowledge_contributions FOR SELECT USING (true);
CREATE POLICY "kc_insert" ON public.knowledge_contributions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "kc_update" ON public.knowledge_contributions FOR UPDATE USING (true);

-- 匿名对话日志（用于提升服务质量）
CREATE TABLE IF NOT EXISTS public.conversation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_hash TEXT NOT NULL,
  model TEXT DEFAULT '',
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  context JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_clog_hash ON public.conversation_logs(user_hash);
ALTER TABLE public.conversation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clog_insert" ON public.conversation_logs FOR INSERT WITH CHECK (true);

-- 开发者标识
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 关注列表隐私
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_follows BOOLEAN DEFAULT true;

-- ================================================================
-- 通用内容收藏（战术/帖子/点位）
-- ================================================================

ALTER TABLE public.tactical_shares ADD COLUMN IF NOT EXISTS favorite_count INT DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS favorite_count INT DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.content_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, target_type, target_id)
);

ALTER TABLE public.content_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cf_read" ON public.content_favorites FOR SELECT USING (true);
CREATE POLICY "cf_insert" ON public.content_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cf_delete" ON public.content_favorites FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.toggle_content_fav(p_user_id UUID, p_target_type TEXT, p_target_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  existing UUID;
  tbl TEXT;
BEGIN
  SELECT user_id INTO existing FROM public.content_favorites
    WHERE user_id = p_user_id AND target_type = p_target_type AND target_id = p_target_id;
  IF existing IS NOT NULL THEN
    DELETE FROM public.content_favorites WHERE user_id = p_user_id AND target_type = p_target_type AND target_id = p_target_id;
    IF p_target_type = 'tactic' THEN UPDATE public.tactical_shares SET favorite_count = GREATEST(favorite_count - 1, 0) WHERE id = p_target_id;
    ELSIF p_target_type = 'post' THEN UPDATE public.posts SET favorite_count = GREATEST(favorite_count - 1, 0) WHERE id = p_target_id;
    ELSIF p_target_type = 'lineup' THEN UPDATE public.lineups SET favorite_count = GREATEST(favorite_count - 1, 0) WHERE id = p_target_id;
    END IF;
    RETURN false;
  ELSE
    INSERT INTO public.content_favorites (user_id, target_type, target_id) VALUES (p_user_id, p_target_type, p_target_id);
    IF p_target_type = 'tactic' THEN UPDATE public.tactical_shares SET favorite_count = favorite_count + 1 WHERE id = p_target_id;
    ELSIF p_target_type = 'post' THEN UPDATE public.posts SET favorite_count = favorite_count + 1 WHERE id = p_target_id;
    ELSIF p_target_type = 'lineup' THEN UPDATE public.lineups SET favorite_count = favorite_count + 1 WHERE id = p_target_id;
    END IF;
    RETURN true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 点位收藏（旧，保留兼容）
-- ================================================================

ALTER TABLE public.lineups ADD COLUMN IF NOT EXISTS favorite_count INT DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.lineup_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lineup_id UUID NOT NULL REFERENCES lineups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, lineup_id)
);

ALTER TABLE public.lineup_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lf_read" ON public.lineup_favorites FOR SELECT USING (true);
CREATE POLICY "lf_insert" ON public.lineup_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lf_delete" ON public.lineup_favorites FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.toggle_lineup_fav(p_user_id UUID, p_lineup_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  existing UUID;
BEGIN
  SELECT user_id INTO existing FROM public.lineup_favorites
    WHERE user_id = p_user_id AND lineup_id = p_lineup_id;
  IF existing IS NOT NULL THEN
    DELETE FROM public.lineup_favorites WHERE user_id = p_user_id AND lineup_id = p_lineup_id;
    UPDATE public.lineups SET favorite_count = GREATEST(favorite_count - 1, 0) WHERE id = p_lineup_id;
    RETURN false;
  ELSE
    INSERT INTO public.lineup_favorites (user_id, lineup_id) VALUES (p_user_id, p_lineup_id);
    UPDATE public.lineups SET favorite_count = favorite_count + 1 WHERE id = p_lineup_id;
    RETURN true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 多人实时协作 (已废弃，表保留在数据库)
-- ================================================================
