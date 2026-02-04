import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  User, 
  Bell, 
  Lock, 
  MessageCircle, 
  Shield,
  Palette,
  HelpCircle,
  LogOut,
  ChevronRight,
  Loader2,
  Check
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useUserSettings, MessagePrivacy } from "@/hooks/useUserSettings";
import { toast } from "sonner";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet";

const Settings = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, isLoading: authLoading } = useAuth();
  const { settings, updateMessagePrivacy, isSaving } = useUserSettings();
  const [messagePrivacySheet, setMessagePrivacySheet] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleMessagePrivacyChange = async (privacy: MessagePrivacy) => {
    const success = await updateMessagePrivacy(privacy);
    if (success) {
      toast.success("Configuração atualizada");
      setMessagePrivacySheet(false);
    } else {
      toast.error("Erro ao atualizar configuração");
    }
  };

  const getPrivacyLabel = (privacy: MessagePrivacy) => {
    switch (privacy) {
      case "everyone":
        return "Todos";
      case "followers":
        return "Seguidores";
      case "nobody":
        return "Ninguém";
    }
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
      <header className="ios-nav-bar">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Configurações</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-6 pb-24">
        {/* Profile Section */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate("/profile")}
          className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl"
        >
          <div className="w-14 h-14 rounded-full bg-muted overflow-hidden">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || ""}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl font-semibold">
                {(profile?.display_name || "U")[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold">{profile?.display_name || "Usuário"}</p>
            <p className="text-sm text-muted-foreground">@{profile?.username || "usuario"}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </motion.button>

        {/* Account Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card rounded-2xl overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium text-muted-foreground">Conta</p>
          </div>
          
          <SettingsItem 
            icon={<User className="w-5 h-5" />}
            label="Editar perfil"
            onClick={() => navigate("/profile")}
          />
          <SettingsItem 
            icon={<Bell className="w-5 h-5" />}
            label="Notificações"
            onClick={() => {}}
          />
          <SettingsItem 
            icon={<Lock className="w-5 h-5" />}
            label="Privacidade"
            onClick={() => {}}
            isLast
          />
        </motion.div>

        {/* Messages Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium text-muted-foreground">Mensagens</p>
          </div>
          
          <SettingsItem 
            icon={<MessageCircle className="w-5 h-5" />}
            label="Quem pode me enviar mensagens"
            value={getPrivacyLabel(settings.message_privacy)}
            onClick={() => setMessagePrivacySheet(true)}
            isLast
          />
        </motion.div>

        {/* Preferences Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card rounded-2xl overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium text-muted-foreground">Preferências</p>
          </div>
          
          <SettingsItem 
            icon={<Palette className="w-5 h-5" />}
            label="Aparência"
            value="Sistema"
            onClick={() => {}}
          />
          <SettingsItem 
            icon={<Shield className="w-5 h-5" />}
            label="Segurança"
            onClick={() => {}}
          />
          <SettingsItem 
            icon={<HelpCircle className="w-5 h-5" />}
            label="Ajuda e suporte"
            onClick={() => {}}
            isLast
          />
        </motion.div>

        {/* Logout */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 p-4 bg-card rounded-2xl text-destructive"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sair</span>
        </motion.button>

        {/* Version */}
        <p className="text-center text-xs text-muted-foreground">
          BRΞYK v1.0.0
        </p>
      </div>

      {/* Message Privacy Sheet */}
      <Sheet open={messagePrivacySheet} onOpenChange={setMessagePrivacySheet}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle>Quem pode me enviar mensagens</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-2 pb-8">
            <PrivacyOption
              label="Todos"
              description="Qualquer pessoa pode te enviar mensagens"
              selected={settings.message_privacy === "everyone"}
              onClick={() => handleMessagePrivacyChange("everyone")}
              disabled={isSaving}
            />
            <PrivacyOption
              label="Seguidores"
              description="Apenas pessoas que você segue podem te enviar mensagens"
              selected={settings.message_privacy === "followers"}
              onClick={() => handleMessagePrivacyChange("followers")}
              disabled={isSaving}
            />
            <PrivacyOption
              label="Ninguém"
              description="Ninguém pode te enviar mensagens"
              selected={settings.message_privacy === "nobody"}
              onClick={() => handleMessagePrivacyChange("nobody")}
              disabled={isSaving}
            />
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
};

interface SettingsItemProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onClick: () => void;
  isLast?: boolean;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
}

const SettingsItem = ({ 
  icon, 
  label, 
  value, 
  onClick, 
  isLast,
  toggle,
  toggleValue,
  onToggle 
}: SettingsItemProps) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors ${
        !isLast ? "border-b border-border" : ""
      }`}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {value && (
        <span className="text-sm text-muted-foreground">{value}</span>
      )}
      {toggle ? (
        <Switch checked={toggleValue} onCheckedChange={onToggle} />
      ) : (
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      )}
    </button>
  );
};

interface PrivacyOptionProps {
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  disabled: boolean;
}

const PrivacyOption = ({ 
  label, 
  description, 
  selected, 
  onClick,
  disabled 
}: PrivacyOptionProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-4 p-4 rounded-xl transition-colors ${
        selected ? "bg-primary/10 border border-primary" : "bg-muted/50 border border-transparent"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <div className="flex-1 text-left">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {selected && (
        <Check className="w-5 h-5 text-primary" />
      )}
    </button>
  );
};

export default Settings;
