import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { VoidBubble } from "@/components/void/VoidBubble";
import { CreateVoidSheet } from "@/components/void/CreateVoidSheet";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Sparkles, Loader2, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useVoid } from "@/hooks/useVoid";
import { Button } from "@/components/ui/button";

const Void = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { content, isLoading, getTimeRemaining } = useVoid();
  const [showCreateSheet, setShowCreateSheet] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top">
        <div className="glass-strong px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-6 h-6 text-primary" />
              </motion.div>
              <h1 className="text-xl font-bold font-display">The Void</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-xs">Efêmero</span>
              </div>
              <Button
                variant="neon"
                size="sm"
                onClick={() => setShowCreateSheet(true)}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>Novo</span>
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Conteúdo temporário que desaparece em até 24h
          </p>
        </div>
      </header>

      {/* Void Content Grid */}
      <div className="px-4 py-4 pb-24">
        <AnimatePresence mode="popLayout">
          {content.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Sparkles className="w-16 h-16 text-primary/50 mb-4" />
              </motion.div>
              <p className="text-lg font-medium text-muted-foreground mb-2">O Void está vazio</p>
              <p className="text-sm text-muted-foreground mb-6">
                Seja o primeiro a compartilhar!
              </p>
              <Button
                variant="neon"
                onClick={() => setShowCreateSheet(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Criar pensamento
              </Button>
            </motion.div>
          ) : (
            <motion.div 
              layout
              className="grid grid-cols-2 gap-3"
            >
              {content.map((item, index) => (
                <VoidBubble
                  key={item.id}
                  id={item.id}
                  content={item.content_type === "text" ? item.text_content || "" : item.content_url || ""}
                  username={item.creator?.username || "unknown"}
                  avatar={item.creator?.avatar_url || ""}
                  expiresIn={getTimeRemaining(item.expires_at)}
                  type={item.content_type as "text" | "image"}
                  index={index}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Action Button */}
      {content.length > 0 && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowCreateSheet(true)}
          className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg z-40"
        >
          <Plus className="w-6 h-6 text-primary-foreground" />
        </motion.button>
      )}

      {/* Gradient Overlay */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-void opacity-20" />

      {/* Create Sheet */}
      <CreateVoidSheet open={showCreateSheet} onClose={() => setShowCreateSheet(false)} />
    </AppLayout>
  );
};

export default Void;
