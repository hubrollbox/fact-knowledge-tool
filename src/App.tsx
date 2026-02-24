import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Index";
import NotFound from "./pages/NotFound";

import ProcessosList from "./pages/processos/ProcessosList";
import ProcessoNovo from "./pages/processos/ProcessoNovo";
import ProcessoDetalhe from "./pages/processos/ProcessoDetalhe";
import Cronologia from "./pages/processos/Cronologia";

import Conhecimento from "./pages/conhecimento/Conhecimento";
import DisciplinaDetalhe from "./pages/conhecimento/DisciplinaDetalhe";

import Gestao from "./pages/gestao/Gestao";
import Clientes from "./pages/gestao/Clientes";
import Arquivo from "./pages/gestao/Arquivo";
import Relatorios from "./pages/gestao/Relatorios";
import Perfil from "./pages/gestao/Perfil";
import Tesouraria from "./pages/gestao/Tesouraria";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/processos" element={<ProtectedRoute><ProcessosList /></ProtectedRoute>} />
            <Route path="/processos/novo" element={<ProtectedRoute><ProcessoNovo /></ProtectedRoute>} />
            <Route path="/processos/cronologia" element={<ProtectedRoute><Cronologia /></ProtectedRoute>} />
            <Route path="/processos/:id" element={<ProtectedRoute><ProcessoDetalhe /></ProtectedRoute>} />
            <Route path="/conhecimento" element={<ProtectedRoute><Conhecimento /></ProtectedRoute>} />
            <Route path="/conhecimento/disciplinas/:id" element={<ProtectedRoute><DisciplinaDetalhe /></ProtectedRoute>} />
            <Route path="/gestao" element={<ProtectedRoute><Gestao /></ProtectedRoute>} />
            <Route path="/gestao/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
            <Route path="/gestao/arquivo" element={<ProtectedRoute><Arquivo /></ProtectedRoute>} />
            <Route path="/gestao/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
            <Route path="/gestao/tesouraria" element={<ProtectedRoute><Tesouraria /></ProtectedRoute>} />
            <Route path="/gestao/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
