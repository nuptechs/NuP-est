import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@nup/ui";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  Video, 
  Image, 
  FileSpreadsheet,
  File as FileIcon,
  X,
  Sparkles,
  Check,
  Clock
} from "lucide-react";
import LargeDocumentModal from "./LargeDocumentModal";

interface MaterialDragDropProps {
  subjectId?: string;
  onSuccess?: () => void;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error' | 'large_document';
  aiTitle?: string;
  aiSummary?: string;
  detectedType?: string;
  error?: string;
  requiresAsyncProcessing?: boolean;
  materialId?: string;
  pageCount?: number;
  estimatedTime?: number;
}

// Mapa de extensões para tipos e ícones
const FILE_TYPE_MAP = {
  // PDFs
  '.pdf': { type: 'pdf', icon: FileText, label: 'PDF', color: '#E74C3C' },
  
  // Documents
  '.doc': { type: 'document', icon: FileText, label: 'Word', color: '#2B579A' },
  '.docx': { type: 'document', icon: FileText, label: 'Word', color: '#2B579A' },
  '.txt': { type: 'text', icon: FileText, label: 'Texto', color: '#95A5A6' },
  '.md': { type: 'text', icon: FileText, label: 'Markdown', color: '#95A5A6' },
  
  // Spreadsheets
  '.xls': { type: 'spreadsheet', icon: FileSpreadsheet, label: 'Excel', color: '#1D6F42' },
  '.xlsx': { type: 'spreadsheet', icon: FileSpreadsheet, label: 'Excel', color: '#1D6F42' },
  '.csv': { type: 'spreadsheet', icon: FileSpreadsheet, label: 'CSV', color: '#1D6F42' },
  
  // Images
  '.jpg': { type: 'image', icon: Image, label: 'Imagem', color: '#F39C12' },
  '.jpeg': { type: 'image', icon: Image, label: 'Imagem', color: '#F39C12' },
  '.png': { type: 'image', icon: Image, label: 'Imagem', color: '#F39C12' },
  '.gif': { type: 'image', icon: Image, label: 'Imagem', color: '#F39C12' },
  '.webp': { type: 'image', icon: Image, label: 'Imagem', color: '#F39C12' },
  '.svg': { type: 'image', icon: Image, label: 'Imagem', color: '#F39C12' },
  
  // Videos
  '.mp4': { type: 'video', icon: Video, label: 'Vídeo', color: '#9B59B6' },
  '.avi': { type: 'video', icon: Video, label: 'Vídeo', color: '#9B59B6' },
  '.mov': { type: 'video', icon: Video, label: 'Vídeo', color: '#9B59B6' },
  '.wmv': { type: 'video', icon: Video, label: 'Vídeo', color: '#9B59B6' },
  '.mkv': { type: 'video', icon: Video, label: 'Vídeo', color: '#9B59B6' },
  '.webm': { type: 'video', icon: Video, label: 'Vídeo', color: '#9B59B6' },
  
  // Code/CSS
  '.css': { type: 'code', icon: FileIcon, label: 'CSS', color: '#3498DB' },
  '.js': { type: 'code', icon: FileIcon, label: 'JavaScript', color: '#F7DF1E' },
  '.ts': { type: 'code', icon: FileIcon, label: 'TypeScript', color: '#3178C6' },
  '.html': { type: 'code', icon: FileIcon, label: 'HTML', color: '#E34C26' },
};

const getFileTypeInfo = (filename: string) => {
  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  return FILE_TYPE_MAP[ext as keyof typeof FILE_TYPE_MAP] || { 
    type: 'file', 
    icon: FileIcon, 
    label: 'Arquivo', 
    color: '#95A5A6' 
  };
};

export default function MaterialDragDrop({ subjectId, onSuccess }: MaterialDragDropProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, UploadingFile>>(new Map());
  
  // Large document modal state
  const [largeDocumentModal, setLargeDocumentModal] = useState<{
    isOpen: boolean;
    materialId?: string;
    materialTitle?: string;
    pageCount?: number;
    estimatedTime?: number;
  }>({
    isOpen: false,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, fileId }: { file: File; fileId: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (subjectId) {
        formData.append('subjectId', subjectId);
      }
      formData.append('autoProcess', 'true'); // Flag to trigger AI processing

      const response = await fetch('/api/materials/smart-upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to upload file');
      }

      return response.json();
    },
    onSuccess: (data, { fileId }) => {
      // Check if this is a large document requiring async processing
      if (data.requiresAsyncProcessing) {
        console.log(`[DragDrop] Large document detected: ${data.title} (${data.pageCount} páginas)`);
        
        // Update file status
        setUploadingFiles(prev => {
          const updated = new Map(prev);
          const file = updated.get(fileId);
          if (file) {
            updated.set(fileId, {
              ...file,
              status: 'large_document',
              progress: 100,
              aiTitle: data.title,
              aiSummary: data.description,
              detectedType: data.type,
              requiresAsyncProcessing: true,
              materialId: data.id,
              pageCount: data.pageCount,
              estimatedTime: Math.ceil((data.pageCount / 250) + 5), // minutes: 1min per 250 pages + 5min base
            });
          }
          return updated;
        });

        // Show large document modal
        setLargeDocumentModal({
          isOpen: true,
          materialId: data.id,
          materialTitle: data.title,
          pageCount: data.pageCount,
          estimatedTime: Math.ceil((data.pageCount / 250) + 5), // minutes: 1min per 250 pages + 5min base
        });

        // Don't show regular toast or remove from list yet
        return;
      }

      // Regular small document - handle normally
      setUploadingFiles(prev => {
        const updated = new Map(prev);
        const file = updated.get(fileId);
        if (file) {
          updated.set(fileId, {
            ...file,
            status: 'complete',
            progress: 100,
            aiTitle: data.title,
            aiSummary: data.description,
            detectedType: data.type,
          });
        }
        return updated;
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      if (subjectId) {
        queryClient.invalidateQueries({ queryKey: [`/api/materials?subjectId=${subjectId}`] });
      }

      toast({
        title: "Upload concluído",
        description: `${data.title} foi adicionado com sucesso!`,
      });

      onSuccess?.();

      // Remove from list after 3 seconds
      setTimeout(() => {
        setUploadingFiles(prev => {
          const updated = new Map(prev);
          updated.delete(fileId);
          return updated;
        });
      }, 3000);
    },
    onError: (error: Error, { fileId }) => {
      setUploadingFiles(prev => {
        const updated = new Map(prev);
        const file = updated.get(fileId);
        if (file) {
          updated.set(fileId, {
            ...file,
            status: 'error',
            error: error.message,
          });
        }
        return updated;
      });

      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const fileId = `${file.name}-${Date.now()}`;
      
      // Add to uploading list
      setUploadingFiles(prev => new Map(prev).set(fileId, {
        file,
        progress: 0,
        status: 'uploading',
      }));

      // Start upload
      uploadMutation.mutate({ file, fileId });

      // Simulate progress (real progress would need backend support)
      const interval = setInterval(() => {
        setUploadingFiles(prev => {
          const updated = new Map(prev);
          const fileData = updated.get(fileId);
          if (fileData && fileData.status === 'uploading') {
            const newProgress = Math.min(fileData.progress + 10, 90);
            updated.set(fileId, { ...fileData, progress: newProgress });
            if (newProgress >= 90) {
              updated.set(fileId, { ...fileData, progress: 90, status: 'processing' });
              clearInterval(interval);
            }
          }
          return updated;
        });
      }, 200);
    });
  }, [uploadMutation]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    handleFiles(files);
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  }, [handleFiles]);

  const removeFile = (fileId: string) => {
    setUploadingFiles(prev => {
      const updated = new Map(prev);
      updated.delete(fileId);
      return updated;
    });
  };

  return (
    <>
      {/* Large Document Modal */}
      {largeDocumentModal.isOpen && largeDocumentModal.materialId && (
        <LargeDocumentModal
          isOpen={largeDocumentModal.isOpen}
          onClose={() => {
            setLargeDocumentModal({ isOpen: false });
            // Remove from uploading list
            const fileToRemove = Array.from(uploadingFiles.entries()).find(
              ([, file]) => file.materialId === largeDocumentModal.materialId
            );
            if (fileToRemove) {
              setUploadingFiles(prev => {
                const updated = new Map(prev);
                updated.delete(fileToRemove[0]);
                return updated;
              });
            }
            // Invalidate queries
            queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
            onSuccess?.();
          }}
          materialId={largeDocumentModal.materialId}
          materialTitle={largeDocumentModal.materialTitle || ''}
          pageCount={largeDocumentModal.pageCount || 0}
          estimatedTime={largeDocumentModal.estimatedTime || 0}
        />
      )}
    
    <div className="space-y-4" data-testid="drag-drop-area">
      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-12 transition-all duration-200
          ${isDragging 
            ? 'border-primary bg-primary/5 scale-[1.02]' 
            : 'border-border hover:border-primary/50 hover:bg-accent/50'
          }
        `}
      >
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className={`p-4 rounded-full ${isDragging ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            <Upload className="h-10 w-10" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              {isDragging ? 'Solte os arquivos aqui' : 'Arraste seus materiais'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Arraste e solte arquivos ou clique para selecionar. 
              O sistema vai identificar automaticamente o tipo e gerar um título inteligente com IA.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => document.getElementById('file-input')?.click()}
            data-testid="button-select-files"
          >
            <Upload className="h-4 w-4 mr-2" />
            Selecionar Arquivos
          </Button>

          <input
            id="file-input"
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInput}
            data-testid="input-file"
          />

          {/* Supported file types */}
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            <Badge variant="outline">PDF</Badge>
            <Badge variant="outline">Word</Badge>
            <Badge variant="outline">Excel</Badge>
            <Badge variant="outline">Imagens</Badge>
            <Badge variant="outline">Vídeos</Badge>
            <Badge variant="outline">Código</Badge>
          </div>
        </div>
      </div>

      {/* Uploading Files List */}
      {uploadingFiles.size > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Processando arquivos...</h4>
          {Array.from(uploadingFiles.entries()).map(([fileId, fileData]) => {
            const typeInfo = getFileTypeInfo(fileData.file.name);
            const Icon = typeInfo.icon;

            return (
              <Card key={fileId} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div 
                      className="p-2 rounded-lg flex-shrink-0"
                      style={{ backgroundColor: `${typeInfo.color}20` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: typeInfo.color }} />
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {fileData.aiTitle || fileData.file.name}
                          </p>
                          {fileData.aiSummary && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {fileData.aiSummary}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="outline" style={{ borderColor: typeInfo.color, color: typeInfo.color }}>
                            {typeInfo.label}
                          </Badge>
                          
                          {fileData.status === 'complete' && (
                            <div className="p-1 bg-green-100 dark:bg-green-900/20 rounded-full">
                              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </div>
                          )}
                          
                          {fileData.status === 'large_document' && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Processamento em andamento
                            </Badge>
                          )}
                          
                          {fileData.status === 'error' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(fileId)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Progress bar */}
                      {(fileData.status === 'uploading' || fileData.status === 'processing') && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground flex items-center gap-1">
                              {fileData.status === 'processing' && (
                                <>
                                  <Sparkles className="h-3 w-3 animate-pulse" />
                                  Gerando título inteligente com IA...
                                </>
                              )}
                              {fileData.status === 'uploading' && `Enviando... ${fileData.progress}%`}
                            </span>
                          </div>
                          <Progress value={fileData.progress} className="h-1" />
                        </div>
                      )}

                      {/* Error message */}
                      {fileData.status === 'error' && (
                        <p className="text-sm text-destructive">{fileData.error}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
    </>
  );
}
