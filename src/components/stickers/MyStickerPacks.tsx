import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Plus, Upload, Loader2, MoreHorizontal, Eye, EyeOff, Trash2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStickers } from "@/hooks/useStickers";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Sticker {
  id: string;
  image_url: string;
  emoji: string | null;
}

interface StickerPack {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  price: number;
  is_public: boolean;
  is_approved: boolean;
  sales_count: number;
  stickers?: Sticker[];
}

interface MyStickerPacksProps {
  packs: StickerPack[];
  onRefresh: () => void;
}

export const MyStickerPacks = ({ packs, onRefresh }: MyStickerPacksProps) => {
  const { addStickerToPack, compressImage } = useStickers();
  const [expandedPackId, setExpandedPackId] = useState<string | null>(null);
  const [uploadingToPackId, setUploadingToPackId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedPackId) return;

    setUploadingToPackId(selectedPackId);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressed = await compressImage(file);
        const { error } = await addStickerToPack(selectedPackId, compressed);

        if (error) {
          throw error;
        }
      }

      toast.success(`${files.length} sticker(s) adicionado(s)!`);
      onRefresh();
    } catch (error: any) {
      console.error("Error uploading stickers:", error);
      toast.error(error.message || "Erro ao adicionar stickers");
    } finally {
      setUploadingToPackId(null);
      setSelectedPackId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleAddStickers = (packId: string) => {
    setSelectedPackId(packId);
    fileInputRef.current?.click();
  };

  if (packs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 text-center px-8"
      >
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <Package className="w-10 h-10 text-primary" />
        </div>
        <p className="text-xl font-semibold mb-2">Crie seu primeiro pack</p>
        <p className="text-muted-foreground mb-6 max-w-[280px]">
          Crie packs de stickers personalizados e compartilhe com outros usuários
        </p>
      </motion.div>
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="space-y-4">
        {packs.map((pack, index) => {
          const isExpanded = expandedPackId === pack.id;
          const isUploading = uploadingToPackId === pack.id;

          return (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-muted/30 rounded-2xl overflow-hidden"
            >
              {/* Pack Header */}
              <div
                className="p-4 flex items-center gap-3 cursor-pointer"
                onClick={() => setExpandedPackId(isExpanded ? null : pack.id)}
              >
                {pack.cover_url ? (
                  <img
                    src={pack.cover_url}
                    alt={pack.name}
                    className="w-14 h-14 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                    <Package className="w-7 h-7 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{pack.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant={pack.is_approved ? "default" : "secondary"}
                      className="rounded-full text-[10px]"
                    >
                      {pack.is_approved ? "Aprovado" : "Pendente"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded-full text-[10px] gap-1"
                    >
                      {pack.is_public ? (
                        <>
                          <Eye className="w-3 h-3" /> Público
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3" /> Privado
                        </>
                      )}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {pack.stickers?.length || 0} stickers
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleAddStickers(pack.id)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Stickers
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir Pack
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Expanded Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border/50"
                  >
                    <div className="p-4">
                      {pack.stickers && pack.stickers.length > 0 ? (
                        <div className="grid grid-cols-5 gap-2">
                          {pack.stickers.map((sticker) => (
                            <motion.div
                              key={sticker.id}
                              whileHover={{ scale: 1.05 }}
                              className="aspect-square rounded-xl bg-muted/50 p-2"
                            >
                              <img
                                src={sticker.image_url}
                                alt={sticker.emoji || "Sticker"}
                                className="w-full h-full object-contain"
                              />
                            </motion.div>
                          ))}

                          {/* Add Sticker Button */}
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            onClick={() => handleAddStickers(pack.id)}
                            disabled={isUploading}
                            className="aspect-square rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50 transition-colors"
                          >
                            {isUploading ? (
                              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            ) : (
                              <Plus className="w-5 h-5 text-muted-foreground" />
                            )}
                          </motion.button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-8">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            Nenhum sticker ainda
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddStickers(pack.id)}
                            disabled={isUploading}
                            className="rounded-full gap-2"
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                Adicionar Stickers
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </>
  );
};
