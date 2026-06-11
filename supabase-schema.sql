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

-- 增加评论数
CREATE OR REPLACE FUNCTION public.increment_comment_count(share_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.tactical_shares SET comment_count = comment_count + 1 WHERE id = share_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
