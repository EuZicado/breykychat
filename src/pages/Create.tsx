import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Image, Type, Video, Clock, X, ChevronLeft, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useVoid } from "@/hooks/useVoid";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const createOptions = [
  {
    id: "post",
    icon: Image,
    label: "Foto",
    description: "Publicação permanente",
  },
  {
    id: "video",
    icon: Video,
    label: "Vídeo",
    description: "Vídeo curto",
  },
  {
    id: "void",
    icon: Clock,
    label: "Void",
    description: "Desaparece em 24h",
  },
  {
    id: "text",
    icon: Type,
    label: "Texto",
    description: "Pensamento rápido",
  },
];

const Create = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { createVoidContent } = useVoid();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selected, setSelected] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [voidDuration, setVoidDuration] = useState(24);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"select" | "edit">("select");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
      setStep("edit");
    }
  };

  const handleOptionSelect = (optionId: string) => {
    setSelected(optionId);
    if (optionId === "text") {
      setStep("edit");
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      if (selected === "void" || selected === "text") {
        const contentType = selected === "text" ? "text" : file?.type.startsWith("video") ? "video" : "image";
        const { error } = await createVoidContent(
          contentType,
          voidDuration,
          selected === "text" ? description : undefined,
          file || undefined
        );

        if (error) throw error;
        toast.success("Void criado com sucesso!");
        navigate("/void");
      } else {
        // Regular post
        if (!file) {
          toast.error("Selecione um arquivo");
          setIsSubmitting(false);
          return;
        }

        const fileName = `${user.id}/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("posts")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("posts")
          .getPublicUrl(uploadData.path);

        const contentType = file.type.startsWith("video") ? "video" : "image";

        const { error: postError } = await supabase.from("posts").insert({
          creator_id: user.id,
          content_url: urlData.publicUrl,
          content_type: contentType,
          description: description || null,
        });

        if (postError) throw postError;

        toast.success("Publicação criada!");
        navigate("/");
      }
    } catch (error: any) {
      console.error("Error creating content:", error);
      toast.error(error.message || "Erro ao criar conteúdo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelected(null);
    setFile(null);
    setPreview(null);
    setDescription("");
    setStep("select");
  };

  if (authLoading) {
    return (
      <AppLayout hideNav>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout hideNav>
      <input
        ref={fileInputRef}
        type="file"
        accept={selected === "video" ? "video/*" : "image/*"}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* iOS Navigation Bar */}
      <header className="ios-nav-bar">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => step === "edit" ? resetForm() : navigate(-1)}
            className="ios-button flex items-center gap-0"
          >
            <ChevronLeft className="w-6 h-6" />
            <span>Voltar</span>
          </button>

          <h1 className="text-[17px] font-semibold">
            {step === "select" ? "Nova Publicação" : "Editar"}
          </h1>

          {step === "edit" ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || (!file && selected !== "text") || (selected === "text" && !description.trim())}
              className={cn(
                "ios-button font-semibold",
                (isSubmitting || (!file && selected !== "text") || (selected === "text" && !description.trim()))
                  ? "opacity-50"
                  : ""
              )}
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Publicar"
              )}
            </button>
          ) : (
            <div className="w-16" />
          )}
        </div>
      </header>

      <AnimatePresence mode="wait">
        {step === "select" ? (
          <motion.div
            key="select"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="p-4"
          >
            <div className="grid grid-cols-2 gap-3 mt-4">
              {createOptions.map((option, index) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  onClick={() => handleOptionSelect(option.id)}
                  className="ios-card p-5 text-left ios-spring tap-highlight-none"
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                    <option.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{option.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="edit"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col h-[calc(100vh-60px)]"
          >
            {/* Preview Area */}
            {selected !== "text" && preview && (
              <div className="flex-1 flex items-center justify-center p-4 bg-black/50">
                {file?.type.startsWith("video") ? (
                  <video
                    src={preview}
                    className="max-h-[50vh] w-auto rounded-2xl"
                    controls
                    playsInline
                  />
                ) : (
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-[50vh] w-auto rounded-2xl object-contain"
                  />
                )}
              </div>
            )}

            {/* Text Input Area */}
            <div className="p-4 space-y-4">
              {selected === "text" ? (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="O que você está pensando?"
                  className="w-full h-48 p-4 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-lg"
                  autoFocus
                />
              ) : (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Adicione uma legenda..."
                  className="w-full h-24 p-4 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              )}

              {/* Void Duration Selector */}
              {(selected === "void" || selected === "text") && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Duração</p>
                  <div className="flex gap-2">
                    {[6, 12, 24].map((hours) => (
                      <button
                        key={hours}
                        onClick={() => setVoidDuration(hours)}
                        className={cn(
                          "flex-1 py-3 rounded-xl font-semibold transition-all ios-spring tap-highlight-none",
                          voidDuration === hours
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-foreground"
                        )}
                      >
                        {hours}h
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
};

export default Create;
