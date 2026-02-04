import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Shield, 
  Users, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Search,
  BadgeCheck,
  Crown,
  Wallet,
  Ban,
  Eye,
  MoreHorizontal,
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  UserCheck,
  Image as ImageIcon
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface UserProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  verification_type: "none" | "blue" | "gold" | "staff";
  wallet_balance: number;
  followers_count: number;
  following_count: number;
  posts_count: number;
  created_at: string;
}

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: "purchase" | "withdrawal" | "commission";
  status: "pending" | "completed" | "failed";
  description: string | null;
  created_at: string;
  user?: {
    username: string | null;
    display_name: string | null;
  };
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"users" | "finances" | "withdrawals" | "stats">("users");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<Transaction[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCommissions, setTotalCommissions] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPosts, setTotalPosts] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Acesso não autorizado");
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setIsLoading(true);

    // Fetch users with all fields
    const { data: usersData, count: usersCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (usersData) {
      setUsers(usersData as UserProfile[]);
      setTotalUsers(usersCount || 0);
    }

    // Fetch posts count
    const { count: postsCount } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true });
    
    setTotalPosts(postsCount || 0);

    // Fetch transactions
    const { data: transactionsData } = await supabase
      .from("transactions")
      .select(`
        *,
        user:user_id (
          username,
          display_name
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (transactionsData) {
      setTransactions(transactionsData as Transaction[]);
      
      const revenue = transactionsData
        .filter((t) => t.type === "purchase" && t.status === "completed")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const commissions = transactionsData
        .filter((t) => t.type === "commission" && t.status === "completed")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      setTotalRevenue(revenue);
      setTotalCommissions(commissions);

      const withdrawals = transactionsData.filter(
        (t) => t.type === "withdrawal" && t.status === "pending"
      );
      setPendingWithdrawals(withdrawals as Transaction[]);
    }

    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
    toast.success("Dados atualizados");
  };

  const setVerificationType = async (
    userId: string,
    type: "none" | "blue" | "gold" | "staff"
  ) => {
    const { error } = await supabase
      .from("profiles")
      .update({
        is_verified: type !== "none",
        verification_type: type,
      })
      .eq("id", userId);

    if (error) {
      toast.error("Erro ao atualizar verificação");
    } else {
      toast.success(`Verificação alterada para: ${type}`);
      fetchData();
    }
  };

  const viewUserDetails = async (profile: UserProfile) => {
    setSelectedUser(profile);
    setUserModalOpen(true);
  };

  const approveWithdrawal = async (transactionId: string, userId: string, amount: number) => {
    const { error: transactionError } = await supabase
      .from("transactions")
      .update({
        status: "completed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", transactionId);

    if (transactionError) {
      toast.error("Erro ao aprovar saque");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", userId)
      .single();

    if (profile) {
      await supabase
        .from("profiles")
        .update({ wallet_balance: Number(profile.wallet_balance) - amount })
        .eq("id", userId);
    }

    toast.success("Saque aprovado com sucesso");
    fetchData();
  };

  const rejectWithdrawal = async (transactionId: string) => {
    const { error } = await supabase
      .from("transactions")
      .update({
        status: "failed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", transactionId);

    if (error) {
      toast.error("Erro ao rejeitar saque");
    } else {
      toast.success("Saque rejeitado");
      fetchData();
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getVerificationBadge = (type: "none" | "blue" | "gold" | "staff") => {
    switch (type) {
      case "blue":
        return <BadgeCheck className="w-4 h-4 text-blue-500" />;
      case "gold":
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case "staff":
        return <Shield className="w-4 h-4 text-purple-500" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-strong border-b border-white/5">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/")} className="p-2 -ml-2 rounded-full hover:bg-muted/50">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Shield className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold font-display">Admin Panel</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-xl p-4 border border-white/10"
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Users className="w-4 h-4" />
            <span className="text-xs">Total Usuários</span>
          </div>
          <p className="text-2xl font-bold">{totalUsers}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-strong rounded-xl p-4 border border-white/10"
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <ImageIcon className="w-4 h-4" />
            <span className="text-xs">Total Posts</span>
          </div>
          <p className="text-2xl font-bold">{totalPosts}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-strong rounded-xl p-4 border border-white/10"
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs">Receita Total</span>
          </div>
          <p className="text-2xl font-bold text-green-500">
            R$ {totalRevenue.toFixed(2)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-strong rounded-xl p-4 border border-white/10"
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Wallet className="w-4 h-4" />
            <span className="text-xs">Comissões</span>
          </div>
          <p className="text-2xl font-bold text-primary">
            R$ {totalCommissions.toFixed(2)}
          </p>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {[
            { id: "users", label: "Usuários", icon: Users },
            { id: "finances", label: "Financeiro", icon: DollarSign },
            { id: "withdrawals", label: `Saques (${pendingWithdrawals.length})`, icon: Wallet },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4">
        {activeTab === "users" && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuário..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Users List */}
            <div className="space-y-2">
              {filteredUsers.map((profile) => (
                <motion.div
                  key={profile.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-strong rounded-xl p-4 border border-white/10"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={profile.avatar_url || ""} />
                        <AvatarFallback>
                          {profile.display_name?.[0] || profile.username?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="font-medium">{profile.display_name || "Sem nome"}</p>
                          {getVerificationBadge(profile.verification_type)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          @{profile.username || "sem_username"}
                        </p>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => viewUserDetails(profile)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/user/${profile.id}`)}>
                          <Users className="w-4 h-4 mr-2" />
                          Ver perfil
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setVerificationType(profile.id, "none")}>
                          <XCircle className="w-4 h-4 mr-2" />
                          Sem verificação
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setVerificationType(profile.id, "blue")}>
                          <BadgeCheck className="w-4 h-4 mr-2 text-blue-500" />
                          Verificado (Azul)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setVerificationType(profile.id, "gold")}>
                          <Crown className="w-4 h-4 mr-2 text-yellow-500" />
                          Verificado (Ouro)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setVerificationType(profile.id, "staff")}>
                          <Shield className="w-4 h-4 mr-2 text-purple-500" />
                          Staff
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-muted/20 rounded-lg p-2">
                      <p className="font-bold">{profile.posts_count || 0}</p>
                      <p className="text-muted-foreground">Posts</p>
                    </div>
                    <div className="bg-muted/20 rounded-lg p-2">
                      <p className="font-bold">{profile.followers_count || 0}</p>
                      <p className="text-muted-foreground">Seguidores</p>
                    </div>
                    <div className="bg-muted/20 rounded-lg p-2">
                      <p className="font-bold">{profile.following_count || 0}</p>
                      <p className="text-muted-foreground">Seguindo</p>
                    </div>
                    <div className="bg-muted/20 rounded-lg p-2">
                      <p className="font-bold text-green-500">R${Number(profile.wallet_balance || 0).toFixed(0)}</p>
                      <p className="text-muted-foreground">Saldo</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "finances" && (
          <div className="space-y-2">
            {transactions.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                Nenhuma transação registrada
              </div>
            ) : (
              transactions.slice(0, 50).map((transaction) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-strong rounded-xl p-4 border border-white/10"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {transaction.user?.display_name || transaction.user?.username || "Usuário"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.description || transaction.type}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(transaction.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-bold ${
                          transaction.type === "withdrawal"
                            ? "text-red-500"
                            : "text-green-500"
                        }`}
                      >
                        {transaction.type === "withdrawal" ? "-" : "+"}R${" "}
                        {Number(transaction.amount).toFixed(2)}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          transaction.status === "completed"
                            ? "bg-green-500/20 text-green-500"
                            : transaction.status === "pending"
                            ? "bg-yellow-500/20 text-yellow-500"
                            : "bg-red-500/20 text-red-500"
                        }`}
                      >
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {activeTab === "withdrawals" && (
          <div className="space-y-2">
            {pendingWithdrawals.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p>Nenhum saque pendente</p>
              </div>
            ) : (
              pendingWithdrawals.map((withdrawal) => (
                <motion.div
                  key={withdrawal.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-strong rounded-xl p-4 border border-white/10"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium">
                        {withdrawal.user?.display_name || withdrawal.user?.username}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Solicitado em: {formatDate(withdrawal.created_at)}
                      </p>
                    </div>
                    <p className="text-xl font-bold text-red-500">
                      R$ {Number(withdrawal.amount).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() =>
                        approveWithdrawal(
                          withdrawal.id,
                          withdrawal.user_id,
                          Number(withdrawal.amount)
                        )
                      }
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => rejectWithdrawal(withdrawal.id)}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Rejeitar
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>

      {/* User Details Modal */}
      <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={selectedUser.avatar_url || ""} />
                  <AvatarFallback className="text-xl">
                    {selectedUser.display_name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-1">
                    <h3 className="font-bold text-lg">{selectedUser.display_name || "Sem nome"}</h3>
                    {getVerificationBadge(selectedUser.verification_type)}
                  </div>
                  <p className="text-muted-foreground">@{selectedUser.username || "sem_username"}</p>
                </div>
              </div>

              {selectedUser.bio && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Bio</p>
                  <p className="text-sm">{selectedUser.bio}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{selectedUser.posts_count || 0}</p>
                  <p className="text-xs text-muted-foreground">Posts</p>
                </div>
                <div className="bg-muted/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{selectedUser.followers_count || 0}</p>
                  <p className="text-xs text-muted-foreground">Seguidores</p>
                </div>
                <div className="bg-muted/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{selectedUser.following_count || 0}</p>
                  <p className="text-xs text-muted-foreground">Seguindo</p>
                </div>
                <div className="bg-muted/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-500">
                    R${Number(selectedUser.wallet_balance || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">Saldo</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  <strong>ID:</strong> {selectedUser.id}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Criado em:</strong> {formatDate(selectedUser.created_at)}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Verificação:</strong> {selectedUser.verification_type}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setUserModalOpen(false);
                    navigate(`/user/${selectedUser.id}`);
                  }}
                >
                  Ver Perfil
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
