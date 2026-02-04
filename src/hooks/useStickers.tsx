import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface StickerPack {
  id: string;
  creator_id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  price: number;
  is_public: boolean;
  is_approved: boolean;
  sales_count: number;
  created_at: string;
  stickers?: Sticker[];
  creator?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  is_owned?: boolean;
}

interface Sticker {
  id: string;
  pack_id: string;
  image_url: string;
  emoji: string | null;
}

export const useStickers = () => {
  const { user } = useAuth();
  const [publicPacks, setPublicPacks] = useState<StickerPack[]>([]);
  const [myPacks, setMyPacks] = useState<StickerPack[]>([]);
  const [ownedPacks, setOwnedPacks] = useState<StickerPack[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPublicPacks = useCallback(async () => {
    const { data, error } = await supabase
      .from("sticker_packs")
      .select(`
        *,
        stickers (*),
        creator:creator_id (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq("is_public", true)
      .eq("is_approved", true)
      .order("sales_count", { ascending: false });

    if (error) {
      console.error("Error fetching public packs:", error);
      return;
    }

    // Check ownership
    if (user) {
      const { data: purchases } = await supabase
        .from("user_purchases")
        .select("pack_id")
        .eq("user_id", user.id);

      const ownedPackIds = new Set(purchases?.map((p) => p.pack_id) || []);

      data?.forEach((pack: any) => {
        pack.is_owned = ownedPackIds.has(pack.id) || pack.creator_id === user.id;
      });
    }

    setPublicPacks(data || []);
  }, [user]);

  const fetchMyPacks = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("sticker_packs")
      .select(`
        *,
        stickers (*)
      `)
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching my packs:", error);
      return;
    }

    setMyPacks(data || []);
  }, [user]);

  const fetchOwnedPacks = useCallback(async () => {
    if (!user) return;

    const { data: purchases, error: purchasesError } = await supabase
      .from("user_purchases")
      .select("pack_id")
      .eq("user_id", user.id);

    if (purchasesError || !purchases?.length) {
      setOwnedPacks([]);
      return;
    }

    const packIds = purchases.map((p) => p.pack_id);

    const { data, error } = await supabase
      .from("sticker_packs")
      .select(`
        *,
        stickers (*),
        creator:creator_id (
          username,
          display_name,
          avatar_url
        )
      `)
      .in("id", packIds);

    if (error) {
      console.error("Error fetching owned packs:", error);
      return;
    }

    setOwnedPacks(data || []);
  }, [user]);

  useEffect(() => {
    const fetchAll = async () => {
      await Promise.all([fetchPublicPacks(), fetchMyPacks(), fetchOwnedPacks()]);
      setIsLoading(false);
    };
    fetchAll();
  }, [fetchPublicPacks, fetchMyPacks, fetchOwnedPacks]);

  const createPack = async (
    name: string,
    description: string,
    price: number,
    isPublic: boolean,
    coverFile?: File
  ) => {
    if (!user) return { error: new Error("Not authenticated") };

    let coverUrl = null;

    if (coverFile) {
      const fileName = `${user.id}/${Date.now()}-cover`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("stickers")
        .upload(fileName, coverFile);

      if (uploadError) {
        return { error: uploadError };
      }

      const { data: urlData } = supabase.storage
        .from("stickers")
        .getPublicUrl(uploadData.path);

      coverUrl = urlData.publicUrl;
    }

    const { data, error } = await supabase
      .from("sticker_packs")
      .insert({
        creator_id: user.id,
        name,
        description,
        price,
        is_public: isPublic,
        cover_url: coverUrl,
      })
      .select()
      .single();

    if (!error) {
      await fetchMyPacks();
    }

    return { data, error };
  };

  const addStickerToPack = async (packId: string, file: File, emoji?: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    const fileName = `${user.id}/${packId}/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("stickers")
      .upload(fileName, file);

    if (uploadError) {
      return { error: uploadError };
    }

    const { data: urlData } = supabase.storage
      .from("stickers")
      .getPublicUrl(uploadData.path);

    const { error } = await supabase.from("stickers").insert({
      pack_id: packId,
      image_url: urlData.publicUrl,
      emoji: emoji || null,
    });

    if (!error) {
      await fetchMyPacks();
    }

    return { error };
  };

  const compressImage = async (file: File, maxWidth: number = 512): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const img = new Image();

      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: "image/webp" }));
            } else {
              resolve(file);
            }
          },
          "image/webp",
          0.8
        );
      };

      img.src = URL.createObjectURL(file);
    });
  };

  return {
    publicPacks,
    myPacks,
    ownedPacks,
    isLoading,
    createPack,
    addStickerToPack,
    compressImage,
    refreshPublic: fetchPublicPacks,
    refreshMy: fetchMyPacks,
    refreshOwned: fetchOwnedPacks,
  };
};
