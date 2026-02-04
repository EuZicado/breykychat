import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useStickers } from "@/hooks/useStickers";
import { Loader2, Upload, ImageIcon, DollarSign, X } from "lucide-react";
import { toast } from "sonner";

interface CreateStickerPackSheetProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const CreateStickerPackSheet = ({
  open,
  onClose,
  onCreated,
}: CreateStickerPackSheetProps) => {
  const { createPack } = useStickers();
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [isPublic, setIsPublic] = useState(true);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Imagem muito grande. Máximo 5MB");
        return;
      }
      setCoverFile(file);
      const reader = new FileReader();
      reader.onload = () => setCoverPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setIsCreating(true);

    try {
      const priceValue = parseFloat(price) || 0;
      const { error } = await createPack(name, description, priceValue, isPublic, coverFile || undefined);

      if (error) {
        throw error;
      }

      // Reset form
      setName("");
      setDescription("");
      setPrice("0");
      setIsPublic(true);
      setCoverFile(null);
      setCoverPreview(null);

      onCreated();
    } catch (error: any) {
      console.error("Error creating pack:", error);
      toast.error(error.message || "Erro ao criar pack");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl font-bold">Criar Pack de Stickers</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto pb-8">
          {/* Cover Image */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Capa do Pack</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverSelect}
              className="hidden"
            />
            
            {coverPreview ? (
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="relative w-32 h-32 rounded-2xl overflow-hidden mx-auto"
              >
                <img
                  src={coverPreview}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={handleRemoveCover}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </motion.div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 rounded-2xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">Adicionar capa</span>
              </button>
            )}
          </div>

          {/* Name */}
          <div>
            <Label htmlFor="name" className="text-sm font-medium mb-2 block">
              Nome do Pack *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Memes Brasileiros"
              maxLength={50}
              className="rounded-xl"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-sm font-medium mb-2 block">
              Descrição
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva seu pack de stickers..."
              maxLength={200}
              rows={3}
              className="rounded-xl resize-none"
            />
          </div>

          {/* Price */}
          <div>
            <Label htmlFor="price" className="text-sm font-medium mb-2 block">
              Preço (R$)
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="rounded-xl pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {parseFloat(price) === 0 ? "Pack gratuito" : `Você recebe 50%: R$ ${(parseFloat(price) * 0.5).toFixed(2)}`}
            </p>
          </div>

          {/* Public Toggle */}
          <div className="flex items-center justify-between bg-muted/30 rounded-xl p-4">
            <div>
              <p className="font-medium">Pack Público</p>
              <p className="text-xs text-muted-foreground">
                {isPublic ? "Visível na loja para todos" : "Apenas para uso pessoal"}
              </p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          {isPublic && (
            <div className="bg-amber-500/10 rounded-xl p-4">
              <p className="text-sm text-amber-400">
                ⚠️ Packs públicos precisam de aprovação antes de aparecer na loja.
              </p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || isCreating}
            className="w-full rounded-xl h-12"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Criando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Criar Pack
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
