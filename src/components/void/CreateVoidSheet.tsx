import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Type, Clock, Loader2, Image as ImageIcon, Sparkles } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useVoid } from "@/hooks/useVoid";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CreateVoidSheetProps {
  open: boolean;
  onClose: () => void;
}

const durationOptions = [
  { value: 6, label: "6h" },
  { value: 12, label: "12h" },
  { value: 24, label: "24h" },
];

export const CreateVoidSheet = ({ open, onClose }: CreateVoidSheetProps) => {
  const { createVoidContent } = useVoid();
  const [contentType, setContentType] = useState<"text" | "image">("text");
  const [textContent, setTextContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(24);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setContentType("image");
    }
  };

  const handleSubmit = async () => {
    if (contentType === "text" && !textContent.trim()) {
      toast.error("Digite algo para compartilhar");
      return;
    }
    if (contentType === "image" && !selectedFile) {
      toast.error("Selecione uma imagem");
      return;
    }

    setIsSubmitting(true);
    const { error } = await createVoidContent(
      contentType,
      duration,
      textContent || undefined,
      selectedFile || undefined
    );

    if (error) {
      toast.error("Erro ao criar conteúdo");
    } else {
      toast.success("Publicado no Void!");
      handleClose();
    }
    setIsSubmitting(false);
  };

  const handleClose = () => {
    setTextContent("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setContentType("text");
    setDuration(24);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <button onClick={handleClose} className="p-2 -ml-2">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-semibold">Novo Void</span>
          </div>
          <Button
            variant="neon"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || (contentType === "text" ? !textContent.trim() : !selectedFile)}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publicar"}
          </Button>
        </div>

        {/* Content Type Selector */}
        <div className="flex gap-2 p-4">
          <button
            onClick={() => setContentType("text")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all",
              contentType === "text" ? "bg-primary text-primary-foreground" : "bg-muted"
            )}
          >
            <Type className="w-4 h-4" />
            <span className="text-sm font-medium">Texto</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all",
              contentType === "image" ? "bg-primary text-primary-foreground" : "bg-muted"
            )}
          >
            <ImageIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Imagem</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 px-4 pb-4">
          <AnimatePresence mode="wait">
            {contentType === "text" ? (
              <motion.div
                key="text"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Compartilhe um pensamento efêmero..."
                  className="min-h-[200px] bg-muted/30 border-0 text-lg resize-none"
                  maxLength={500}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground text-right mt-2">
                  {textContent.length}/500
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="image"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {previewUrl ? (
                  <div className="relative rounded-2xl overflow-hidden aspect-[3/4]">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      className="absolute top-3 right-3 p-2 rounded-full bg-background/80 backdrop-blur"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-[3/4] rounded-2xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-3 hover:border-primary/50 transition-colors"
                  >
                    <Camera className="w-12 h-12 text-muted-foreground" />
                    <span className="text-muted-foreground">Toque para selecionar</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Duration Selector */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Desaparece em:</span>
          </div>
          <div className="flex gap-2">
            {durationOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDuration(opt.value)}
                className={cn(
                  "flex-1 py-3 rounded-xl font-medium transition-all",
                  duration === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </SheetContent>
    </Sheet>
  );
};
