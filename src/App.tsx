import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CallProvider } from "@/contexts/CallContext";
import { CallOverlay, IncomingCallModal } from "@/components/calls";
import Index from "./pages/Index";
import Void from "./pages/Void";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import Create from "./pages/Create";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import AdminDashboard from "./pages/AdminDashboard";
import Discover from "./pages/Discover";
import UserProfile from "./pages/UserProfile";
import UsernameProfile from "./pages/UsernameProfile";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import Stickers from "./pages/Stickers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CallProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/void" element={<Void />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/create" element={<Create />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/admin-lone" element={<AdminDashboard />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/user/:userId" element={<UserProfile />} />
              <Route path="/@:username" element={<UsernameProfile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/stickers" element={<Stickers />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            
            {/* Global Call UI */}
            <CallOverlay />
            <IncomingCallModal />
          </CallProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
