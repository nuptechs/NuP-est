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
  hasSingleCargo: boolean;
  cargoName?: string;
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
          title: "✅ Edital processado com sucesso!",
          description: `${file.name} foi analisado e indexado na base de conhecimento.`,
        });
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

  const renderConteudoProgramatico = (conteudo: ConteudoProgramatico) => {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Conteúdo Programático</h3>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            Cargo: {conteudo.cargo}
          </h4>
        </div>

        <div className="space-y-4">
          {conteudo.disciplinas.map((disciplina, index) => (
            <Card key={index} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{disciplina.nome}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {disciplina.topicos.map((topico, topicIndex) => (
                    <li key={topicIndex} className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1.5">•</span>
                      <span className="flex-1">{topico}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Arquivo:</strong> {result.fileName}
                </div>
                <div>
                  <strong>Concurso:</strong> {result.concursoNome}
                </div>
                <div>
                  <strong>Único cargo:</strong> {result.hasSingleCargo ? 'Sim' : 'Não'}
                </div>
                {result.cargoName && (
                  <div>
                    <strong>Nome do cargo:</strong> {result.cargoName}
                  </div>
                )}
              </div>

              {result.conteudoProgramatico && result.hasSingleCargo && (
                <div className="mt-6">
                  {renderConteudoProgramatico(result.conteudoProgramatico)}
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