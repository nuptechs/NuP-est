import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConteudoProgramatico {
  disciplina: string;
  topicos: string[];
}

interface EditalResult {
  id: string;
  concursoNome: string;
  fileName: string;
  status: 'processing' | 'indexed' | 'completed' | 'failed';
  hasSingleCargo: boolean;
  cargoName?: string;
  cargos?: Array<{
    nome: string;
    requisitos?: string;
    atribuicoes?: string;
    salario?: string;
    vagas?: number;
  }>;
  conteudoProgramatico?: ConteudoProgramatico[];
  processedAt: string;
}

interface EditalUploaderProps {
  concursoNome: string;
  onEditalProcessed?: (result: EditalResult) => void;
}

export function EditalUploader({ concursoNome, onEditalProcessed }: EditalUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<EditalResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  const startPollingForCompletion = (editalId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/edital/${editalId}`);
        const data = await response.json();
        
        if (data.success && data.edital.status === 'completed') {
          setResult(data.edital);
          clearInterval(interval);
          setPollingInterval(null);
          
          toast({
            title: "✅ Análise de cargos concluída!",
            description: "O edital foi totalmente processado e analisado.",
          });
        } else if (data.success && data.edital.status === 'failed') {
          clearInterval(interval);
          setPollingInterval(null);
          setError('Falha no processamento do edital');
        }
      } catch (error) {
        console.error('Erro no polling:', error);
      }
    }, 3000); // Check every 3 seconds
    
    setPollingInterval(interval);
  };
  
  // Cleanup polling on unmount
  React.useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Verificar se é PDF
    if (file.type !== 'application/pdf') {
      setError('Apenas arquivos PDF são aceitos');
      return;
    }

    // Verificar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('edital', file);
      formData.append('concursoNome', concursoNome);

      const response = await fetch('/api/edital/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar edital');
      }

      if (data.success) {
        setResult(data.edital);
        onEditalProcessed?.(data.edital);
        
        toast({
          title: "📤 Edital enviado para processamento!",
          description: `${file.name} foi indexado. Análise de cargos em andamento...`,
        });

        // Iniciar polling para verificar status do pós-processamento
        if (data.edital.status === 'indexed') {
          startPollingForCompletion(data.edital.id);
        }
      } else {
        throw new Error(data.message || 'Erro desconhecido');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao processar edital';
      setError(errorMessage);
      
      toast({
        title: "❌ Erro ao processar edital",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const renderCargoDetails = (cargo: {nome: string; requisitos?: string; atribuicoes?: string; salario?: string; vagas?: number}) => {
    return (
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            👤 {cargo.nome}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {cargo.vagas && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-green-700 dark:text-green-300">Vagas:</span>
              <span className="text-sm">{cargo.vagas}</span>
            </div>
          )}
          {cargo.salario && (
            <div className="flex items-start gap-2">
              <span className="text-sm font-medium text-green-700 dark:text-green-300">Salário:</span>
              <span className="text-sm flex-1">{cargo.salario}</span>
            </div>
          )}
          {cargo.requisitos && (
            <div className="flex items-start gap-2">
              <span className="text-sm font-medium text-green-700 dark:text-green-300">Requisitos:</span>
              <span className="text-sm flex-1">{cargo.requisitos}</span>
            </div>
          )}
          {cargo.atribuicoes && (
            <div className="flex items-start gap-2">
              <span className="text-sm font-medium text-green-700 dark:text-green-300">Atribuições:</span>
              <span className="text-sm flex-1">{cargo.atribuicoes}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderConteudoProgramatico = (conteudoProgramatico: Array<{disciplina: string; topicos: string[]}>) => {
    if (!conteudoProgramatico || conteudoProgramatico.length === 0) {
      return (
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Conhecimentos serão organizados em breve</p>
              <p className="text-xs mt-1">Use a busca RAG para consultas específicas</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            📚 Conhecimentos ({conteudoProgramatico.length} disciplinas)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {conteudoProgramatico.map((disciplina, index) => (
            <div key={index} className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50">
              <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
                📖 {disciplina.disciplina}
              </h4>
              <div className="grid gap-2">
                {disciplina.topicos.map((topico, topicIndex) => (
                  <div key={topicIndex} className="flex items-start gap-3 text-sm">
                    <span className="text-blue-500 mt-1 text-xs">•</span>
                    <span className="text-gray-700 dark:text-gray-300 flex-1">
                      {topico}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload do Edital
          </CardTitle>
          <CardDescription>
            Envie o arquivo PDF do edital para processamento automático e extração dos conhecimentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edital-file">Arquivo PDF do Edital</Label>
              <Input
                id="edital-file"
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="mt-2"
                data-testid="input-edital-file"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Máximo 10MB • Apenas arquivos PDF
              </p>
            </div>

            {isUploading && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Processando edital... Isso pode levar alguns minutos.
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Edital Processado
            </CardTitle>
            <CardDescription>
              Análise automática concluída em {new Date(result.processedAt).toLocaleString('pt-BR')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Status de processamento */}
              {result.status === 'indexed' && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription>
                    <strong>Indexação concluída!</strong> Analisando cargos e conhecimentos...
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Arquivo:</strong> {result.fileName}
                </div>
                <div>
                  <strong>Concurso:</strong> {result.concursoNome}
                </div>
                <div>
                  <strong>Status:</strong> 
                  {result.status === 'indexed' && <span className="text-yellow-600"> 🔄 Analisando cargos</span>}
                  {result.status === 'completed' && <span className="text-green-600"> ✅ Análise concluída</span>}
                  {result.status === 'failed' && <span className="text-red-600"> ❌ Erro no processamento</span>}
                </div>
                {result.status === 'completed' && (
                  <>
                    <div>
                      <strong>Único cargo:</strong> {result.hasSingleCargo ? 'Sim' : 'Não'}
                    </div>
                    {result.cargoName && (
                      <div>
                        <strong>Nome do cargo:</strong> {result.cargoName}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Exibe cargos e conhecimentos quando análise está completa */}
              {result.status === 'completed' && result.cargos && result.cargos.length > 0 && (
                <div className="mt-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      👥 Cargos Identificados ({result.cargos.length})
                    </h3>
                    <div className="space-y-4">
                      {result.cargos.map((cargo, index) => (
                        <div key={index}>
                          {renderCargoDetails(cargo)}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {result.conteudoProgramatico && result.conteudoProgramatico.length > 0 && (
                    <div>
                      {renderConteudoProgramatico(result.conteudoProgramatico)}
                    </div>
                  )}
                </div>
              )}
              
              {/* Placeholder durante análise */}
              {result.status === 'indexed' && (
                <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-500" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Analisando cargos e organizando conhecimentos...
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Isso pode levar alguns segundos
                  </p>
                </div>
              )}

              {result.status === 'completed' && (!result.cargos || result.cargos.length === 0) && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Não foi possível identificar informações específicas sobre cargos neste edital.
                    O conteúdo foi indexado e está disponível para consultas via RAG.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}