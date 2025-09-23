import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Container,
  Grid, 
  Card,
  Header,
  Button,
  Tab,
  Label,
  Progress,
  Modal,
  Form,
  Input,
  TextArea,
  Dropdown,
  Message,
  Loader,
  Dimmer,
  Icon,
  Segment
} from 'semantic-ui-react';
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, BookOpen, Upload, Play, Edit, Trash2, Brain, FileText, Folder } from "lucide-react";
import type { FlashcardDeck, Flashcard, Subject, Material } from "@shared/schema";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ModernFlashcard from "@/components/flashcard/ModernFlashcard";
import FloatingSettings from "@/components/FloatingSettings";

const createDeckSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  subjectId: z.string().optional(),
});

const uploadFileSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  subjectId: z.string().optional(),
  file: z.instanceof(File).refine((file) => file.size > 0, "Arquivo é obrigatório"),
  count: z.number().min(1, "Mínimo 1 flashcard").max(50, "Máximo 50 flashcards").default(10),
});

const materialFlashcardSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  subjectId: z.string().optional(),
  materialId: z.string().min(1, "Material é obrigatório"),
  count: z.number().min(1, "Mínimo 1 flashcard").max(50, "Máximo 50 flashcards").default(10),
});

type CreateDeckFormData = z.infer<typeof createDeckSchema>;
type UploadFileFormData = z.infer<typeof uploadFileSchema>;
type MaterialFlashcardFormData = z.infer<typeof materialFlashcardSchema>;

// Função para decodificar conteúdo de flashcards (resolve problemas de escapes duplos)
const decodeFlashcardContent = (content: string): string => {
  if (!content) return '';
  
  try {
    // Método 1: Tentativa segura usando JSON.parse para decodificação automática
    const jsonString = `"${content.replace(/"/g, '\\"')}"`;
    const decoded = JSON.parse(jsonString);
    return decoded.trim();
  } catch {
    // Método 2: Fallback manual com ordem correta (barras primeiro)
    return content
      .replace(/\\\\/g, '\x00TEMP_BACKSLASH\x00')  // Preservar \\ temporariamente
      .replace(/\\n/g, '\n')                       // \\n -> \n (quebras)
      .replace(/\\t/g, '\t')                       // \\t -> \t (tabs)
      .replace(/\\r/g, '\r')                       // \\r -> \r (carriage return)
      .replace(/\\"/g, '"')                        // \\" -> " (aspas)
      .replace(/\x00TEMP_BACKSLASH\x00/g, '\\')    // Restaurar \\ únicos
      .trim();
  }
};

export default function FlashcardsPage() {
  const [activeTab, setActiveTab] = useState("decks");
  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch flashcard decks
  const { data: decks = [], isLoading: decksLoading } = useQuery<FlashcardDeck[]>({
    queryKey: ["/api/flashcard-decks"],
  });

  // Fetch subjects for dropdown
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  // Fetch materials for dropdown
  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  // Fetch flashcards for selected deck
  const { data: flashcards = [] } = useQuery<Flashcard[]>({
    queryKey: ["/api/flashcard-decks", selectedDeck?.id, "flashcards"],
    enabled: !!selectedDeck?.id,
  });

  // Fetch flashcards for review
  const { data: reviewFlashcards = [] } = useQuery<Flashcard[]>({
    queryKey: ["/api/flashcards/review"],
  });

  // Create deck mutation
  const createDeckMutation = useMutation({
    mutationFn: async (data: CreateDeckFormData) => {
      const response = await apiRequest("POST", "/api/flashcard-decks", {
        ...data,
        totalCards: 0,
        studiedCards: 0,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flashcard-decks"] });
      toast({
        title: "Sucesso",
        description: "Deck de flashcards criado com sucesso!",
      });
      setCreateModalOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar deck de flashcards",
        variant: "destructive",
      });
    },
  });

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (data: UploadFileFormData) => {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('title', data.title);
      formData.append('description', data.description || '');
      formData.append('subjectId', data.subjectId || '');
      formData.append('count', data.count.toString());

      const response = await fetch('/api/flashcard-decks/generate-from-file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao processar arquivo');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flashcard-decks"] });
      toast({
        title: "Sucesso",
        description: "Flashcards gerados com sucesso a partir do arquivo!",
      });
      setUploadModalOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao gerar flashcards do arquivo",
        variant: "destructive",
      });
    },
  });

  // Generate from material mutation
  const generateFromMaterialMutation = useMutation({
    mutationFn: async (data: MaterialFlashcardFormData) => {
      const response = await apiRequest("POST", "/api/flashcard-decks/generate-from-material", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flashcard-decks"] });
      toast({
        title: "Sucesso",
        description: "Flashcards gerados com sucesso a partir do material!",
      });
      setMaterialModalOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao gerar flashcards do material",
        variant: "destructive",
      });
    },
  });

  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    formState: { errors: createErrors },
    reset: resetCreate,
  } = useForm<CreateDeckFormData>({
    resolver: zodResolver(createDeckSchema),
  });

  const {
    register: registerUpload,
    handleSubmit: handleUploadSubmit,
    formState: { errors: uploadErrors },
    reset: resetUpload,
    setValue: setUploadValue,
    watch: watchUpload,
  } = useForm<UploadFileFormData>({
    resolver: zodResolver(uploadFileSchema),
    defaultValues: { count: 10 },
  });

  const {
    register: registerMaterial,
    handleSubmit: handleMaterialSubmit,
    formState: { errors: materialErrors },
    reset: resetMaterial,
  } = useForm<MaterialFlashcardFormData>({
    resolver: zodResolver(materialFlashcardSchema),
    defaultValues: { count: 10 },
  });

  const onCreateSubmit = (data: CreateDeckFormData) => {
    createDeckMutation.mutate(data);
  };

  const onUploadSubmit = (data: UploadFileFormData) => {
    uploadFileMutation.mutate(data);
  };

  const onMaterialSubmit = (data: MaterialFlashcardFormData) => {
    generateFromMaterialMutation.mutate(data);
  };

  const handleDeckClick = (deck: FlashcardDeck) => {
    setSelectedDeck(deck);
    setCurrentFlashcardIndex(0);
    setShowAnswer(false);
    setActiveTab("study");
  };

  const handleNextFlashcard = () => {
    if (currentFlashcardIndex < flashcards.length - 1) {
      setCurrentFlashcardIndex(currentFlashcardIndex + 1);
      setShowAnswer(false);
    }
  };

  const handlePreviousFlashcard = () => {
    if (currentFlashcardIndex > 0) {
      setCurrentFlashcardIndex(currentFlashcardIndex - 1);
      setShowAnswer(false);
    }
  };

  const subjectOptions = subjects.map(subject => ({
    key: subject.id,
    value: subject.id,
    text: subject.name
  }));

  const materialOptions = materials.map(material => ({
    key: material.id,
    value: material.id,
    text: material.title
  }));

  const tabPanes = [
    {
      menuItem: { key: 'decks', icon: 'folder', content: 'Meus Decks' },
      render: () => (
        <Tab.Pane>
          <div style={{ marginBottom: '1rem' }}>
            <Button.Group>
              <Button 
                primary 
                icon 
                labelPosition="left" 
                onClick={() => setCreateModalOpen(true)}
                data-testid="button-create-deck"
              >
                <Icon name="plus" />
                Criar Deck Manual
              </Button>
              <Button 
                secondary 
                icon 
                labelPosition="left" 
                onClick={() => setUploadModalOpen(true)}
                data-testid="button-upload-file"
              >
                <Icon name="upload" />
                Gerar do Arquivo
              </Button>
              <Button 
                color="teal"
                icon 
                labelPosition="left" 
                onClick={() => setMaterialModalOpen(true)}
                data-testid="button-generate-material"
              >
                <Brain style={{ width: '16px', height: '16px' }} />
                Gerar da Biblioteca
              </Button>
            </Button.Group>
          </div>

          {decksLoading ? (
            <Segment style={{ padding: '3em 0' }}>
              <Dimmer active inverted>
                <Loader inverted>Carregando decks...</Loader>
              </Dimmer>
            </Segment>
          ) : decks.length === 0 ? (
            <Message info>
              <Message.Header>Nenhum deck encontrado</Message.Header>
              <p>Crie seu primeiro deck de flashcards!</p>
            </Message>
          ) : (
            <Grid stackable columns={3}>
              {decks.map((deck) => (
                <Grid.Column key={deck.id}>
                  <Card fluid data-testid={`deck-card-${deck.id}`}>
                    <Card.Content>
                      <Card.Header>{deck.title}</Card.Header>
                      <Card.Meta>
                        {deck.totalCards} cards • {deck.studiedCards} estudados
                      </Card.Meta>
                      {deck.description && (
                        <Card.Description>{deck.description}</Card.Description>
                      )}
                    </Card.Content>
                    <Card.Content extra>
                      <div className="ui two buttons">
                        <Button 
                          basic 
                          color="blue"
                          onClick={() => handleDeckClick(deck)}
                          data-testid={`button-study-${deck.id}`}
                        >
                          <Play style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                          Estudar
                        </Button>
                      </div>
                    </Card.Content>
                  </Card>
                </Grid.Column>
              ))}
            </Grid>
          )}
        </Tab.Pane>
      )
    },
    {
      menuItem: { key: 'study', icon: 'play', content: 'Estudar' },
      render: () => (
        <Tab.Pane>
          {selectedDeck && flashcards.length > 0 ? (
            <div>
              <Header as="h2">{selectedDeck.title}</Header>
              <Progress 
                percent={((currentFlashcardIndex + 1) / flashcards.length) * 100} 
                indicating 
                size="small"
                label={`${currentFlashcardIndex + 1} de ${flashcards.length}`}
              />
              <ModernFlashcard
                flashcards={flashcards}
                currentIndex={currentFlashcardIndex}
                onNext={handleNextFlashcard}
                onPrevious={handlePreviousFlashcard}
                onComplete={(flashcardId, difficulty) => {
                  // Handle flashcard completion
                  console.log('Flashcard completed:', flashcardId, difficulty);
                }}
              />
            </div>
          ) : (
            <Message info>
              <Message.Header>Selecione um deck</Message.Header>
              <p>Escolha um deck na aba "Meus Decks" para começar a estudar.</p>
            </Message>
          )}
        </Tab.Pane>
      )
    },
    {
      menuItem: { key: 'review', icon: 'refresh', content: 'Revisão' },
      render: () => (
        <Tab.Pane>
          <Header as="h3">Flashcards para Revisão</Header>
          {reviewFlashcards.length === 0 ? (
            <Message>
              <Message.Header>Nenhum flashcard para revisão</Message.Header>
              <p>Continue estudando para ter cards disponíveis para revisão!</p>
            </Message>
          ) : (
            <div>
              <p>{reviewFlashcards.length} flashcards prontos para revisão</p>
              {/* Review interface would go here */}
            </div>
          )}
        </Tab.Pane>
      )
    }
  ];

  return (
    <Container fluid style={{ padding: '2rem', minHeight: '100vh', backgroundColor: 'var(--nup-background)' }}>
      <FloatingSettings />
      
      <Header as="h1" style={{ marginBottom: '2rem', color: 'var(--nup-text)' }}>
        <BookOpen style={{ width: '32px', height: '32px', marginRight: '1rem' }} />
        Flashcards
      </Header>

      <Tab 
        panes={tabPanes} 
        activeIndex={tabPanes.findIndex(pane => pane.menuItem.key === activeTab)}
        onTabChange={(e, { activeIndex }) => {
          setActiveTab(tabPanes[activeIndex as number].menuItem.key);
        }}
        menu={{ secondary: true, pointing: true }}
      />

      {/* Create Deck Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        size="small"
      >
        <Modal.Header>Criar Novo Deck</Modal.Header>
        <Modal.Content>
          <Form onSubmit={handleCreateSubmit(onCreateSubmit)}>
            <Form.Field error={!!createErrors.title}>
              <label>Título</label>
              <Input
                {...registerCreate('title')}
                placeholder="Nome do deck"
              />
              {createErrors.title && (
                <Label pointing color="red">{createErrors.title.message}</Label>
              )}
            </Form.Field>

            <Form.Field error={!!createErrors.description}>
              <label>Descrição (opcional)</label>
              <TextArea
                {...registerCreate('description')}
                placeholder="Descrição do deck"
                rows={3}
              />
            </Form.Field>

            <Form.Field>
              <label>Matéria (opcional)</label>
              <Dropdown
                {...registerCreate('subjectId')}
                placeholder="Selecione uma matéria"
                fluid
                selection
                clearable
                options={subjectOptions}
              />
            </Form.Field>
          </Form>
        </Modal.Content>
        <Modal.Actions>
          <Button onClick={() => setCreateModalOpen(false)}>
            Cancelar
          </Button>
          <Button 
            primary 
            loading={createDeckMutation.isPending}
            onClick={handleCreateSubmit(onCreateSubmit)}
          >
            Criar Deck
          </Button>
        </Modal.Actions>
      </Modal>

      {/* Upload File Modal */}
      <Modal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        size="small"
      >
        <Modal.Header>Gerar Flashcards do Arquivo</Modal.Header>
        <Modal.Content>
          <Form onSubmit={handleUploadSubmit(onUploadSubmit)}>
            <Form.Field error={!!uploadErrors.title}>
              <label>Título do Deck</label>
              <Input
                {...registerUpload('title')}
                placeholder="Nome do deck"
              />
              {uploadErrors.title && (
                <Label pointing color="red">{uploadErrors.title.message}</Label>
              )}
            </Form.Field>

            <Form.Field>
              <label>Arquivo</label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setUploadValue('file', file);
                  }
                }}
              />
              {uploadErrors.file && (
                <Label pointing color="red">{uploadErrors.file.message}</Label>
              )}
            </Form.Field>

            <Form.Field>
              <label>Número de Flashcards</label>
              <Input
                type="number"
                {...registerUpload('count', { valueAsNumber: true })}
                min={1}
                max={50}
                defaultValue={10}
              />
            </Form.Field>
          </Form>
        </Modal.Content>
        <Modal.Actions>
          <Button onClick={() => setUploadModalOpen(false)}>
            Cancelar
          </Button>
          <Button 
            primary 
            loading={uploadFileMutation.isPending}
            onClick={handleUploadSubmit(onUploadSubmit)}
          >
            Gerar Flashcards
          </Button>
        </Modal.Actions>
      </Modal>

      {/* Generate from Material Modal */}
      <Modal
        open={materialModalOpen}
        onClose={() => setMaterialModalOpen(false)}
        size="small"
      >
        <Modal.Header>Gerar Flashcards da Biblioteca</Modal.Header>
        <Modal.Content>
          <Form onSubmit={handleMaterialSubmit(onMaterialSubmit)}>
            <Form.Field error={!!materialErrors.materialId}>
              <label>Material</label>
              <Dropdown
                {...registerMaterial('materialId')}
                placeholder="Selecione um material"
                fluid
                selection
                search
                options={materialOptions}
              />
              {materialErrors.materialId && (
                <Label pointing color="red">{materialErrors.materialId.message}</Label>
              )}
            </Form.Field>

            <Form.Field error={!!materialErrors.title}>
              <label>Título do Deck</label>
              <Input
                {...registerMaterial('title')}
                placeholder="Nome do deck"
              />
              {materialErrors.title && (
                <Label pointing color="red">{materialErrors.title.message}</Label>
              )}
            </Form.Field>

            <Form.Field>
              <label>Número de Flashcards</label>
              <Input
                type="number"
                {...registerMaterial('count', { valueAsNumber: true })}
                min={1}
                max={50}
                defaultValue={10}
              />
            </Form.Field>
          </Form>
        </Modal.Content>
        <Modal.Actions>
          <Button onClick={() => setMaterialModalOpen(false)}>
            Cancelar
          </Button>
          <Button 
            primary 
            loading={generateFromMaterialMutation.isPending}
            onClick={handleMaterialSubmit(onMaterialSubmit)}
          >
            Gerar Flashcards
          </Button>
        </Modal.Actions>
      </Modal>
    </Container>
  );
}