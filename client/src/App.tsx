import { Switch, Route, useLocation } from "wouter";
import { useEffect, lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/contexts/ThemeContext";
// Toast notifications handled by Semantic UI Message components
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard-simple";
import Library from "@/pages/library";

// Lazy load mind maps to keep main bundle small (ReactFlow is ~200KB)
const MindMapApp = lazy(() => import("@/features/mindmaps"));

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
import ConversationalVoiceTestPage from "@/pages/ConversationalVoiceTestPage";
import ProfessorIA from "@/pages/ProfessorIA";
import AdminProfiles from "@/pages/AdminProfiles";

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
      {/* Rotas públicas para teste de Voice */}
      <Route path="/voice-agent-test" component={VoiceAgentTestPage} />
      <Route path="/conversational-voice-test" component={ConversationalVoiceTestPage} />
      <Route path="/professor-ia" component={ProfessorIA} />
      
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
          <Route path="/mind-maps">
            <Suspense fallback={
              <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
                  <p className="text-muted-foreground">Carregando Mapas Mentais...</p>
                </div>
              </div>
            }>
              <MindMapApp />
            </Suspense>
          </Route>
          
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
          <Route path="/admin/profiles" component={AdminProfiles} />
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
