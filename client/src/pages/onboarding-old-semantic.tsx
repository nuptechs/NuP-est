import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Container, 
  Card, 
  Button, 
  Input, 
  Checkbox, 
  Dropdown, 
  Form, 
  Header, 
  Icon, 
  Step, 
  Segment, 
  Grid, 
  Progress,
  Message
} from "semantic-ui-react";
import { ArrowLeft, ArrowRight, Sparkles, BookOpen, Target, Clock, Brain, Heart, LayoutDashboard } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { User } from "@shared/schema";

interface OnboardingData {
  age?: number;
  studyProfile: string;
  learningDifficulties: string[];
  customDifficulties?: string;
  studyObjective?: string;
  studyDeadline?: Date;
  dailyStudyHours?: number;
  preferredStudyTime?: string;
  learningStyle: string;
  preferredExplanationStyle: string;
  needsMotivation: boolean;
  prefersExamples: boolean;
}

const STEPS = [
  { id: 1, title: "Perfil Básico", icon: "user", color: "blue" },
  { id: 2, title: "Dificuldades", icon: "puzzle", color: "purple" },
  { id: 3, title: "Objetivos", icon: "crosshairs", color: "green" },
  { id: 4, title: "Preferências", icon: "heart", color: "pink" },
  { id: 5, title: "Finalizar", icon: "star", color: "yellow" },
];

const LEARNING_DIFFICULTIES = [
  { value: "none", label: "Nenhuma dificuldade específica" },
  { value: "adhd", label: "TDAH - Transtorno do Déficit de Atenção" },
  { value: "dyslexia", label: "Dislexia - Dificuldade na leitura" },
  { value: "autism", label: "Autismo - TEA" },
  { value: "dyscalculia", label: "Discalculia - Dificuldade com matemática" },
  { value: "attention_deficit", label: "Déficit de atenção" },
  { value: "reading_comprehension", label: "Dificuldade de compreensão textual" },
  { value: "math_difficulty", label: "Dificuldade com cálculos" },
  { value: "memory_issues", label: "Problemas de memória" },
  { value: "processing_speed", label: "Velocidade de processamento baixa" },
  { value: "other", label: "Outras (especificar)" },
];

const STUDY_OBJECTIVES = [
  "ENEM", "Vestibular", "Concurso Público", "Pós-graduação", "Certificação Profissional",
  "Aprendizado Pessoal", "Reforço Escolar", "Preparação para Prova", "Outro"
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    studyProfile: "average",
    learningDifficulties: [],
    learningStyle: "mixed",
    preferredExplanationStyle: "balanced",
    needsMotivation: false,
    prefersExamples: true,
  });
  const [isLoading, setIsLoading] = useState(false);

  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<{type: 'success' | 'error', content: string} | null>(null);
  
  // Detectar se está em modo de edição
  const isEditMode = new URLSearchParams(window.location.search).get('mode') === 'edit';
  
  // Carregar dados atuais do usuário se estiver em modo de edição
  const { data: currentUserData } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: isEditMode && isAuthenticated,
  });

  // Pré-preencher dados quando carregar em modo de edição
  useEffect(() => {
    if (isEditMode && currentUserData) {
      setData({
        age: currentUserData.age || undefined,
        studyProfile: currentUserData.studyProfile || "average",
        learningDifficulties: currentUserData.learningDifficulties || [],
        customDifficulties: currentUserData.customDifficulties || undefined,
        studyObjective: currentUserData.studyObjective || undefined,
        studyDeadline: currentUserData.studyDeadline ? new Date(currentUserData.studyDeadline) : undefined,
        dailyStudyHours: currentUserData.dailyStudyHours ? Number(currentUserData.dailyStudyHours) : undefined,
        preferredStudyTime: currentUserData.preferredStudyTime || "flexible",
        learningStyle: currentUserData.learningStyle || "mixed",
        preferredExplanationStyle: currentUserData.preferredExplanationStyle || "balanced",
        needsMotivation: currentUserData.needsMotivation || false,
        prefersExamples: currentUserData.prefersExamples !== false, // default true
      });
    }
  }, [isEditMode, currentUserData]);

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: OnboardingData) => {
      const response = await fetch("/api/auth/user", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...profileData,
          onboardingCompleted: true,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update profile");
      }
      
      return response.json();
    },
    onSuccess: async () => {
      // Força atualização do cache do usuário
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
      
      setMessage({
        type: 'success',
        content: 'Perfil configurado com sucesso! Agora você terá uma experiência de estudo personalizada.'
      });
      
      // Aguarda um momento para garantir que o estado seja atualizado
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 100);
    },
    onError: () => {
      setMessage({
        type: 'error',
        content: 'Erro ao salvar perfil. Tente novamente em alguns instantes.'
      });
    },
  });

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    setIsLoading(true);
    updateProfileMutation.mutate(data);
  };

  const updateData = (field: keyof OnboardingData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ padding: '2rem 0' }}
          >
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <BookOpen 
                style={{ 
                  width: '48px', 
                  height: '48px', 
                  color: 'var(--nup-primary)', 
                  margin: '0 auto 1rem' 
                }} 
              />
              <Header as="h2" style={{ marginBottom: '0.5rem', color: 'var(--nup-text-primary)' }}>
                {isEditMode ? "Atualize seu perfil" : "Vamos conhecer você!"}
              </Header>
              <p style={{ color: 'var(--nup-text-secondary)', fontSize: '1rem' }}>
                {isEditMode 
                  ? "Revise e atualize suas informações de estudante"
                  : "Conte-nos um pouco sobre seu perfil de estudante"
                }
              </p>
            </div>

            <Form>
              <Form.Field style={{ marginBottom: '1.5rem' }}>
                <label style={{ color: 'var(--nup-text-primary)', marginBottom: '0.5rem', display: 'block' }}>Idade (opcional)</label>
                <Input
                  type="number"
                  value={data.age || ""}
                  onChange={(e) => updateData("age", parseInt(e.target.value) || undefined)}
                  placeholder="Ex: 18"
                  style={{ 
                    backgroundColor: 'var(--nup-bg-secondary)',
                    border: '1px solid var(--nup-border)',
                    color: 'var(--nup-text-primary)'
                  }}
                  data-testid="input-age"
                />
              </Form.Field>

              <Form.Field>
                <label style={{ color: 'var(--nup-text-primary)', marginBottom: '0.5rem', display: 'block' }}>Como você se considera como estudante?</label>
                <Dropdown
                  selection
                  fluid
                  value={data.studyProfile}
                  onChange={(e, { value }) => updateData("studyProfile", value)}
                  options={[
                    { key: 'disciplined', value: 'disciplined', text: 'Disciplinado - Tenho rotina fixa e sigo cronogramas' },
                    { key: 'average', value: 'average', text: 'Moderado - Estudo quando possível' },
                    { key: 'undisciplined', value: 'undisciplined', text: 'Flexível - Prefiro estudar quando sinto vontade' }
                  ]}
                  style={{ 
                    backgroundColor: 'var(--nup-bg-secondary)',
                    color: 'var(--nup-text-primary)'
                  }}
                  data-testid="dropdown-study-profile"
                />
              </Form.Field>
            </Form>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ padding: '2rem 0' }}
          >
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <Brain 
                style={{ 
                  width: '48px', 
                  height: '48px', 
                  color: '#9333ea', 
                  margin: '0 auto 1rem' 
                }} 
              />
              <Header as="h2" style={{ marginBottom: '0.5rem', color: 'var(--nup-text-primary)' }}>
                {isEditMode ? "Atualize suas dificuldades" : "Desafios de Aprendizado"}
              </Header>
              <p style={{ color: 'var(--nup-text-secondary)', fontSize: '1rem' }}>
                {isEditMode 
                  ? "Revise suas dificuldades de aprendizado atuais"
                  : "Conhecer suas dificuldades nos ajuda a personalizar sua experiência"
                }
              </p>
            </div>

            <Form>
              <Form.Field>
                <label style={{ color: 'var(--nup-text-primary)', marginBottom: '1rem', display: 'block' }}>Marque todas as dificuldades que se aplicam a você:</label>
                <div style={{ maxHeight: '320px', overflowY: 'auto', padding: '0.5rem' }}>
                  {LEARNING_DIFFICULTIES.map((difficulty) => (
                    <div key={difficulty.value} style={{ marginBottom: '0.75rem' }}>
                      <Checkbox
                        label={difficulty.label}
                        checked={data.learningDifficulties.includes(difficulty.value)}
                        onChange={(e, { checked }) => {
                          if (checked) {
                            updateData("learningDifficulties", [...data.learningDifficulties, difficulty.value]);
                          } else {
                            updateData("learningDifficulties", data.learningDifficulties.filter(d => d !== difficulty.value));
                          }
                        }}
                        style={{ 
                          color: 'var(--nup-text-primary)'
                        }}
                        data-testid={`checkbox-difficulty-${difficulty.value}`}
                      />
                    </div>
                  ))}
                </div>
              </Form.Field>

              {data.learningDifficulties.includes("other") && (
                <Form.Field style={{ marginTop: '1.5rem' }}>
                  <label style={{ color: 'var(--nup-text-primary)', marginBottom: '0.5rem', display: 'block' }}>Descreva suas dificuldades específicas:</label>
                  <Form.TextArea
                    value={data.customDifficulties || ""}
                    onChange={(e, { value }) => updateData("customDifficulties", value as string)}
                    placeholder="Descreva suas dificuldades específicas..."
                    style={{ 
                      backgroundColor: 'var(--nup-bg-secondary)',
                      border: '1px solid var(--nup-border)',
                      color: 'var(--nup-text-primary)'
                    }}
                    data-testid="textarea-custom-difficulties"
                  />
                </Form.Field>
              )}
            </Form>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ padding: '2rem 0' }}
          >
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <Target 
                style={{ 
                  width: '48px', 
                  height: '48px', 
                  color: '#10b981', 
                  margin: '0 auto 1rem' 
                }} 
              />
              <Header as="h2" style={{ marginBottom: '0.5rem', color: 'var(--nup-text-primary)' }}>
                {isEditMode ? "Atualize seus objetivos" : "Seus Objetivos"}
              </Header>
              <p style={{ color: 'var(--nup-text-secondary)', fontSize: '1rem' }}>
                {isEditMode 
                  ? "Revise seus objetivos e metas de estudo"
                  : "Vamos alinhar seus estudos com seus objetivos"
                }
              </p>
            </div>

            <Form>
              <Form.Field style={{ marginBottom: '1.5rem' }}>
                <label style={{ color: 'var(--nup-text-primary)', marginBottom: '0.5rem', display: 'block' }}>Qual é seu principal objetivo de estudos?</label>
                <Dropdown
                  selection
                  fluid
                  placeholder="Selecione seu objetivo"
                  value={data.studyObjective || ""}
                  onChange={(e, { value }) => updateData("studyObjective", value)}
                  options={STUDY_OBJECTIVES.map(objective => ({
                    key: objective,
                    value: objective,
                    text: objective
                  }))}
                  style={{ 
                    backgroundColor: 'var(--nup-bg-secondary)',
                    color: 'var(--nup-text-primary)'
                  }}
                  data-testid="dropdown-study-objective"
                />
              </Form.Field>

              <Form.Field style={{ marginBottom: '1.5rem' }}>
                <label style={{ color: 'var(--nup-text-primary)', marginBottom: '0.5rem', display: 'block' }}>Você tem uma data limite? (opcional)</label>
                <Input
                  type="date"
                  value={data.studyDeadline ? data.studyDeadline.toISOString().split('T')[0] : ""}
                  onChange={(e) => updateData("studyDeadline", e.target.value ? new Date(e.target.value) : undefined)}
                  style={{ 
                    backgroundColor: 'var(--nup-bg-secondary)',
                    border: '1px solid var(--nup-border)',
                    color: 'var(--nup-text-primary)'
                  }}
                  data-testid="input-deadline"
                />
              </Form.Field>

              <Form.Field style={{ marginBottom: '1.5rem' }}>
                <label style={{ color: 'var(--nup-text-primary)', marginBottom: '0.5rem', display: 'block' }}>Quantas horas por dia você pode estudar?</label>
                <div style={{ padding: '1rem 0' }}>
                  <Input
                    type="range"
                    min="0.5"
                    max="12"
                    step="0.5"
                    value={data.dailyStudyHours || 2}
                    onChange={(e) => updateData("dailyStudyHours", parseFloat(e.target.value))}
                    style={{ width: '100%', marginBottom: '0.5rem' }}
                    data-testid="slider-study-hours"
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--nup-text-secondary)' }}>
                    <span>30min</span>
                    <span style={{ fontWeight: '500', color: 'var(--nup-text-primary)' }}>
                      {data.dailyStudyHours || 2}h
                    </span>
                    <span>12h</span>
                  </div>
                </div>
              </Form.Field>

              <Form.Field>
                <label style={{ color: 'var(--nup-text-primary)', marginBottom: '0.5rem', display: 'block' }}>Qual seu horário preferido para estudar?</label>
                <Dropdown
                  selection
                  fluid
                  placeholder="Selecione o horário"
                  value={data.preferredStudyTime || ""}
                  onChange={(e, { value }) => updateData("preferredStudyTime", value)}
                  options={[
                    { key: 'morning', value: 'morning', text: 'Manhã (6h - 12h)' },
                    { key: 'afternoon', value: 'afternoon', text: 'Tarde (12h - 18h)' },
                    { key: 'evening', value: 'evening', text: 'Noite (18h - 22h)' },
                    { key: 'late_night', value: 'late_night', text: 'Madrugada (22h - 6h)' },
                    { key: 'flexible', value: 'flexible', text: 'Flexível' }
                  ]}
                  style={{ 
                    backgroundColor: 'var(--nup-bg-secondary)',
                    color: 'var(--nup-text-primary)'
                  }}
                  data-testid="dropdown-study-time"
                />
              </Form.Field>
            </Form>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ padding: '2rem 0' }}
          >
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <Heart 
                style={{ 
                  width: '48px', 
                  height: '48px', 
                  color: '#ec4899', 
                  margin: '0 auto 1rem' 
                }} 
              />
              <Header as="h2" style={{ marginBottom: '0.5rem', color: 'var(--nup-text-primary)' }}>
                {isEditMode ? "Atualize suas preferências" : "Suas Preferências"}
              </Header>
              <p style={{ color: 'var(--nup-text-secondary)', fontSize: '1rem' }}>
                {isEditMode 
                  ? "Revise como você prefere aprender e estudar"
                  : "Como você prefere aprender?"
                }
              </p>
            </div>

            <Form>
              <Form.Field style={{ marginBottom: '1.5rem' }}>
                <label style={{ color: 'var(--nup-text-primary)', marginBottom: '0.5rem', display: 'block' }}>Qual seu estilo de aprendizado?</label>
                <Dropdown
                  selection
                  fluid
                  value={data.learningStyle}
                  onChange={(e, { value }) => updateData("learningStyle", value)}
                  options={[
                    { key: 'visual', value: 'visual', text: 'Visual - Prefiro gráficos, diagramas e imagens' },
                    { key: 'auditory', value: 'auditory', text: 'Auditivo - Prefiro ouvir explicações e discussões' },
                    { key: 'kinesthetic', value: 'kinesthetic', text: 'Cinestésico - Aprendo fazendo e praticando' },
                    { key: 'reading_writing', value: 'reading_writing', text: 'Leitura/Escrita - Prefiro textos e anotações' },
                    { key: 'mixed', value: 'mixed', text: 'Misto - Combino diferentes estilos' }
                  ]}
                  style={{ 
                    backgroundColor: 'var(--nup-bg-secondary)',
                    color: 'var(--nup-text-primary)'
                  }}
                  data-testid="dropdown-learning-style"
                />
              </Form.Field>

              <Form.Field style={{ marginBottom: '1.5rem' }}>
                <label style={{ color: 'var(--nup-text-primary)', marginBottom: '0.5rem', display: 'block' }}>Como prefere as explicações?</label>
                <Dropdown
                  selection
                  fluid
                  value={data.preferredExplanationStyle}
                  onChange={(e, { value }) => updateData("preferredExplanationStyle", value)}
                  options={[
                    { key: 'simple', value: 'simple', text: 'Simples - Linguagem clara e direta' },
                    { key: 'detailed', value: 'detailed', text: 'Detalhada - Explicações completas e minuciosas' },
                    { key: 'practical', value: 'practical', text: 'Prática - Focada em aplicações reais' },
                    { key: 'theoretical', value: 'theoretical', text: 'Teórica - Com fundamentos e conceitos' },
                    { key: 'balanced', value: 'balanced', text: 'Equilibrada - Mix de teoria e prática' }
                  ]}
                  style={{ 
                    backgroundColor: 'var(--nup-bg-secondary)',
                    color: 'var(--nup-text-primary)'
                  }}
                  data-testid="dropdown-explanation-style"
                />
              </Form.Field>

              <Form.Field>
                <div style={{ marginBottom: '0.75rem' }}>
                  <Checkbox
                    label="Preciso de motivação e encorajamento constante"
                    checked={data.needsMotivation}
                    onChange={(e, { checked }) => updateData("needsMotivation", checked)}
                    style={{ 
                      color: 'var(--nup-text-primary)'
                    }}
                    data-testid="checkbox-needs-motivation"
                  />
                </div>

                <div>
                  <Checkbox
                    label="Prefiro aprender com exemplos práticos"
                    checked={data.prefersExamples}
                    onChange={(e, { checked }) => updateData("prefersExamples", checked)}
                    style={{ 
                      color: 'var(--nup-text-primary)'
                    }}
                    data-testid="checkbox-prefers-examples"
                  />
                </div>
              </Form.Field>
            </Form>
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ padding: '2rem 0' }}
          >
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <Sparkles 
                style={{ 
                  width: '48px', 
                  height: '48px', 
                  color: '#eab308', 
                  margin: '0 auto 1rem' 
                }} 
              />
              <Header as="h2" style={{ marginBottom: '0.5rem', color: 'var(--nup-text-primary)' }}>Tudo Pronto!</Header>
              <p style={{ color: 'var(--nup-text-secondary)', fontSize: '1rem' }}>
                Seu perfil personalizado está configurado
              </p>
            </div>

            <Segment 
              style={{ 
                backgroundColor: 'var(--nup-bg-tertiary)', 
                border: '1px solid var(--nup-border)',
                borderRadius: '8px',
                padding: '1.5rem',
                marginBottom: '2rem'
              }}
            >
              <Header as="h3" style={{ marginBottom: '1rem', color: 'var(--nup-text-primary)' }}>Resumo do seu perfil:</Header>
              
              <Grid columns={2} stackable>
                <Grid.Row>
                  <Grid.Column>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <strong style={{ color: 'var(--nup-text-primary)' }}>Idade:</strong>
                      <span style={{ marginLeft: '0.5rem', color: 'var(--nup-text-secondary)' }}>{data.age || "Não informado"}</span>
                    </div>
                  </Grid.Column>
                  <Grid.Column>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <strong style={{ color: 'var(--nup-text-primary)' }}>Perfil:</strong>
                      <span style={{ marginLeft: '0.5rem', color: 'var(--nup-text-secondary)' }}>
                        {data.studyProfile === "disciplined" ? "Disciplinado" :
                         data.studyProfile === "average" ? "Moderado" : "Flexível"}
                      </span>
                    </div>
                  </Grid.Column>
                </Grid.Row>
                <Grid.Row>
                  <Grid.Column>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <strong style={{ color: 'var(--nup-text-primary)' }}>Objetivo:</strong>
                      <span style={{ marginLeft: '0.5rem', color: 'var(--nup-text-secondary)' }}>{data.studyObjective || "Não informado"}</span>
                    </div>
                  </Grid.Column>
                  <Grid.Column>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <strong style={{ color: 'var(--nup-text-primary)' }}>Horas diárias:</strong>
                      <span style={{ marginLeft: '0.5rem', color: 'var(--nup-text-secondary)' }}>{data.dailyStudyHours || 2}h</span>
                    </div>
                  </Grid.Column>
                </Grid.Row>
                <Grid.Row>
                  <Grid.Column>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <strong style={{ color: 'var(--nup-text-primary)' }}>Estilo:</strong>
                      <span style={{ marginLeft: '0.5rem', color: 'var(--nup-text-secondary)' }}>
                        {data.learningStyle === "visual" ? "Visual" :
                         data.learningStyle === "auditory" ? "Auditivo" :
                         data.learningStyle === "kinesthetic" ? "Cinestésico" :
                         data.learningStyle === "reading_writing" ? "Leitura/Escrita" : "Misto"}
                      </span>
                    </div>
                  </Grid.Column>
                  <Grid.Column>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <strong style={{ color: 'var(--nup-text-primary)' }}>Dificuldades:</strong>
                      <span style={{ marginLeft: '0.5rem', color: 'var(--nup-text-secondary)' }}>
                        {data.learningDifficulties.length > 0 ? 
                          data.learningDifficulties.length === 1 && data.learningDifficulties[0] === "none" ? 
                            "Nenhuma" : `${data.learningDifficulties.length} selecionadas`
                          : "Nenhuma"}
                      </span>
                    </div>
                  </Grid.Column>
                </Grid.Row>
              </Grid>
            </Segment>

            <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--nup-text-tertiary)' }}>
              Você pode alterar essas configurações a qualquer momento em seu perfil.
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="nup-shell" style={{ minHeight: '100vh', backgroundColor: 'var(--nup-bg-primary)' }}>
      {/* Dashboard Icon - Bottom Left */}
      <Button
        circular
        icon
        onClick={() => window.location.href = '/dashboard'}
        style={{
          position: 'fixed',
          bottom: '1rem',
          left: '1rem',
          zIndex: 50,
          backgroundColor: 'var(--nup-primary)',
          color: 'white',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s ease'
        }}
        data-testid="button-dashboard"
      >
        <LayoutDashboard style={{ width: '16px', height: '16px' }} />
      </Button>
      
      <Container style={{ padding: '2rem 1rem' }}>
        {/* Progress Header */}
        <div style={{ maxWidth: '900px', margin: '0 auto', marginBottom: '2rem' }}>
          <Step.Group fluid size="small" style={{ marginBottom: '2rem' }}>
            {STEPS.map((step) => (
              <Step
                key={step.id}
                active={currentStep === step.id}
                completed={currentStep > step.id}
                style={{
                  backgroundColor: currentStep >= step.id ? 'var(--nup-primary)' : 'var(--nup-bg-secondary)',
                  color: currentStep >= step.id ? 'white' : 'var(--nup-text-secondary)'
                }}
              >
                <Icon name={step.icon as any} style={{ fontSize: '1rem' }} />
                <Step.Content>
                  <Step.Title style={{ fontSize: '0.875rem' }}>{step.title}</Step.Title>
                </Step.Content>
              </Step>
            ))}
          </Step.Group>
          
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Header as="h1" style={{ color: 'var(--nup-text-primary)', marginBottom: '0.5rem' }}>
              Etapa {currentStep} de {STEPS.length}: {STEPS[currentStep - 1]?.title}
            </Header>
            {isEditMode ? (
              <p style={{ color: 'var(--nup-text-secondary)' }}>
                Bem-vindo ao NuP-Study!
              </p>
            ) : (
              <p style={{ color: 'var(--nup-text-secondary)' }}>
                Vamos personalizar sua experiência de estudos
              </p>
            )}
          </div>
        </div>

        {/* Main Card */}
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <Card 
            className="nup-card" 
            style={{ 
              backgroundColor: 'var(--nup-bg-secondary)',
              border: '1px solid var(--nup-border)',
              borderRadius: '12px',
              minHeight: '500px',
              padding: '2rem'
            }}
          >
            <Card.Content>
              <AnimatePresence mode="wait">
                {renderStep()}
              </AnimatePresence>
            </Card.Content>
          </Card>
        </div>

        {/* Navigation Buttons */}
        <div style={{ maxWidth: '700px', margin: '2rem auto 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              basic
              onClick={prevStep}
              disabled={currentStep === 1}
              style={{
                backgroundColor: 'transparent',
                color: 'var(--nup-text-secondary)',
                border: '1px solid var(--nup-border)'
              }}
              data-testid="button-previous"
            >
              <ArrowLeft style={{ width: '16px', height: '16px', marginRight: '8px' }} />
              Anterior
            </Button>

            {message && (
              <Message 
                positive={message.type === 'success'}
                negative={message.type === 'error'}
                style={{ margin: '0 1rem', flex: 1 }}
              >
                {message.content}
              </Message>
            )}

            {currentStep === STEPS.length ? (
              <Button
                primary
                onClick={handleFinish}
                loading={isLoading}
                style={{
                  backgroundColor: 'var(--nup-success)',
                  color: 'white'
                }}
                data-testid="button-finish"
              >
                <Sparkles style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                Finalizar
              </Button>
            ) : (
              <Button
                primary
                onClick={nextStep}
                style={{
                  backgroundColor: 'var(--nup-primary)',
                  color: 'white'
                }}
                data-testid="button-next"
              >
                Próximo
                <ArrowRight style={{ width: '16px', height: '16px', marginLeft: '8px' }} />
              </Button>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}