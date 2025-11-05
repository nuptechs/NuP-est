import { useState, useEffect } from 'react';
import { Button } from "@nup/ui";
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import type { MindMapNode } from '../core/types';

interface PresentationModeProps {
  nodes: MindMapNode[];
  onClose: () => void;
}

export function PresentationMode({ nodes, onClose }: PresentationModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const reactFlowInstance = useReactFlow();
  
  // Get level-1 nodes (main branches)
  const mainBranches = nodes.filter(n => n.data.level === 1);
  const current = mainBranches[currentIndex];

  useEffect(() => {
    if (current && reactFlowInstance) {
      reactFlowInstance.setCenter(
        current.position.x + 100,
        current.position.y + 50,
        { zoom: 1.5, duration: 600 }
      );
    }
  }, [currentIndex, current, reactFlowInstance]);

  const handlePrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(mainBranches.length - 1, prev + 1));
  };

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-4 bg-background/95 backdrop-blur-sm border border-border rounded-xl shadow-lg p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          data-testid="button-presentation-previous"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        
        <div className="text-sm font-medium min-w-[120px] text-center">
          {currentIndex + 1} / {mainBranches.length}
          <div className="text-xs text-muted-foreground mt-0.5">
            {current?.data.label}
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          disabled={currentIndex === mainBranches.length - 1}
          data-testid="button-presentation-next"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
        
        <div className="w-px h-8 bg-border" />
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          data-testid="button-presentation-close"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
