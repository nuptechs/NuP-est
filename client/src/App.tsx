import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/contexts/ThemeContext";
// Toast notifications handled by Semantic UI Message components
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard-simple";
import Library from "@/pages/library";
// Subjects and Materials pages removed - now handled by unified Library page
import Study from "@/pages/study";
import Analytics from "@/pages/analytics";
import Flashcards from "@/pages/flashcards";
import KnowledgeBasePage from "@/pages/knowledge-base";
import Onboarding from "@/pages/onboarding";
import Quiz from "@/pages/quiz";
import Goals from "@/pages/goals";
import GoalBuilder from "@/pages/goal-builder";
import AdminSearchConfig from "@/pages/admin-search-config";
import IntegratedSearch from "@/pages/search-integrated";
import AiAssistant from "@/components/dashboard/ai-assistant";
import PersonalizedAssistant from "@/pages/personalized-assistant";
import GuidedStudy from "@/pages/guided-study";
import Topics from "@/pages/topics";
import VoiceAgentTestPage from "@/pages/VoiceAgentTestPage";

// Componente para redirecionamento adequado usando wouter
function Redirect({ to }: { to: string }) {
  const [, navigate] = useLocation();
  
  useEffect(() => {
    navigate(to, { replace: true });
  }, [to, navigate]);
  
  return null;
}

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Rota pública para teste de Voice Agent */}
      <Route path="/voice-agent-test" component={VoiceAgentTestPage} />
      
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : user && !user.studyProfile ? (
        <>
          <Route path="/onboarding" component={Onboarding} />
          <Route path="/*" component={() => <Redirect to="/onboarding" />} />
        </>
      ) : (
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/onboarding" component={Onboarding} />
          <Route path="/ai-assistant" component={AiAssistant} />
          <Route path="/personalized-assistant" component={PersonalizedAssistant} />
          <Route path="/assistant" component={PersonalizedAssistant} />
          <Route path="/guided-study" component={GuidedStudy} />
          
          {/* Nova biblioteca unificada */}
          <Route path="/library" component={Library} />
          
          {/* Rotas legadas - redirecionam para biblioteca usando SPA navigation */}
          <Route path="/subjects" component={() => <Redirect to="/library?type=subjects" />} />
          <Route path="/materials" component={() => <Redirect to="/library?type=materials" />} />
          <Route path="/knowledge-base" component={() => <Redirect to="/library?type=knowledge-base" />} />
          
          <Route path="/study" component={Study} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/flashcards" component={Flashcards} />
          <Route path="/quiz" component={Quiz} />
          <Route path="/goals" component={Goals} />
          <Route path="/goal-builder" component={GoalBuilder} />
          <Route path="/topics" component={Topics} />
          <Route path="/admin/search-config" component={AdminSearchConfig} />
          <Route path="/search" component={IntegratedSearch} />
          
          <Route component={NotFound} />
        </Switch>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
