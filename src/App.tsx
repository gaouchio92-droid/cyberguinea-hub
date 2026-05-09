import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";

import Dashboard from "./pages/Dashboard";
import AuthPage from "./pages/Auth";
import Tasks from "./pages/Tasks";
import Incidents from "./pages/Incidents";
import IncidentDetail from "./pages/IncidentDetail";
import Intel from "./pages/Intel";
import Operators from "./pages/Operators";
import Reports from "./pages/Reports";
import Operations from "./pages/Operations";
import MapView from "./pages/MapView";
import SystemLogs from "./pages/SystemLogs";
import Assistant from "./pages/Assistant";
import Documentation from "./pages/Documentation";
import ResetPassword from "./pages/ResetPassword";
import Users from "./pages/Users";
import Compliance from "./pages/Compliance";
import Exercises from "./pages/Exercises";
import Iocs from "./pages/Iocs";
import Bulletins from "./pages/Bulletins";
import Maturity from "./pages/Maturity";
import PublicAvis from "./pages/PublicAvis";
import Architecture from "./pages/Architecture";
import SiemSources from "./pages/SiemSources";
import OperatorForm from "./pages/OperatorForm";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/avis" element={<PublicAvis />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/incidents" element={<Incidents />} />
              <Route path="/incidents/:id" element={<IncidentDetail />} />
              <Route path="/intel" element={<Intel />} />
              <Route path="/operators" element={<Operators />} />
              <Route path="/operators/new" element={<OperatorForm />} />
              <Route path="/operators/:id/edit" element={<OperatorForm />} />
              <Route path="/siem-sources" element={<SiemSources />} />
              <Route path="/operations" element={<Operations />} />
              <Route path="/map" element={<MapView />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/iocs" element={<Iocs />} />
              <Route path="/bulletins" element={<Bulletins />} />
              <Route path="/maturity" element={<Maturity />} />
              <Route path="/assistant" element={<Assistant />} />
              <Route path="/documentation" element={<Documentation />} />
              <Route path="/system-logs" element={<SystemLogs />} />
              <Route path="/users" element={<Users />} />
              <Route path="/compliance" element={<Compliance />} />
              <Route path="/exercises" element={<Exercises />} />
              <Route path="/architecture" element={<Architecture />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
