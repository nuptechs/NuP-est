import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AiStudyModal from "@/components/study/ai-study-modal";
import { 
  Container,
  Grid, 
  Card,
  Header,
  Button,
  Dropdown,
  Label,
  Icon,
  Segment,
  Message,
  Loader,
  Dimmer
} from 'semantic-ui-react';
import { BookOpen, Bot, BarChart3, Clock, Play, FileText, GraduationCap, History } from "lucide-react";
import FloatingSettings from "@/components/FloatingSettings";
import type { Subject } from "@shared/schema";

export default function Study() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [isAiStudyOpen, setIsAiStudyOpen] = useState(false);

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

  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
    enabled: isAuthenticated,
  });

  const { data: materials } = useQuery<any[]>({
    queryKey: [`/api/materials?subjectId=${selectedSubject}`],
    enabled: isAuthenticated && !!selectedSubject,
  });

  const { data: recentSessions } = useQuery<any[]>({
    queryKey: ["/api/study-sessions"],
    enabled: isAuthenticated,
  });

  const handleStartAiStudy = () => {
    if (!selectedSubject) {
      toast({
        title: "Selecione uma matéria",
        description: "Escolha uma matéria para gerar questões personalizadas",
        variant: "destructive",
      });
      return;
    }

    const subjectMaterials = materials?.filter((m: any) => m.subjectId === selectedSubject);
    if (!subjectMaterials?.length) {
      toast({
        title: "Materiais necessários",
        description: "Adicione materiais para esta matéria antes de gerar questões",
        variant: "destructive",
      });
      return;
    }

    setIsAiStudyOpen(true);
  };

  const studyMethods = [
    {
      title: "Questões IA",
      description: "Questões personalizadas geradas pela IA com base em seus materiais",
      icon: "fa-robot",
      color: "primary",
      action: handleStartAiStudy,
    },
    {
      title: "Revisão de Conceitos",
      description: "Revise teoria e conceitos importantes das suas matérias",
      icon: "fa-book-open",
      color: "secondary",
      action: () => toast({ title: "Em desenvolvimento", description: "Esta funcionalidade estará disponível em breve" }),
    },
    {
      title: "Flashcards",
      description: "Sistema de repetição espaçada para memorização eficiente",
      icon: "fa-layer-group",
      color: "accent",
      action: () => toast({ title: "Em desenvolvimento", description: "Esta funcionalidade estará disponível em breve" }),
    },
    {
      title: "Simulados",
      description: "Provas completas para testar seu conhecimento",
      icon: "fa-clock",
      color: "destructive",
      action: () => toast({ title: "Em desenvolvimento", description: "Esta funcionalidade estará disponível em breve" }),
    },
  ];

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

  return (
    <Container fluid style={{ padding: '2rem', backgroundColor: 'var(--nup-bg)', minHeight: '100vh' }}>
      <Container>
        {/* Page Header */}
        <Header as='h1' size='large' className='main-title' style={{ marginBottom: '2rem' }}>
          <Icon>
            <GraduationCap size={28} style={{ color: 'var(--nup-primary)' }} />
          </Icon>
          <Header.Content>
            Estudar
            <Header.Subheader className='subtitle'>
              Escolha seu método de estudo e comece a praticar
            </Header.Subheader>
          </Header.Content>
        </Header>
        {/* Subject Selection */}
        <Segment className='nup-card-subtle mb-lg'>
          <Header as='h3' className='section-title'>
            <Icon>
              <GraduationCap size={20} style={{ color: 'var(--nup-primary)' }} />
            </Icon>
            <Header.Content>
              Configuração da Sessão
            </Header.Content>
          </Header>
          
          <div style={{ marginTop: '1.5rem' }}>
            <Label className='card-description' style={{ display: 'block', marginBottom: '0.5rem' }}>
              Selecione a matéria para estudar:
            </Label>
            <Dropdown
              placeholder='Escolha uma matéria'
              fluid
              selection
              value={selectedSubject}
              onChange={(e, { value }) => setSelectedSubject(value as string)}
              data-testid="select-study-subject"
              options={subjects?.map((subject: Subject) => ({
                key: subject.id,
                value: subject.id,
                text: (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div 
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: subject.color || '#666',
                        marginRight: '8px'
                      }}
                    />
                    {subject.name}
                  </div>
                )
              })) || []}
            />
            
            {selectedSubject && (
              <Message info style={{ marginTop: '1rem' }}>
                <Icon>
                  <FileText size={16} />
                </Icon>
                {materials?.length || 0} material{materials?.length !== 1 ? 's' : ''} disponível{materials?.length !== 1 ? 's' : ''}
              </Message>
            )}
          </div>
        </Segment>

        {/* Study Methods */}
        <div style={{ marginBottom: '2rem' }}>
          <Header as='h2' className='section-title' style={{ marginBottom: '1.5rem' }}>
            Métodos de Estudo
          </Header>
          <Grid columns={2} stackable>
            <Grid.Column>
              <Card 
                className='nup-card-interactive hover-lift transition-smooth'
                onClick={handleStartAiStudy}
                data-testid="button-ai-study"
                style={{ cursor: 'pointer', height: '100%' }}
              >
                <Card.Content>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div className='icon-container primary'>
                        <Bot size={24} style={{ color: 'var(--nup-primary)' }} />
                      </div>
                      <div>
                        <Card.Header className='card-title'>Questões IA</Card.Header>
                        <Card.Description className='card-description'>
                          Questões personalizadas geradas pela IA com base em seus materiais
                        </Card.Description>
                      </div>
                    </div>
                    <Icon>
                      <Play size={20} style={{ color: 'var(--nup-text-tertiary)' }} />
                    </Icon>
                  </div>
                </Card.Content>
              </Card>
            </Grid.Column>
            
            <Grid.Column>
              <Card 
                className='nup-card-interactive transition-smooth'
                onClick={() => toast({ title: "Em desenvolvimento", description: "Esta funcionalidade estará disponível em breve" })}
                style={{ cursor: 'pointer', height: '100%', opacity: 0.75 }}
              >
                <Card.Content>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div className='icon-container success'>
                        <BookOpen size={24} style={{ color: 'var(--nup-success)' }} />
                      </div>
                      <div>
                        <Card.Header className='card-title'>Revisão de Conceitos</Card.Header>
                        <Card.Description className='card-description'>
                          Revise teoria e conceitos importantes das suas matérias
                        </Card.Description>
                      </div>
                    </div>
                    <Label size='mini' className='status-label'>Em breve</Label>
                  </div>
                </Card.Content>
              </Card>
            </Grid.Column>
            
            <Grid.Column>
              <Card 
                className='nup-card-interactive transition-smooth'
                onClick={() => toast({ title: "Em desenvolvimento", description: "Esta funcionalidade estará disponível em breve" })}
                style={{ cursor: 'pointer', height: '100%', opacity: 0.75 }}
              >
                <Card.Content>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div className='icon-container info'>
                        <BarChart3 size={24} style={{ color: 'var(--nup-info)' }} />
                      </div>
                      <div>
                        <Card.Header className='card-title'>Flashcards</Card.Header>
                        <Card.Description className='card-description'>
                          Sistema de repetição espaçada para memorização eficiente
                        </Card.Description>
                      </div>
                    </div>
                    <Label size='mini' className='status-label'>Em breve</Label>
                  </div>
                </Card.Content>
              </Card>
            </Grid.Column>
            
            <Grid.Column>
              <Card 
                className='nup-card-interactive transition-smooth'
                onClick={() => toast({ title: "Em desenvolvimento", description: "Esta funcionalidade estará disponível em breve" })}
                style={{ cursor: 'pointer', height: '100%', opacity: 0.75 }}
              >
                <Card.Content>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div className='icon-container warning'>
                        <Clock size={24} style={{ color: 'var(--nup-warning)' }} />
                      </div>
                      <div>
                        <Card.Header className='card-title'>Simulados</Card.Header>
                        <Card.Description className='card-description'>
                          Provas completas para testar seu conhecimento
                        </Card.Description>
                      </div>
                    </div>
                    <Label size='mini' className='status-label'>Em breve</Label>
                  </div>
                </Card.Content>
              </Card>
            </Grid.Column>
          </Grid>
        </div>

        {/* Recent Sessions */}
        <Segment className='nup-card-subtle'>
          <Header as='h3' className='section-title'>
            <Icon>
              <History size={20} style={{ color: 'var(--nup-text-secondary)' }} />
            </Icon>
            <Header.Content>
              Sessões Recentes
            </Header.Content>
          </Header>
          
          {!recentSessions?.length ? (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <div className='empty-state-icon' style={{ marginBottom: '1rem' }}>
                <History size={48} style={{ color: 'var(--nup-text-tertiary)' }} />
              </div>
              <Header as='h4' className='card-description' style={{ marginBottom: '0.5rem' }}>
                Nenhuma sessão de estudo encontrada
              </Header>
              <p className='card-meta'>
                Comece estudando para ver seu histórico aqui
              </p>
            </div>
          ) : (
            <div style={{ marginTop: '1.5rem' }}>
              {recentSessions?.slice(0, 5).map((session: any) => {
                const subject = subjects?.find((s: Subject) => s.id === session.subjectId);
                return (
                  <Segment key={session.id} className='session-item' style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className={`icon-container ${session.completed ? 'success' : 'warning'}`}>
                          {session.completed ? (
                            <BarChart3 size={20} style={{ color: 'var(--nup-success)' }} />
                          ) : (
                            <Clock size={20} style={{ color: 'var(--nup-warning)' }} />
                          )}
                        </div>
                        <div>
                          <Header as='h5' className='card-title' style={{ margin: 0 }}>
                            {subject?.name || "Matéria não encontrada"}
                          </Header>
                          <p className='card-description' style={{ margin: 0, fontSize: '13px' }}>
                            {session.duration} min • {session.type}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {session.completed && session.score && (
                          <p className='card-title' style={{ margin: 0, fontSize: '14px' }}>{session.score}%</p>
                        )}
                        <p className='card-meta' style={{ margin: 0, fontSize: '12px' }}>
                          {new Date(session.startedAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </Segment>
                );
              })}
            </div>
          )}
        </Segment>
      </Container>
      
      <FloatingSettings />
      
      <AiStudyModal 
        isOpen={isAiStudyOpen}
        onClose={() => setIsAiStudyOpen(false)}
        subjectId={selectedSubject}
      />
    </Container>
  );
}
