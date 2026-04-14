import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MultiStepForm } from "./components/MultiStepForm";
import { PredictionDashboard } from "./components/PredictionDashboard";
import { LoginView } from "./components/LoginView";
import { AdminDashboard } from "./components/AdminDashboard";
import { CKDInputs, PredictionResult } from "./types";
import { predictCKD } from "./services/apiService";
import { Stethoscope, LogOut, LayoutDashboard, ClipboardList, User as UserIcon } from "lucide-react";
import { useAuth, AuthProvider } from "./contexts/AuthContext";

function AppContent() {
  const { user, loading, isAdmin, logout } = useAuth();
  const [view, setView] = useState<'form' | 'admin'>('form');
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CKDInputs) => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const prediction = await predictCKD(data, user.id);
      setResult(prediction);
    } catch (err: any) {
      console.error("Prediction failed:", err);
      setError(err.message || "Failed to generate prediction. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="atmosphere" />
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div className="atmosphere" />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
        {/* Navigation Bar */}
        <nav className="flex items-center justify-between mb-12 p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/30">
              <Stethoscope className="text-blue-400" size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white hidden sm:block">
              CKD-<span className="text-blue-400">Predictor</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                {isAdmin && (
                  <button 
                    onClick={() => setView(view === 'form' ? 'admin' : 'form')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 transition-all text-sm font-medium"
                  >
                    {view === 'form' ? <LayoutDashboard size={18} /> : <ClipboardList size={18} />}
                    {view === 'form' ? 'Admin Panel' : 'New Assessment'}
                  </button>
                )}
                <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-white font-bold">{user?.display_name}</p>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest">{user?.role}</p>
                  </div>
                  <button 
                    onClick={logout}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-white/40 text-sm">
                <UserIcon size={16} /> Guest Mode
              </div>
            )}
          </div>
        </nav>

        {!user ? (
          <LoginView />
        ) : (
          <AnimatePresence mode="wait">
            {view === 'admin' ? (
              <motion.div
                key="admin"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <AdminDashboard />
              </motion.div>
            ) : (
              <div className="space-y-8">
                {/* Header for Form View */}
                {!result && (
                  <header className="text-center mb-12 space-y-4">
                    <motion.h2 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="text-4xl md:text-5xl font-bold tracking-tight text-white"
                    >
                      Clinical <span className="text-blue-400">Assessment</span>
                    </motion.h2>
                    <p className="text-white/40 max-w-xl mx-auto">
                      Complete the multi-step diagnostic form to generate a high-precision CKD risk profile.
                    </p>
                  </header>
                )}

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-center"
                  >
                    {error}
                  </motion.div>
                )}

                {!result ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <MultiStepForm onSubmit={handleSubmit} isLoading={isLoading} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <PredictionDashboard result={result} onReset={handleReset} />
                  </motion.div>
                )}
              </div>
            )}
          </AnimatePresence>
        )}

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-white/5 text-center text-white/20 text-sm">
          <p>© 2026 CKD-Predictor AI. For clinical research purposes only.</p>
        </footer>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
