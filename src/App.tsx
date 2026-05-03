import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useParams, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Dashboard from "./pages/Index";
import NotFound from "./pages/NotFound";

import DossiersList from "./pages/dossiers/DossiersList";
import DossierNovo from "./pages/dossiers/DossierNovo";
import DossierDetalhe from "./pages/dossiers/DossierDetalhe";
import Cronologia from "./pages/dossiers/Cronologia";

import Conhecimento from "./pages/conhecimento/Conhecimento";
import DisciplinaDetalhe from "./pages/conhecimento/DisciplinaDetalhe";

import Gestao from "./pages/gestao/Gestao";
import Clientes from "./pages/gestao/Clientes";
import Arquivo from "./pages/gestao/Arquivo";
import Relatorios from "./pages/gestao/Relatorios";
import Perfil from "./pages/gestao/Perfil";
import Tesouraria from "./pages/gestao/Tesouraria";

import Termos from "./pages/Termos";
import Privacidade from "./pages/Privacidade";
import Licenca from "./pages/Licenca";

import { JuridicoDashboard } from "./modules/juridico/pages/JuridicoDashboard";
import { ProcessoDetail } from "./modules/juridico/pages/ProcessoDetail";

const queryClient = new QueryClient();

function ProcessoDetailRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  return <ProcessoDetail processoId={id!} onBack={() => navigate('/juridico')} />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dossiers" element={<ProtectedRoute><DossiersList /></ProtectedRoute>} />
            <Route path="/dossiers/novo" element={<ProtectedRoute><DossierNovo /></ProtectedRoute>} />
            <Route path="/dossiers/cronologia" element={<ProtectedRoute><Cronologia /></ProtectedRoute>} />
            <Route path="/dossiers/:id" element={<ProtectedRoute><DossierDetalhe /></ProtectedRoute>} />
            <Route path="/conhecimento" element={<ProtectedRoute><Conhecimento /></ProtectedRoute>} />
            <Route path="/conhecimento/disciplinas/:id" element={<ProtectedRoute><DisciplinaDetalhe /></ProtectedRoute>} />
            <Route path="/gestao" element={<ProtectedRoute><Gestao /></ProtectedRoute>} />
            <Route path="/gestao/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
            <Route path="/gestao/arquivo" element={<ProtectedRoute><Arquivo /></ProtectedRoute>} />
            <Route path="/gestao/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
            <Route path="/gestao/tesouraria" element={<ProtectedRoute><Tesouraria /></ProtectedRoute>} />
            <Route path="/gestao/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
            <Route path="/juridico" element={<ProtectedRoute><AppLayout><JuridicoDashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/juridico/:id" element={<ProtectedRoute><AppLayout><ProcessoDetailRoute /></AppLayout></ProtectedRoute>} />
            <Route path="/termos" element={<Termos />} />
            <Route path="/privacidade" element={<Privacidade />} />
            <Route path="/licenca" element={<Licenca />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
