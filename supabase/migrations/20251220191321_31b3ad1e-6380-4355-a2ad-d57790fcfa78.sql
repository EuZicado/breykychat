-- Create enums
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.verification_type AS ENUM ('none', 'blue', 'gold', 'staff');
CREATE TYPE public.content_type AS ENUM ('video', 'image', 'text');
CREATE TYPE public.transaction_type AS ENUM ('purchase', 'withdrawal', 'commission');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'failed');

-- Create user_roles table (critical for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create has_role function (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create interests table
CREATE TABLE public.interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_type verification_type DEFAULT 'none',
  wallet_balance DECIMAL(10,2) DEFAULT 0.00,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  onboarding_step INTEGER DEFAULT 1,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_interests junction table
CREATE TABLE public.user_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  interest_id UUID REFERENCES public.interests(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, interest_id)
);

ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

-- Create posts table
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content_url TEXT,
  content_type content_type NOT NULL DEFAULT 'image',
  description TEXT,
  tags TEXT[],
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  engagement_score DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Create post_likes table
CREATE TABLE public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- Create ephemeral_content table (The Void)
CREATE TABLE public.ephemeral_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content_url TEXT,
  content_type content_type NOT NULL DEFAULT 'text',
  text_content TEXT,
  duration_hours INTEGER NOT NULL DEFAULT 24,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.ephemeral_content ENABLE ROW LEVEL SECURITY;

-- Create conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Create conversation_participants table
CREATE TABLE public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (conversation_id, user_id)
);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  sticker_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create sticker_packs table
CREATE TABLE public.sticker_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  price DECIMAL(10,2) DEFAULT 0.00,
  is_public BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  sales_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.sticker_packs ENABLE ROW LEVEL SECURITY;

-- Create stickers table
CREATE TABLE public.stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID REFERENCES public.sticker_packs(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  emoji TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;

-- Create user_purchases table
CREATE TABLE public.user_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  pack_id UUID REFERENCES public.sticker_packs(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, pack_id)
);

ALTER TABLE public.user_purchases ENABLE ROW LEVEL SECURITY;

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type transaction_type NOT NULL,
  status transaction_status DEFAULT 'pending',
  reference_id TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create follows table
CREATE TABLE public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (follower_id, following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Enable realtime for messages and ephemeral_content
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ephemeral_content;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('stickers', 'stickers', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('void', 'void', true);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for interests
CREATE POLICY "Anyone can view interests" ON public.interests
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage interests" ON public.interests
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Anyone can view profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for user_interests
CREATE POLICY "Anyone can view user interests" ON public.user_interests
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own interests" ON public.user_interests
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for posts
CREATE POLICY "Anyone can view posts" ON public.posts
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own posts" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own posts" ON public.posts
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own posts" ON public.posts
  FOR DELETE USING (auth.uid() = creator_id);

-- RLS Policies for post_likes
CREATE POLICY "Anyone can view likes" ON public.post_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like posts" ON public.post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts" ON public.post_likes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for ephemeral_content
CREATE POLICY "Anyone can view non-expired void content" ON public.ephemeral_content
  FOR SELECT USING (expires_at > NOW());

CREATE POLICY "Users can create void content" ON public.ephemeral_content
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own void content" ON public.ephemeral_content
  FOR DELETE USING (auth.uid() = creator_id);

-- RLS Policies for conversations
CREATE POLICY "Users can view their conversations" ON public.conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (true);

-- RLS Policies for conversation_participants
CREATE POLICY "Users can view participants of their conversations" ON public.conversation_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join conversations" ON public.conversation_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages" ON public.messages
  FOR DELETE USING (auth.uid() = sender_id);

-- RLS Policies for sticker_packs
CREATE POLICY "Anyone can view public approved sticker packs" ON public.sticker_packs
  FOR SELECT USING (is_public = true AND is_approved = true);

CREATE POLICY "Users can view their own sticker packs" ON public.sticker_packs
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can create sticker packs" ON public.sticker_packs
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own sticker packs" ON public.sticker_packs
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own sticker packs" ON public.sticker_packs
  FOR DELETE USING (auth.uid() = creator_id);

-- RLS Policies for stickers
CREATE POLICY "Anyone can view stickers from accessible packs" ON public.stickers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sticker_packs
      WHERE id = pack_id AND (is_public = true AND is_approved = true OR creator_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage stickers in their packs" ON public.stickers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.sticker_packs
      WHERE id = pack_id AND creator_id = auth.uid()
    )
  );

-- RLS Policies for user_purchases
CREATE POLICY "Users can view their own purchases" ON public.user_purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create purchases" ON public.user_purchases
  FOR INSERT WITH CHECK (true);

-- RLS Policies for transactions
CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions" ON public.transactions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update transactions" ON public.transactions
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for follows
CREATE POLICY "Anyone can view follows" ON public.follows
  FOR SELECT USING (true);

CREATE POLICY "Users can follow" ON public.follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" ON public.follows
  FOR DELETE USING (auth.uid() = follower_id);

-- Storage policies for avatars
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for banners
CREATE POLICY "Anyone can view banners" ON storage.objects
  FOR SELECT USING (bucket_id = 'banners');

CREATE POLICY "Users can upload their own banner" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own banner" ON storage.objects
  FOR UPDATE USING (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own banner" ON storage.objects
  FOR DELETE USING (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for posts
CREATE POLICY "Anyone can view posts media" ON storage.objects
  FOR SELECT USING (bucket_id = 'posts');

CREATE POLICY "Users can upload posts media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their posts media" ON storage.objects
  FOR DELETE USING (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for stickers
CREATE POLICY "Anyone can view stickers" ON storage.objects
  FOR SELECT USING (bucket_id = 'stickers');

CREATE POLICY "Users can upload stickers" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'stickers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their stickers" ON storage.objects
  FOR DELETE USING (bucket_id = 'stickers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for void content
CREATE POLICY "Anyone can view void content" ON storage.objects
  FOR SELECT USING (bucket_id = 'void');

CREATE POLICY "Users can upload void content" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'void' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their void content" ON storage.objects
  FOR DELETE USING (bucket_id = 'void' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sticker_packs_updated_at
  BEFORE UPDATE ON public.sticker_packs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create the Lone-Algorithm feed function
CREATE OR REPLACE FUNCTION public.get_ranked_feed(
  p_user_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  creator_id UUID,
  content_url TEXT,
  content_type content_type,
  description TEXT,
  tags TEXT[],
  likes_count INTEGER,
  comments_count INTEGER,
  shares_count INTEGER,
  saves_count INTEGER,
  engagement_score DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE,
  creator_username TEXT,
  creator_display_name TEXT,
  creator_avatar_url TEXT,
  creator_is_verified BOOLEAN,
  creator_verification_type verification_type,
  rank_score DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  ORDER BY rank_score DESC, p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Create function to check username availability
CREATE OR REPLACE FUNCTION public.check_username_available(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE LOWER(username) = LOWER(p_username)
  );
END;
$$;

-- Insert default interests
INSERT INTO public.interests (name, icon) VALUES
  ('Música', '🎵'),
  ('Games', '🎮'),
  ('Tecnologia', '💻'),
  ('Arte', '🎨'),
  ('Moda', '👗'),
  ('Esportes', '⚽'),
  ('Fitness', '💪'),
  ('Culinária', '🍳'),
  ('Viagens', '✈️'),
  ('Fotografia', '📷'),
  ('Cinema', '🎬'),
  ('Livros', '📚'),
  ('Natureza', '🌿'),
  ('Pets', '🐾'),
  ('DIY', '🔧'),
  ('Empreendedorismo', '💼');