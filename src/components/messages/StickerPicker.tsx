import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Package, Loader2, ShoppingBag } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStickers } from "@/hooks/useStickers";
import { cn } from "@/lib/utils";

interface StickerPickerProps {
  open: boolean;
  onClose: () => void;
  onSelectSticker: (stickerUrl: string) => void;
}

export const StickerPicker = ({ open, onClose, onSelectSticker }: StickerPickerProps) => {
  const { myPacks, ownedPacks, publicPacks, isLoading } = useStickers();
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);

  // Combine all accessible packs (owned + created)
  const allAccessiblePacks = useMemo(() => {
    const ownedPackIds = new Set(ownedPacks.map((p) => p.id));
    const myPackIds = new Set(myPacks.map((p) => p.id));
    
    // Get unique packs from myPacks and ownedPacks
    const combined = [...myPacks];
    ownedPacks.forEach((pack) => {
      if (!myPackIds.has(pack.id)) {
        combined.push(pack);
      }
    });
    
    return combined;
  }, [myPacks, ownedPacks]);

  // Get stickers for selected pack
  const currentStickers = useMemo(() => {
    if (!selectedPackId) {
      // Show all stickers from accessible packs
      return allAccessiblePacks.flatMap((pack) => pack.stickers || []);
    }
    const pack = allAccessiblePacks.find((p) => p.id === selectedPackId);
    return pack?.stickers || [];
  }, [selectedPackId, allAccessiblePacks]);

  const handleStickerClick = (stickerUrl: string) => {
    onSelectSticker(stickerUrl);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl p-0">
        <SheetHeader className="px-4 py-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">Stickers</SheetTitle>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : allAccessiblePacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <ShoppingBag className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground mb-1">Nenhum sticker disponível</p>
            <p className="text-sm text-muted-foreground">
              Compre pacotes de stickers na loja ou crie os seus próprios!
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Pack tabs */}
            <ScrollArea className="flex-shrink-0 border-b border-border/50">
              <div className="flex gap-2 px-4 py-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedPackId(null)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                    selectedPackId === null
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  <Package className="w-4 h-4" />
                  Todos
                </motion.button>
                {allAccessiblePacks.map((pack) => (
                  <motion.button
                    key={pack.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedPackId(pack.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                      selectedPackId === pack.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {pack.cover_url ? (
                      <img
                        src={pack.cover_url}
                        alt={pack.name}
                        className="w-5 h-5 rounded object-cover"
                      />
                    ) : (
                      <Package className="w-4 h-4" />
                    )}
                    {pack.name}
                  </motion.button>
                ))}
              </div>
            </ScrollArea>

            {/* Stickers grid */}
            <ScrollArea className="flex-1 px-4 py-4">
              {currentStickers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <p className="text-muted-foreground">Nenhum sticker neste pacote</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  <AnimatePresence mode="popLayout">
                    {currentStickers.map((sticker, index) => (
                      <motion.button
                        key={sticker.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ delay: index * 0.02 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleStickerClick(sticker.image_url)}
                        className="aspect-square p-2 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors"
                      >
                        <img
                          src={sticker.image_url}
                          alt={sticker.emoji || "Sticker"}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
