import { Home, Zap, PlusCircle, MessageCircle, User, Sparkles } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { icon: Home, label: "Início", path: "/" },
  { icon: Sparkles, label: "Stickers", path: "/stickers" },
  { icon: PlusCircle, label: "", path: "/create", isMain: true },
  { icon: MessageCircle, label: "Chat", path: "/messages" },
  { icon: User, label: "Perfil", path: "/profile" },
];

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavClick = (path: string) => {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    navigate(path);
  };

  return (
    <nav className="ios-tab-bar z-50">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          if (item.isMain) {
            return (
              <motion.button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                whileTap={{ scale: 0.85 }}
                className="tap-highlight-none"
              >
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-ios-lg">
                  <PlusCircle className="w-7 h-7 text-primary-foreground" strokeWidth={2.5} />
                </div>
              </motion.button>
            );
          }

          return (
            <motion.button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              whileTap={{ scale: 0.85 }}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 w-16 h-full tap-highlight-none transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};
