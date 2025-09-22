import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { 
  Container,
  Grid, 
  Card,
  Header,
  Button,
  Progress,
  Loader,
  Dimmer
} from 'semantic-ui-react';
import { 
  User, 
  BookOpen, 
  Target, 
  Clock, 
  Brain, 
  Plus,
  ArrowRight,
  Trophy,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton-row";
import { ResponsiveGrid } from "@/components/ui/responsive-components";
import FloatingSettings from "@/components/FloatingSettings";
import type { Subject, Goal } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [isActionsExpanded, setIsActionsExpanded] = useState(false);

  const { data: subjects, isLoading: subjectsLoading } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    enabled: isAuthenticated,
  });

  const { data: goals, isLoading: goalsLoading } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
    enabled: isAuthenticated,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<{
    subjects: string;
    todayHours: number;
    questionsGenerated: string;
    goalProgress: string;
  }>({
    queryKey: ["/api/analytics/stats"],
    enabled: isAuthenticated,
  });

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

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--nup-bg)' }}>
        <Dimmer active>
          <Loader size="large">Carregando...</Loader>
        </Dimmer>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--nup-bg)', padding: 'var(--spacing-lg)' }}>
      <Container>
        {/* Header Section */}
        <div className="mb-xl">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-lg)' }}>
            <div>
              <Header as="h1" style={{ fontSize: '32px', fontWeight: '600', color: 'var(--nup-gray-800)', marginBottom: 'var(--spacing-xs)' }}>
                Dashboard
              </Header>
            </div>
            <Button 
              primary
              icon="plus"
              content="Novo Material"
              onClick={() => navigate('/library?create=material')}
              data-testid="button-upload-material"
            />
          </div>
        </div>

        {/* Stats Overview */}
        <div className="mb-xl">
          <div 
            style={{ 
              borderRadius: '12px',
              backgroundColor: 'var(--nup-surface)',
              border: '1px solid rgba(0, 0, 0, 0.03)',
              boxShadow: isStatsExpanded ? '0 2px 8px rgba(0, 0, 0, 0.02), 0 1px 2px rgba(0, 0, 0, 0.03)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              overflow: 'hidden',
              marginBottom: 'var(--spacing-lg)'
            }}
            data-testid="stats-section"
          >
            <div 
              style={{ 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderBottom: isStatsExpanded ? '1px solid rgba(0, 0, 0, 0.04)' : 'none',
                transition: 'all 0.2s ease'
              }}
              onClick={() => setIsStatsExpanded(!isStatsExpanded)}
              data-testid="stats-toggle"
            >
              <Header as="h3" style={{ margin: 0, color: 'var(--nup-text)', fontSize: '18px', fontWeight: '500' }}>
                Acompanhe seu progresso diário
              </Header>
              <div style={{ transition: 'transform 0.2s ease' }}>
                {isStatsExpanded ? (
                  <ChevronUp style={{ width: '18px', height: '18px', color: 'var(--nup-gray-500)' }} />
                ) : (
                  <ChevronDown style={{ width: '18px', height: '18px', color: 'var(--nup-gray-400)' }} />
                )}
              </div>
            </div>
            
            <div 
              style={{
                maxHeight: isStatsExpanded ? '500px' : '0',
                opacity: isStatsExpanded ? 1 : 0,
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isStatsExpanded ? 'translateY(0)' : 'translateY(-10px)'
              }}
            >
              {isStatsExpanded && (
                <div style={{ padding: 'var(--spacing-md)' }}>
                  <ResponsiveGrid columns={4}>
                  {statsLoading ? (
                    <>
                      <Grid.Column><SkeletonCard /></Grid.Column>
                      <Grid.Column><SkeletonCard /></Grid.Column>
                      <Grid.Column><SkeletonCard /></Grid.Column>
                      <Grid.Column><SkeletonCard /></Grid.Column>
                    </>
                  ) : stats && (
                    <>
                      <Grid.Column>
                        <StatCard
                          icon={<BookOpen style={{ width: '32px', height: '32px' }} />}
                          value={stats.subjects}
                          label="Matérias"
                          variant="info"
                          data-testid="stat-subjects"
                        />
                      </Grid.Column>
                      <Grid.Column>
                        <StatCard
                          icon={<Clock style={{ width: '32px', height: '32px' }} />}
                          value={`${stats.todayHours}h`}
                          label="Hoje"
                          variant="success"
                          data-testid="stat-today-hours"
                        />
                      </Grid.Column>
                      <Grid.Column>
                        <StatCard
                          icon={<Brain style={{ width: '32px', height: '32px' }} />}
                          value={stats.questionsGenerated}
                          label="Questões IA"
                          variant="primary"
                          data-testid="stat-ai-questions"
                        />
                      </Grid.Column>
                      <Grid.Column>
                        <StatCard
                          icon={<Trophy style={{ width: '32px', height: '32px' }} />}
                          value={`${stats.goalProgress}%`}
                          label="Progresso"
                          variant="warning"
                          data-testid="stat-goal-progress"
                        />
                      </Grid.Column>
                    </>
                  )}
                  </ResponsiveGrid>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-xl">
          <div 
            style={{ 
              borderRadius: '12px',
              backgroundColor: 'var(--nup-surface)',
              border: '1px solid rgba(0, 0, 0, 0.03)',
              boxShadow: isActionsExpanded ? '0 2px 8px rgba(0, 0, 0, 0.02), 0 1px 2px rgba(0, 0, 0, 0.03)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              overflow: 'hidden',
              marginBottom: 'var(--spacing-lg)'
            }}
            data-testid="actions-section"
          >
            <div 
              style={{ 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderBottom: isActionsExpanded ? '1px solid rgba(0, 0, 0, 0.04)' : 'none',
                transition: 'all 0.2s ease'
              }}
              onClick={() => setIsActionsExpanded(!isActionsExpanded)}
              data-testid="actions-toggle"
            >
              <Header as="h3" style={{ margin: 0, color: 'var(--nup-text)', fontSize: '18px', fontWeight: '500' }}>
                Ações Rápidas
              </Header>
              <div style={{ transition: 'transform 0.2s ease' }}>
                {isActionsExpanded ? (
                  <ChevronUp style={{ width: '18px', height: '18px', color: 'var(--nup-gray-500)' }} />
                ) : (
                  <ChevronDown style={{ width: '18px', height: '18px', color: 'var(--nup-gray-400)' }} />
                )}
              </div>
            </div>
            
            <div 
              style={{
                maxHeight: isActionsExpanded ? '500px' : '0',
                opacity: isActionsExpanded ? 1 : 0,
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isActionsExpanded ? 'translateY(0)' : 'translateY(-10px)'
              }}
            >
              {isActionsExpanded && (
                <div style={{ padding: 'var(--spacing-md)' }}>
                  <ResponsiveGrid columns={3}>
            <Grid.Column>
              <Card 
                className="transition-smooth hover-lift" 
                style={{ cursor: 'pointer', height: '100%' }}
                onClick={() => navigate('/library')}
              >
                <Card.Content style={{ padding: 'var(--spacing-xl)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Header as="h3" style={{ marginBottom: 'var(--spacing-sm)' }}>
                        Biblioteca
                      </Header>
                      <p style={{ color: 'var(--nup-gray-600)', marginBottom: 'var(--spacing-md)', fontSize: '14px' }}>
                        Organize materiais, crie áreas de conhecimento e gerencie conteúdo
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', color: 'var(--nup-primary)', fontSize: '14px', fontWeight: '500' }}>
                        <span>Ver biblioteca</span>
                        <ArrowRight style={{ width: '16px', height: '16px', marginLeft: '8px' }} />
                      </div>
                    </div>
                    <BookOpen style={{ width: '48px', height: '48px', color: 'var(--nup-gray-400)' }} />
                  </div>
                </Card.Content>
              </Card>
            </Grid.Column>

            <Grid.Column>
              <Card style={{ height: '100%' }}>
                <Card.Content>
                  <Card.Header style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                    <User style={{ width: '20px', height: '20px', color: 'var(--nup-gray-500)' }} />
                    Seu Perfil
                  </Card.Header>
                  
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      width: '64px', 
                      height: '64px', 
                      backgroundColor: 'var(--nup-primary)', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      margin: '0 auto var(--spacing-md)' 
                    }}>
                      <User style={{ width: '32px', height: '32px', color: 'white' }} />
                    </div>
                    <Header as="h4" style={{ marginBottom: 'var(--spacing-xs)' }}>
                      {user?.firstName || 'Estudante'}
                    </Header>
                    <p style={{ fontSize: '14px', color: 'var(--nup-gray-600)', marginBottom: 'var(--spacing-md)' }}>
                      {user?.studyProfile === 'disciplined' && 'Disciplinado'}
                      {user?.studyProfile === 'undisciplined' && 'Flexível'}
                      {user?.studyProfile === 'average' && 'Balanceado'}
                      {!user?.studyProfile && 'Perfil não definido'}
                    </p>
                  </div>
                  
                  {stats && (
                    <div style={{ marginTop: 'var(--spacing-md)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: 'var(--spacing-xs)' }}>
                        <span style={{ color: 'var(--nup-gray-600)' }}>Progresso das Metas</span>
                        <span style={{ fontWeight: '500' }}>{stats.goalProgress}%</span>
                      </div>
                      <Progress 
                        percent={parseInt(stats.goalProgress)} 
                        color="blue"
                        size="small"
                        style={{ marginBottom: '0' }}
                      />
                    </div>
                  )}
                </Card.Content>
              </Card>
            </Grid.Column>
                  </ResponsiveGrid>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Overview */}
        <ResponsiveGrid columns={2}>
          {/* Recent Subjects */}
          <Grid.Column>
            <Card style={{ height: '100%' }}>
              <Card.Content>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                  <Card.Header>Matérias Recentes</Card.Header>
                  <Button 
                    basic 
                    size="small" 
                    content="Ver todas"
                    onClick={() => navigate('/library')}
                  />
                </div>
                
                {subjectsLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </div>
                ) : subjects && subjects.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                    {subjects.slice(0, 3).map((subject) => (
                      <Card 
                        key={subject.id}
                        className="transition-smooth"
                        style={{ 
                          cursor: 'pointer',
                          border: '1px solid var(--nup-gray-200)',
                          padding: 'var(--spacing-md)'
                        }}
                        onClick={() => navigate(`/library?subject=${subject.id}`)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontWeight: '500', marginBottom: 'var(--spacing-xs)' }}>{subject.name}</p>
                            <p style={{ fontSize: '14px', color: 'var(--nup-gray-600)', textTransform: 'capitalize' }}>
                              {subject.category}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '14px', fontWeight: '500' }}>
                              Prioridade {subject.priority}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<BookOpen style={{ width: '48px', height: '48px' }} />}
                    title="Nenhuma matéria"
                    description="Adicione sua primeira matéria para começar a organizar seus estudos"
                    action={{
                      label: "Adicionar matéria",
                      onClick: () => navigate('/library')
                    }}
                    data-testid="empty-subjects"
                  />
                )}
              </Card.Content>
            </Card>
          </Grid.Column>

          {/* Recent Goals */}
          <Grid.Column>
            <Card style={{ height: '100%' }}>
              <Card.Content>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                  <Card.Header>Metas Ativas</Card.Header>
                  <Button 
                    basic 
                    size="small" 
                    content="Ver todas"
                    onClick={() => navigate('/goals')}
                  />
                </div>
                
                {goalsLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </div>
                ) : goals && goals.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                    {goals.slice(0, 3).map((goal) => (
                      <Card 
                        key={goal.id}
                        className="transition-smooth"
                        style={{ 
                          cursor: 'pointer',
                          border: '1px solid var(--nup-gray-200)',
                          padding: 'var(--spacing-md)'
                        }}
                        onClick={() => navigate('/goals')}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-sm)' }}>
                          <p style={{ fontWeight: '500', flex: 1 }}>{goal.title}</p>
                          <Target style={{ width: '16px', height: '16px', color: 'var(--nup-gray-400)' }} />
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--nup-gray-600)' }}>
                          {goal.description || 'Meta sem descrição'}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Target style={{ width: '48px', height: '48px' }} />}
                    title="Nenhuma meta"
                    description="Defina metas de estudo para manter o foco e acompanhar seu progresso"
                    action={{
                      label: "Criar meta",
                      onClick: () => navigate('/goals')
                    }}
                    data-testid="empty-goals"
                  />
                )}
              </Card.Content>
            </Card>
          </Grid.Column>
        </ResponsiveGrid>
      </Container>
      <FloatingSettings />
    </div>
  );
}