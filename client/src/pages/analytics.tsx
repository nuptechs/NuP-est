import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  Container,
  Grid, 
  Card,
  Header,
  Button,
  Dropdown,
  Progress,
  Label,
  Icon,
  Segment,
  Message,
  Loader,
  Dimmer,
  Statistic
} from 'semantic-ui-react';
import { 
  TrendingUp, 
  Clock, 
  Brain, 
  Trophy, 
  Target as TargetIcon,
  Flame,
  BookOpen,
  BarChart3,
  Calendar,
  ChevronDown
} from "lucide-react";
import FloatingSettings from "@/components/FloatingSettings";
import type { Subject, StudySession, Target } from "@shared/schema";

export default function Analytics() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

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

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/analytics/stats"],
    enabled: isAuthenticated,
  });

  const { data: subjectProgress, isLoading: subjectsLoading } = useQuery({
    queryKey: ["/api/analytics/subjects"],
    enabled: isAuthenticated,
  });

  const { data: weeklyProgress, isLoading: weeklyLoading } = useQuery({
    queryKey: ["/api/analytics/weekly"],
    enabled: isAuthenticated,
  });

  const { data: recentSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["/api/study-sessions", "20"],
    enabled: isAuthenticated,
  });

  const { data: subjects } = useQuery({
    queryKey: ["/api/subjects"],
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return (
      <Dimmer active>
        <Loader size='large'>Carregando...</Loader>
      </Dimmer>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const getSessionTypeColor = (type: string) => {
    switch (type) {
      case "theory":
        return "blue";
      case "practice":
        return "green";
      case "ai_questions":
        return "purple";
      case "review":
        return "yellow";
      default:
        return "grey";
    }
  };

  const getSessionTypeLabel = (type: string) => {
    switch (type) {
      case "theory":
        return "Teoria";
      case "practice":
        return "Exercícios";
      case "ai_questions":
        return "Questões IA";
      case "review":
        return "Revisão";
      default:
        return type;
    }
  };

  const getTargetProgress = (target: Target) => {
    const current = parseFloat(target.currentValue || "0");
    const total = parseFloat(target.targetValue || "1");
    return Math.round((current / total) * 100);
  };

  const calculateStudyStreak = () => {
    if (!Array.isArray(recentSessions) || !recentSessions?.length) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streak = 0;
    const dailySessions = new Map();
    
    recentSessions.forEach((session: StudySession) => {
      const sessionDate = new Date(session.startedAt!);
      sessionDate.setHours(0, 0, 0, 0);
      const dateKey = sessionDate.getTime();
      
      if (!dailySessions.has(dateKey)) {
        dailySessions.set(dateKey, true);
      }
    });
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      checkDate.setHours(0, 0, 0, 0);
      
      if (dailySessions.has(checkDate.getTime())) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const calculateWeeklyStudyTime = () => {
    if (!Array.isArray(recentSessions) || !recentSessions?.length) return 0;
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return recentSessions
      .filter((session: StudySession) => new Date(session.startedAt!) >= oneWeekAgo)
      .reduce((total: number, session: StudySession) => total + (session.duration || 0), 0);
  };

  const studyStreak = calculateStudyStreak();
  const weeklyStudyTime = Math.round(calculateWeeklyStudyTime() / 60 * 100) / 100; // Convert to hours

  return (
    <Container fluid style={{ padding: '2rem', backgroundColor: 'var(--nup-bg)', minHeight: '100vh' }}>
      <Container>
        {/* Page Header */}
        <Header as='h1' size='large' className='main-title' style={{ marginBottom: '2rem' }}>
          <Icon>
            <BarChart3 size={28} style={{ color: 'var(--nup-primary)' }} />
          </Icon>
          <Header.Content>
            Analytics
            <Header.Subheader className='subtitle'>
              Acompanhe seu desempenho e evolução nos estudos
            </Header.Subheader>
          </Header.Content>
        </Header>

        {/* Overview Stats */}
        <Grid columns={4} stackable style={{ marginBottom: '2rem' }}>
          <Grid.Column>
            <Card className='nup-card--soft nup-card--warning nup-card-interactive'>
              <Card.Content className='nup-kpi'>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div>
                    <Statistic size='small'>
                      <Statistic.Value style={{ color: 'var(--nup-warning)' }} data-testid="stat-study-streak">
                        {studyStreak}
                      </Statistic.Value>
                      <Statistic.Label style={{ color: 'var(--nup-warning)', fontSize: '11px' }}>
                        Dias consecutivos
                      </Statistic.Label>
                    </Statistic>
                  </div>
                  <div className='nup-kpi__icon'>
                    <Flame size={32} style={{ color: 'var(--nup-warning)' }} />
                  </div>
                </div>
              </Card.Content>
            </Card>
          </Grid.Column>

          <Grid.Column>
            <Card className='nup-card--soft nup-card--success nup-card-interactive'>
              <Card.Content className='nup-kpi'>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div>
                    <Statistic size='small'>
                      <Statistic.Value style={{ color: 'var(--nup-success)' }} data-testid="stat-weekly-hours">
                        {weeklyStudyTime}h
                      </Statistic.Value>
                      <Statistic.Label style={{ color: 'var(--nup-success)', fontSize: '11px' }}>
                        Esta semana
                      </Statistic.Label>
                    </Statistic>
                  </div>
                  <div className='nup-kpi__icon'>
                    <Clock size={32} style={{ color: 'var(--nup-success)' }} />
                  </div>
                </div>
              </Card.Content>
            </Card>
          </Grid.Column>

          <Grid.Column>
            <Card className='nup-card--soft nup-card--primary nup-card-interactive'>
              <Card.Content className='nup-kpi'>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div>
                    <Statistic size='small'>
                      <Statistic.Value style={{ color: 'var(--nup-primary)' }} data-testid="stat-ai-questions">
                        {(stats as any)?.questionsGenerated || 0}
                      </Statistic.Value>
                      <Statistic.Label style={{ color: 'var(--nup-primary)', fontSize: '11px' }}>
                        Questões IA
                      </Statistic.Label>
                    </Statistic>
                  </div>
                  <div className='nup-kpi__icon'>
                    <Brain size={32} style={{ color: 'var(--nup-primary)' }} />
                  </div>
                </div>
              </Card.Content>
            </Card>
          </Grid.Column>

          <Grid.Column>
            <Card className='nup-card--soft nup-card--info nup-card-interactive'>
              <Card.Content className='nup-kpi'>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div>
                    <Statistic size='small'>
                      <Statistic.Value style={{ color: 'var(--nup-info)' }} data-testid="stat-goal-completion">
                        {(stats as any)?.goalProgress || 0}%
                      </Statistic.Value>
                      <Statistic.Label style={{ color: 'var(--nup-info)', fontSize: '11px' }}>
                        Metas concluídas
                      </Statistic.Label>
                    </Statistic>
                  </div>
                  <div className='nup-kpi__icon'>
                    <Trophy size={32} style={{ color: 'var(--nup-info)' }} />
                  </div>
                </div>
              </Card.Content>
            </Card>
          </Grid.Column>
        </Grid>

        {/* Subject Progress and Weekly Goals */}
        <Grid columns={3} stackable>
          {/* Subject Progress */}
          <Grid.Column width={10}>
            <Card className='nup-card-subtle'>
              <Card.Content>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <Header as='h3' className='section-title'>
                    <Icon>
                      <BarChart3 size={20} style={{ color: 'var(--nup-primary)' }} />
                    </Icon>
                    <Header.Content>
                      Progresso por Matéria
                    </Header.Content>
                  </Header>
                  <Dropdown
                    selection
                    compact
                    defaultValue='month'
                    data-testid="select-progress-period"
                    options={[
                      { key: 'week', value: 'week', text: 'Esta semana' },
                      { key: 'month', value: 'month', text: 'Este mês' },
                      { key: 'quarter', value: 'quarter', text: 'Este trimestre' }
                    ]}
                  />
                </div>
                {subjectsLoading ? (
                  <div>
                    {[...Array(3)].map((_, i) => (
                      <Segment key={i} loading style={{ marginBottom: '1rem' }}>
                        <div style={{ height: '60px' }}></div>
                      </Segment>
                    ))}
                  </div>
                ) : !Array.isArray(subjectProgress) || !subjectProgress?.length ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                    <div className='empty-state-icon' style={{ marginBottom: '1rem' }}>
                      <BarChart3 size={48} style={{ color: 'var(--nup-text-tertiary)' }} />
                    </div>
                    <Header as='h4' className='card-description'>
                      Nenhuma matéria cadastrada
                    </Header>
                    <p className='card-meta'>
                      Adicione matérias para ver o progresso
                    </p>
                  </div>
                ) : (
                  <div style={{ marginTop: '1rem' }}>
                    {Array.isArray(subjectProgress) && subjectProgress?.map((subject: any) => (
                      <Segment key={subject.id} className='session-item' style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div 
                              style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                backgroundColor: subject.color,
                                marginRight: '12px'
                              }}
                            />
                            <Header as='h5' className='card-title' style={{ margin: 0 }} data-testid={`subject-analytics-${subject.id}`}>
                              {subject.name}
                            </Header>
                          </div>
                          <span className='card-meta' data-testid={`subject-total-hours-${subject.id}`}>
                            {subject.totalHours}h total
                          </span>
                        </div>
                        
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className='card-meta'>Progresso geral</span>
                            <span className='card-title' style={{ fontSize: '12px' }} data-testid={`subject-progress-percent-${subject.id}`}>
                              {subject.progress}%
                            </span>
                          </div>
                          <Progress 
                            percent={subject.progress} 
                            color={subject.progress > 70 ? 'green' : subject.progress > 40 ? 'yellow' : 'red'}
                            size='tiny'
                          />
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem' }}>
                            <span className='card-meta'>
                              <Icon>
                                <FileText size={12} />
                              </Icon>
                              <span data-testid={`subject-materials-count-${subject.id}`}>{subject.materials}</span> materiais
                            </span>
                            <span className='card-meta'>
                              <Icon>
                                <Brain size={12} />
                              </Icon>
                              <span data-testid={`subject-questions-count-${subject.id}`}>{subject.questions}</span> questões
                            </span>
                          </div>
                        </div>
                      </Segment>
                    ))}
                  </div>
                )}
              </Card.Content>
            </Card>
          </Grid.Column>

          {/* Weekly Goals */}
          <Grid.Column width={6}>
            <Card className='nup-card-subtle'>
              <Card.Content>
                <Header as='h3' className='section-title' style={{ marginBottom: '1.5rem' }}>
                  <Icon>
                    <TargetIcon size={20} style={{ color: 'var(--nup-primary)' }} />
                  </Icon>
                  <Header.Content>
                    Metas da Semana
                  </Header.Content>
                </Header>
                {weeklyLoading ? (
                  <div>
                    {[...Array(3)].map((_, i) => (
                      <Segment key={i} loading style={{ marginBottom: '1rem' }}>
                        <div style={{ height: '40px' }}></div>
                      </Segment>
                    ))}
                  </div>
                ) : !Array.isArray(weeklyProgress) || !weeklyProgress?.length ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                    <div className='empty-state-icon' style={{ marginBottom: '1rem', width: '48px', height: '48px' }}>
                      <TargetIcon size={32} style={{ color: 'var(--nup-text-tertiary)' }} />
                    </div>
                    <p className='card-description'>
                      Nenhuma meta semanal
                    </p>
                  </div>
                ) : (
                  <div>
                    {Array.isArray(weeklyProgress) && weeklyProgress?.map((goal: any) => (
                      <div key={goal.id} style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span className='card-title' style={{ fontSize: '14px' }} data-testid={`weekly-goal-name-${goal.id}`}>
                            {goal.name}
                          </span>
                          <span className='card-meta' data-testid={`weekly-goal-progress-${goal.id}`}>
                            {goal.progress}
                          </span>
                        </div>
                        <Progress 
                          percent={goal.percentage} 
                          color={goal.percentage > 70 ? 'green' : goal.percentage > 40 ? 'yellow' : 'red'}
                          size='tiny'
                        />
                      </div>
                    ))}
                  </div>
                )}
              </Card.Content>
            </Card>
          </Grid.Column>
        </Grid>

        {/* Simplified Analytics */}
        <Card className='nup-card-subtle' style={{ marginTop: '2rem' }}>
          <Card.Content>
            <Header as='h3' className='section-title'>
              <Icon>
                <TrendingUp size={20} style={{ color: 'var(--nup-primary)' }} />
              </Icon>
              <Header.Content>
                Analytics em desenvolvimento
              </Header.Content>
            </Header>
            <p className='card-description'>
              Interface de analytics atualizada em breve...
            </p>
          </Card.Content>
        </Card>
      </Container>
      
      <FloatingSettings />
    </Container>
  );
}
