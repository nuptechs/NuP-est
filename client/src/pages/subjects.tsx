import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import SubjectForm from "@/components/subjects/subject-form";
import { DashboardIcon } from "@/components/ui/dashboard-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Subject } from "@shared/schema";

export default function Subjects() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: subjects, isLoading: subjectsLoading } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    enabled: isAuthenticated,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/subjects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      toast({
        title: "Sucesso",
        description: "Matéria excluída com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao excluir matéria",
        variant: "destructive",
      });
    },
  });

  const handleSubjectCreated = () => {
    setIsFormOpen(false);
    setSelectedSubject(null);
    queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
  };

  const handleEditSubject = (subject: Subject) => {
    setSelectedSubject(subject);
    setIsFormOpen(true);
  };

  const handleDeleteSubject = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta matéria?")) {
      deleteMutation.mutate(id);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "exatas":
        return "bg-primary/10 text-primary border-primary/20";
      case "humanas":
        return "bg-secondary/10 text-secondary border-secondary/20";
      case "biologicas":
        return "bg-accent/10 text-accent border-accent/20";
      default:
        return "bg-muted/10 text-muted-foreground border-muted/20";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "low":
        return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400";
      default:
        return "bg-muted/10 text-muted-foreground border-muted/20";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header 
          title="Matérias" 
          subtitle="Organize e gerencie suas disciplinas de estudo"
        />
        
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Suas Matérias</h2>
              <p className="text-muted-foreground">
                {subjects?.length || 0} matéria{subjects?.length !== 1 ? 's' : ''} cadastrada{subjects?.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setSelectedSubject(null)} data-testid="button-new-subject">
                  <i className="fas fa-plus mr-2"></i>
                  Nova Matéria
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {selectedSubject ? "Editar Matéria" : "Nova Matéria"}
                  </DialogTitle>
                </DialogHeader>
                <SubjectForm 
                  subject={selectedSubject}
                  onSuccess={handleSubjectCreated}
                />
              </DialogContent>
            </Dialog>
          </div>

          {subjectsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-3 bg-muted rounded w-full mb-2"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : subjects?.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-book text-muted-foreground text-2xl"></i>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Nenhuma matéria cadastrada
                </h3>
                <p className="text-muted-foreground mb-4">
                  Comece criando sua primeira matéria para organizar seus estudos
                </p>
                <Button onClick={() => setIsFormOpen(true)} data-testid="button-create-first-subject">
                  <i className="fas fa-plus mr-2"></i>
                  Criar primeira matéria
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects?.map((subject: Subject) => (
                <Card key={subject.id} className="hover-lift transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2" style={{ color: subject.color }}>
                          {subject.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {subject.description || "Sem descrição"}
                        </p>
                      </div>
                      <div className="flex space-x-1 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditSubject(subject)}
                          data-testid={`button-edit-subject-${subject.id}`}
                        >
                          <i className="fas fa-edit text-xs"></i>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteSubject(subject.id)}
                          data-testid={`button-delete-subject-${subject.id}`}
                        >
                          <i className="fas fa-trash text-xs text-destructive"></i>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        <Badge className={getCategoryColor(subject.category)}>
                          {subject.category === "exatas" ? "Exatas" : 
                           subject.category === "humanas" ? "Humanas" : "Biológicas"}
                        </Badge>
                        <Badge className={getPriorityColor(subject.priority || "medium")}>
                          {subject.priority === "high" ? "Alta" : 
                           subject.priority === "low" ? "Baixa" : "Média"}
                        </Badge>
                      </div>
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: subject.color }}
                      ></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      
      <MobileNav />
      <DashboardIcon />
    </div>
  );
}
