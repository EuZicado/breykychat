import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useStickers } from "@/hooks/useStickers";
import { useNavigate } from "react-router-dom";
import { 
  Loader2, 
  Plus, 
  Package, 
  ShoppingBag, 
  Crown, 
  Check, 
  Star,
  Sparkles,
  Palette
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateStickerPackSheet } from "@/components/stickers/CreateStickerPackSheet";
import { StickerPackCard } from "@/components/stickers/StickerPackCard";
import { MyStickerPacks } from "@/components/stickers/MyStickerPacks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Stickers = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { publicPacks, myPacks, ownedPacks, isLoading, refreshPublic, refreshMy, refreshOwned } = useStickers();
  const [activeTab, setActiveTab] = useState("store");
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [purchasingPackId, setPurchasingPackId] = useState<string | null>(null);

  // Combine my packs and owned packs for "my stickers" tab
  const allMyStickers = useMemo(() => {
    const myPackIds = new Set(myPacks.map(p => p.id));
    const combined = [...myPacks];
    ownedPacks.forEach(pack => {
      if (!myPackIds.has(pack.id)) {
        combined.push(pack);
      }
    });
    return combined;
  }, [myPacks, ownedPacks]);

  const handlePurchase = async (packId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setPurchasingPackId(packId);

    try {
      const { data, error } = await supabase.functions.invoke("sticker-checkout", {
        body: { pack_id: packId, user_id: user.id },
      });

      if (error) {
        throw error;
      }

      if (data?.init_point) {
        window.location.href = data.init_point;
      } else if (data?.error === "Already purchased") {
        toast.info("Você já possui este pack!");
        await refreshOwned();
      } else {
        throw new Error(data?.error || "Erro ao processar pagamento");
      }
    } catch (error: any) {
      console.error("Purchase error:", error);
      toast.error(error.message || "Erro ao iniciar compra");
    } finally {
      setPurchasingPackId(null);
    }
  };

  const handlePackCreated = () => {
    refreshMy();
    setShowCreateSheet(false);
    toast.success("Pack criado com sucesso!");
  };

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 safe-top">
        <div className="glass-strong px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Stickers</h1>
                <p className="text-xs text-muted-foreground">Personalize seu chat</p>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateSheet(true)}
              className="rounded-full gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Criar Pack
            </Button>
          </div>
        </div>
      </header>

      <div className="pt-24 pb-24 px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="store" className="gap-1.5">
              <ShoppingBag className="w-4 h-4" />
              Loja
            </TabsTrigger>
            <TabsTrigger value="my" className="gap-1.5">
              <Package className="w-4 h-4" />
              Meus
            </TabsTrigger>
            <TabsTrigger value="create" className="gap-1.5">
              <Palette className="w-4 h-4" />
              Criar
            </TabsTrigger>
          </TabsList>

          {/* Store Tab */}
          <TabsContent value="store" className="mt-0">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : publicPacks.length === 0 ? (
              <EmptyState
                icon={<ShoppingBag className="w-10 h-10 text-primary" />}
                title="Nenhum pack disponível"
                subtitle="Seja o primeiro a criar um pack de stickers!"
                action={
                  <Button
                    onClick={() => setShowCreateSheet(true)}
                    className="rounded-full gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Criar Pack
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {publicPacks.map((pack, index) => (
                  <StickerPackCard
                    key={pack.id}
                    pack={pack}
                    index={index}
                    onPurchase={handlePurchase}
                    isPurchasing={purchasingPackId === pack.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* My Stickers Tab */}
          <TabsContent value="my" className="mt-0">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : allMyStickers.length === 0 ? (
              <EmptyState
                icon={<Package className="w-10 h-10 text-primary" />}
                title="Nenhum sticker ainda"
                subtitle="Compre ou crie packs para usar no chat"
                action={
                  <Button
                    onClick={() => setActiveTab("store")}
                    className="rounded-full gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Ver Loja
                  </Button>
                }
              />
            ) : (
              <div className="space-y-4">
                {allMyStickers.map((pack, index) => (
                  <motion.div
                    key={pack.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-muted/30 rounded-2xl p-4"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {pack.cover_url ? (
                        <img
                          src={pack.cover_url}
                          alt={pack.name}
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold">{pack.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {pack.stickers?.length || 0} stickers
                        </p>
                      </div>
                      <Badge variant="secondary" className="rounded-full">
                        <Check className="w-3 h-3 mr-1" />
                        Adquirido
                      </Badge>
                    </div>
                    
                    {pack.stickers && pack.stickers.length > 0 && (
                      <div className="grid grid-cols-6 gap-2">
                        {pack.stickers.slice(0, 6).map((sticker) => (
                          <motion.div
                            key={sticker.id}
                            whileHover={{ scale: 1.1 }}
                            className="aspect-square rounded-lg bg-muted/50 p-1.5"
                          >
                            <img
                              src={sticker.image_url}
                              alt={sticker.emoji || "Sticker"}
                              className="w-full h-full object-contain"
                            />
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Create Tab */}
          <TabsContent value="create" className="mt-0">
            <MyStickerPacks
              packs={myPacks}
              onRefresh={refreshMy}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Pack Sheet */}
      <CreateStickerPackSheet
        open={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        onCreated={handlePackCreated}
      />
    </AppLayout>
  );
};

const EmptyState = ({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-16 text-center px-8"
  >
    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
      {icon}
    </div>
    <p className="text-xl font-semibold mb-2">{title}</p>
    <p className="text-muted-foreground mb-6 max-w-[280px]">{subtitle}</p>
    {action}
  </motion.div>
);

export default Stickers;
