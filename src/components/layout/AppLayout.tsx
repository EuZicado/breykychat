import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { motion, AnimatePresence } from "framer-motion";

interface AppLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

export const AppLayout = ({ children, hideNav = false }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={hideNav ? "" : "pb-24"}
        >
          {children}
        </motion.main>
      </AnimatePresence>
      {!hideNav && <BottomNav />}
    </div>
  );
};
