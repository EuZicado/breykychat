import { motion } from "framer-motion";
import { Package, Star, Crown, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface StickerPack {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  price: number;
  sales_count: number;
  stickers?: { id: string; image_url: string }[];
  creator?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  is_owned?: boolean;
}

interface StickerPackCardProps {
  pack: StickerPack;
  index: number;
  onPurchase: (packId: string) => void;
  isPurchasing: boolean;
}

export const StickerPackCard = ({
  pack,
  index,
  onPurchase,
  isPurchasing,
}: StickerPackCardProps) => {
  const isFree = pack.price === 0;
  const isPopular = pack.sales_count >= 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-muted/30 rounded-2xl overflow-hidden"
    >
      {/* Cover */}
      <div className="relative aspect-square">
        {pack.cover_url ? (
          <img
            src={pack.cover_url}
            alt={pack.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Package className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isPopular && (
            <Badge className="bg-amber-500/90 text-white rounded-full gap-1 text-[10px]">
              <Crown className="w-3 h-3" />
              Popular
            </Badge>
          )}
          {isFree && (
            <Badge className="bg-green-500/90 text-white rounded-full text-[10px]">
              Grátis
            </Badge>
          )}
        </div>

        {/* Owned Badge */}
        {pack.is_owned && (
          <div className="absolute top-2 right-2">
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
          </div>
        )}

        {/* Preview stickers */}
        {pack.stickers && pack.stickers.length > 0 && (
          <div className="absolute bottom-2 left-2 right-2 flex gap-1">
            {pack.stickers.slice(0, 4).map((sticker) => (
              <div
                key={sticker.id}
                className="w-8 h-8 rounded-lg bg-background/80 backdrop-blur-sm p-1"
              >
                <img
                  src={sticker.image_url}
                  alt=""
                  className="w-full h-full object-contain"
                />
              </div>
            ))}
            {pack.stickers.length > 4 && (
              <div className="w-8 h-8 rounded-lg bg-background/80 backdrop-blur-sm flex items-center justify-center">
                <span className="text-xs font-bold">+{pack.stickers.length - 4}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-sm truncate">{pack.name}</h3>
        
        {pack.creator && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            por @{pack.creator.username || "anônimo"}
          </p>
        )}

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{pack.sales_count} vendas</span>
          </div>

          {pack.is_owned ? (
            <Badge variant="secondary" className="rounded-full text-[10px]">
              Adquirido
            </Badge>
          ) : (
            <Button
              size="sm"
              onClick={() => onPurchase(pack.id)}
              disabled={isPurchasing}
              className="rounded-full h-7 text-xs px-3"
            >
              {isPurchasing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : isFree ? (
                "Adicionar"
              ) : (
                `R$ ${pack.price.toFixed(2)}`
              )}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
