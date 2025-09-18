import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Subjects from "@/pages/subjects";
import Materials from "@/pages/materials";
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

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : user && !user.studyProfile ? (
        <>
          <Route path="/onboarding" component={Onboarding} />
          <Route path="/*" component={() => { 
            if (window.location.pathname !== '/onboarding') {
              window.location.replace('/onboarding'); 
            }
            return null; 
          }} />
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/onboarding" component={Onboarding} />
          <Route path="/ai-assistant" component={AiAssistant} />
          <Route path="/subjects" component={Subjects} />
          <Route path="/materials" component={Materials} />
          <Route path="/knowledge-base" component={KnowledgeBasePage} />
          <Route path="/study" component={Study} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/flashcards" component={Flashcards} />
          <Route path="/quiz" component={Quiz} />
          <Route path="/goals" component={Goals} />
          <Route path="/goal-builder" component={GoalBuilder} />
          <Route path="/admin/search-config" component={AdminSearchConfig} />
          <Route path="/search" component={IntegratedSearch} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
