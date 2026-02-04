import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Camera, Check, ArrowRight, ArrowLeft, User, Sparkles, AtSign } from "lucide-react";

interface Interest {
  id: string;
  name: string;
  icon: string | null;
}

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, profile, updateProfile, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Step 2: Profile
  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Step 3: Interests
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (profile?.onboarding_completed) {
      navigate("/");
    }
  }, [user, profile, navigate]);

  useEffect(() => {
    const fetchInterests = async () => {
      const { data } = await supabase.from("interests").select("*");
      if (data) setInterests(data);
    };
    fetchInterests();
  }, []);

  // Username availability check
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const checkUsername = async () => {
      setUsernameChecking(true);
      const { data, error } = await supabase.rpc("check_username_available", {
        p_username: username,
      });
      
      if (!error) {
        setUsernameAvailable(data as boolean);
      }
      setUsernameChecking(false);
    };

    const debounce = setTimeout(checkUsername, 500);
    return () => clearTimeout(debounce);
  }, [username]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStep2Submit = async () => {
    if (!username || !usernameAvailable) {
      toast.error("Por favor, escolha um username válido");
      return;
    }

    setIsLoading(true);

    try {
      let avatarUrl = null;

      if (avatarFile && user) {
        const fileName = `${user.id}/${Date.now()}-avatar`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, avatarFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(uploadData.path);

        avatarUrl = urlData.publicUrl;
      }

      const { error } = await updateProfile({
        username,
        avatar_url: avatarUrl || profile?.avatar_url,
        onboarding_step: 3,
      });

      if (error) throw error;

      setStep(3);
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar perfil");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep3Submit = async () => {
    if (selectedInterests.length < 3) {
      toast.error("Selecione pelo menos 3 interesses");
      return;
    }

    setIsLoading(true);

    try {
      // Insert user interests
      if (user) {
        const interestsToInsert = selectedInterests.map((interestId) => ({
          user_id: user.id,
          interest_id: interestId,
        }));

        const { error: interestsError } = await supabase
          .from("user_interests")
          .insert(interestsToInsert);

        if (interestsError) throw interestsError;
      }

      const { error } = await updateProfile({
        onboarding_step: 4,
        onboarding_completed: true,
      });

      if (error) throw error;

      toast.success("Bem-vindo ao BRΞYK!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar interesses");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleInterest = (interestId: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interestId)
        ? prev.filter((id) => id !== interestId)
        : [...prev, interestId]
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-16 rounded-full transition-colors ${
                  s <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <p className="text-center text-muted-foreground text-sm">
            Etapa {step} de 3
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Welcome (auto-complete) */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-strong rounded-2xl p-6 border border-white/10 text-center"
            >
              <Sparkles className="w-16 h-16 text-primary mx-auto mb-4" />
              <h1 className="text-2xl font-bold font-display mb-2">
                Bem-vindo ao BRΞYK!
              </h1>
              <p className="text-muted-foreground mb-6">
                Vamos configurar seu perfil para você começar a interagir com a comunidade.
              </p>
              <Button
                onClick={() => setStep(2)}
                variant="neon"
                className="w-full"
              >
                Começar
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* Step 2: Profile Setup */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-strong rounded-2xl p-6 border border-white/10"
            >
              <h2 className="text-xl font-bold font-display mb-6 text-center">
                Configure seu perfil
              </h2>

              {/* Avatar Upload */}
              <div className="flex justify-center mb-6">
                <label className="relative cursor-pointer">
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-primary/50 hover:border-primary transition-colors">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <Camera className="w-4 h-4 text-primary-foreground" />
                  </div>
                </label>
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="seu_username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    className="pl-10 pr-10"
                    maxLength={30}
                  />
                  {usernameChecking && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                    </div>
                  )}
                  {!usernameChecking && usernameAvailable !== null && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {usernameAvailable ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <span className="text-destructive text-xs">Indisponível</span>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Apenas letras minúsculas, números e underscores
                </p>
              </div>

              <div className="flex gap-2 mt-6">
                <Button
                  onClick={() => setStep(1)}
                  variant="ghost"
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <Button
                  onClick={handleStep2Submit}
                  variant="neon"
                  className="flex-1"
                  disabled={isLoading || !usernameAvailable}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      Continuar
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Interests */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-strong rounded-2xl p-6 border border-white/10"
            >
              <h2 className="text-xl font-bold font-display mb-2 text-center">
                Seus interesses
              </h2>
              <p className="text-muted-foreground text-center mb-6 text-sm">
                Selecione pelo menos 3 para personalizar seu feed
              </p>

              <div className="grid grid-cols-2 gap-2 mb-6">
                {interests.map((interest) => (
                  <motion.button
                    key={interest.id}
                    onClick={() => toggleInterest(interest.id)}
                    whileTap={{ scale: 0.95 }}
                    className={`p-3 rounded-xl border transition-all ${
                      selectedInterests.includes(interest.id)
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-muted/30 border-white/10 text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <span className="text-lg mr-2">{interest.icon}</span>
                    <span className="text-sm font-medium">{interest.name}</span>
                  </motion.button>
                ))}
              </div>

              <p className="text-center text-sm text-muted-foreground mb-4">
                {selectedInterests.length} de 3+ selecionados
              </p>

              <div className="flex gap-2">
                <Button
                  onClick={() => setStep(2)}
                  variant="ghost"
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <Button
                  onClick={handleStep3Submit}
                  variant="neon"
                  className="flex-1"
                  disabled={isLoading || selectedInterests.length < 3}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      Finalizar
                      <Check className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Onboarding;
