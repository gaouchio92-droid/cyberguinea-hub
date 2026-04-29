import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Incidents from "./pages/Incidents";
import Intel from "./pages/Intel";
import Operators from "./pages/Operators";
import Reports from "./pages/Reports";
import Assistant from "./pages/Assistant";
import Documentation from "./pages/Documentation";
import AuthPage from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Users from "./pages/Users";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/incidents" element={<Incidents />} />
              <Route path="/intel" element={<Intel />} />
              <Route path="/operators" element={<Operators />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/assistant" element={<Assistant />} />
              <Route path="/documentation" element={<Documentation />} />
              <Route path="/users" element={<Users />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
