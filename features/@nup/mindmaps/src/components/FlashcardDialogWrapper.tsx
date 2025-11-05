import { useState, useEffect } from 'react';

interface FlashcardDialogWrapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mindMapId: string;
  mindMapData: any;
}

export function FlashcardDialogWrapper(props: FlashcardDialogWrapperProps) {
  const [Dialog, setDialog] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (props.open && !Dialog && !error) {
      loadFlashcardsModule().then(module => {
        if (module?.GenerateFlashcardsDialog) {
          setDialog(() => module.GenerateFlashcardsDialog);
        } else {
          setError(true);
        }
      });
    }
  }, [props.open, Dialog, error]);

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md">
          <h3 className="font-semibold mb-2">Feature Não Disponível</h3>
          <p className="text-sm text-muted-foreground">
            Para gerar flashcards, instale o package @nup/flashcards:
          </p>
          <code className="block mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs">
            pnpm add @nup/flashcards
          </code>
          <button
            onClick={() => props.onOpenChange(false)}
            className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  if (!Dialog) {
    return props.open ? (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="text-white">Carregando...</div>
      </div>
    ) : null;
  }

  return <Dialog {...props} />;
}

async function loadFlashcardsModule() {
  try {
    const moduleId = '@nup/flashcards';
    // @ts-ignore - vite-ignore prevents static resolution
    return await import(/* @vite-ignore */ moduleId);
  } catch (e) {
    console.info('[MindMaps] @nup/flashcards not installed - flashcard generation disabled');
    return null;
  }
}
