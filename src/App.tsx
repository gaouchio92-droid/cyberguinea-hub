import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { Loader2 } from "lucide-react";

// Eager: page d'accueil pour démarrage rapide
import Dashboard from "./pages/Dashboard";
import AuthPage from "./pages/Auth";

// Lazy: tout le reste — chargé à la demande
const Tasks = lazy(() => import("./pages/Tasks"));
const Incidents = lazy(() => import("./pages/Incidents"));
const IncidentDetail = lazy(() => import("./pages/IncidentDetail"));
const Intel = lazy(() => import("./pages/Intel"));
const Operators = lazy(() => import("./pages/Operators"));
const Reports = lazy(() => import("./pages/Reports"));
const Operations = lazy(() => import("./pages/Operations"));
const MapView = lazy(() => import("./pages/MapView"));
const SystemLogs = lazy(() => import("./pages/SystemLogs"));
const Assistant = lazy(() => import("./pages/Assistant"));
const Documentation = lazy(() => import("./pages/Documentation"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Users = lazy(() => import("./pages/Users"));
const Compliance = lazy(() => import("./pages/Compliance"));
const Exercises = lazy(() => import("./pages/Exercises"));
const Iocs = lazy(() => import("./pages/Iocs"));
const Bulletins = lazy(() => import("./pages/Bulletins"));
const Maturity = lazy(() => import("./pages/Maturity"));
const PublicAvis = lazy(() => import("./pages/PublicAvis"));
const Architecture = lazy(() => import("./pages/Architecture"));
const NotFound = lazy(() => import("./pages/NotFound"));

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

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageFallback />}>
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
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
