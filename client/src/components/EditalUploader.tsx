import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConteudoProgramatico {
  cargo: string;
  disciplinas: {
    nome: string;
    topicos: string[];
  }[];
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
    conteudoProgramatico?: string[];
  }>;
  conteudoProgramatico?: ConteudoProgramatico;
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

  const renderConteudoProgramatico = (cargo: {nome: string; conteudoProgramatico?: string[]}) => {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Conteúdo Programático</h3>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            📋 {cargo.nome}
          </h4>
        </div>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              📚 Disciplinas e Tópicos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cargo.conteudoProgramatico?.map((item, index) => {
              // Verifica se é título de disciplina (com **)
              if (item.includes('**') || item.startsWith('📖')) {
                return (
                  <div key={index} className="mt-4 first:mt-0">
                    <h4 className="font-semibold text-blue-700 dark:text-blue-300 text-sm bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded">
                      {item.replace(/\*\*/g, '').replace('📖', '').trim()}
                    </h4>
                  </div>
                );
              }
              
              // Verifica se é item de lista (com •)
              if (item.trim().startsWith('•') || item.trim().startsWith('-')) {
                return (
                  <div key={index} className="flex items-start gap-3 ml-3">
                    <span className="text-blue-500 mt-1">•</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                      {item.replace(/^[\s]*[•-]\s*/, '').trim()}
                    </span>
                  </div>
                );
              }
              
              // Verifica se é informação geral (com 📝)
              if (item.startsWith('📝') || item.startsWith('ℹ️') || item.startsWith('⚠️')) {
                return (
                  <div key={index} className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm">
                    {item}
                  </div>
                );
              }
              
              // Linha vazia ou separador
              if (item.trim() === '') {
                return <div key={index} className="h-2"></div>;
              }
              
              // Texto normal
              return (
                <div key={index} className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {item}
                </div>
              );
            })}
            
            {(!cargo.conteudoProgramatico || cargo.conteudoProgramatico.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Conteúdo programático será organizado em breve</p>
                <p className="text-xs mt-1">Use a busca RAG para consultas específicas</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
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
            Envie o arquivo PDF do edital para processamento automático e extração do conteúdo programático
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
                    <strong>Indexação concluída!</strong> Analisando cargos e conteúdo programático...
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

              {/* Só mostra conteúdo quando análise está completa */}
              {result.status === 'completed' && result.cargos && result.cargos.length > 0 && result.hasSingleCargo && (
                <div className="mt-6">
                  {renderConteudoProgramatico(result.cargos[0])}
                </div>
              )}
              
              {result.status === 'completed' && result.cargos && result.cargos.length > 1 && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-semibold">Cargos Identificados</h3>
                  {result.cargos.map((cargo, index) => (
                    <div key={index} className="mt-4">
                      {renderConteudoProgramatico(cargo)}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Placeholder durante análise */}
              {result.status === 'indexed' && (
                <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-500" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Analisando cargos e organizando conteúdo programático...
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Isso pode levar alguns segundos
                  </p>
                </div>
              )}

              {!result.hasSingleCargo && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Este edital possui múltiplos cargos. O sistema foi otimizado para editais com cargo único.
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