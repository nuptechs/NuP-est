import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useResponsiveText, responsiveTexts, type ScreenText } from '@/hooks/useResponsiveText';
import { cn } from '@/lib/utils';

// Componente de Header Responsivo
interface ResponsiveHeaderProps {
  page: 'library' | 'dashboard' | 'goals';
  subtitle?: string;
  rightActions?: React.ReactNode;
}

export const ResponsiveHeader = ({ page, subtitle, rightActions }: ResponsiveHeaderProps) => {
  const { getResponsiveText, screenSize, isMobile } = useResponsiveText();
  
  const pageTexts = responsiveTexts[page];
  const title = getResponsiveText(pageTexts.title);
  const subtitleText = subtitle || (pageTexts.subtitle ? getResponsiveText(pageTexts.subtitle) : '');

  return (
    <div className={cn(
      "flex justify-between mb-8 gap-4",
      isMobile ? "flex-col" : "flex-row"
    )}>
      <div className="flex-1">
        <h1 className={cn(
          "main-title font-semibold text-foreground mb-2",
          isMobile ? "text-2xl" : "text-3xl"
        )}>
          {title}
        </h1>
        {subtitleText && (
          <p className={cn(
            "card-description text-muted-foreground mt-1",
            isMobile ? "text-sm" : "text-base"
          )}>
            {subtitleText}
          </p>
        )}
      </div>
      {rightActions && (
        <div className={cn(
          "flex gap-2",
          isMobile ? "w-full" : "items-start"
        )}>
          {rightActions}
        </div>
      )}
    </div>
  );
};

// Componente de Botão Responsivo
interface ResponsiveButtonProps {
  textKey: ScreenText;
  icon?: string;
  primary?: boolean;
  secondary?: boolean;
  onClick?: () => void;
  testId?: string;
}

export const ResponsiveButton = ({ textKey, icon, primary, secondary, onClick, testId }: ResponsiveButtonProps) => {
  const { getResponsiveText, isMobile } = useResponsiveText();
  
  const text = getResponsiveText(textKey);
  
  return (
    <Button
      variant={primary ? "default" : secondary ? "secondary" : "outline"}
      size={isMobile ? "sm" : "default"}
      onClick={onClick}
      data-testid={testId}
      className={cn(isMobile && "flex-1")}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {text}
    </Button>
  );
};

// Componente de Grid Responsivo
interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: number;
  stackable?: boolean;
}

export const ResponsiveGrid = ({ children, columns = 4, stackable = true }: ResponsiveGridProps) => {
  const { screenSize } = useResponsiveText();
  
  // Ajustar número de colunas baseado no tamanho da tela
  let responsiveColumns = columns;
  if (screenSize === 'mobile') {
    responsiveColumns = 1; // 1 coluna no mobile para melhor responsividade
  } else if (screenSize === 'tablet') {
    responsiveColumns = Math.min(2, columns); // Máximo 2 colunas no tablet
  }

  const gridClasses = cn(
    "grid gap-4 mt-4",
    {
      "grid-cols-1": responsiveColumns === 1,
      "grid-cols-2": responsiveColumns === 2,
      "grid-cols-3": responsiveColumns === 3,
      "grid-cols-4": responsiveColumns === 4,
      "grid-cols-5": responsiveColumns === 5,
      "grid-cols-6": responsiveColumns === 6,
    }
  );

  return (
    <div className={gridClasses}>
      {children}
    </div>
  );
};

// Componente de Card de Estatística Responsivo
interface ResponsiveStatCardProps {
  icon: React.ReactNode;
  value: string | number;
  labelKey: ScreenText;
  variant: 'info' | 'success' | 'warning' | 'primary';
  testId?: string;
}

export const ResponsiveStatCard = ({ icon, value, labelKey, variant, testId }: ResponsiveStatCardProps) => {
  const { getResponsiveText, isMobile } = useResponsiveText();
  
  const label = getResponsiveText(labelKey);
  
  const variantClasses = {
    info: 'text-blue-600 dark:text-blue-400',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    primary: 'text-purple-600 dark:text-purple-400'
  };

  return (
    <Card className="hover:shadow-md transition-shadow" data-testid={testId}>
      <CardContent className={cn("p-4", isMobile && "p-3")}>
        <div className={cn("flex items-center", isMobile ? "gap-2" : "gap-4")}>
          <div className={cn("flex items-center", variantClasses[variant])}>
            {icon}
          </div>
          <div className="flex flex-col">
            <div className={cn(
              "font-semibold text-foreground",
              isMobile ? "text-lg" : "text-2xl"
            )}>
              {value}
            </div>
            <div className={cn(
              "card-meta text-muted-foreground",
              isMobile ? "text-xs" : "text-sm"
            )}>
              {label}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente de Search Input Responsivo
interface ResponsiveSearchProps {
  placeholder: ScreenText;
  value: string;
  onChange: (e: any) => void;
  testId?: string;
}

export const ResponsiveSearch = ({ placeholder, value, onChange, testId }: ResponsiveSearchProps) => {
  const { getResponsiveText } = useResponsiveText();
  
  return (
    <div className="mb-6">
      <div className="relative">
        <input
          type="text"
          placeholder={getResponsiveText(placeholder)}
          value={value}
          onChange={onChange}
          data-testid={testId}
          className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none">
          🔍
        </div>
      </div>
    </div>
  );
};

// Componente de Modal Responsivo
interface ResponsiveModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'mini' | 'tiny' | 'small' | 'large' | 'fullscreen';
  testId?: string;
}

export const ResponsiveModal = ({ 
  open, 
  onClose, 
  title, 
  children, 
  size = 'large',
  testId 
}: ResponsiveModalProps) => {
  const { isMobile } = useResponsiveText();
  
  const sizeClasses = {
    mini: "max-w-sm",
    tiny: "max-w-md",
    small: "max-w-lg",
    large: "max-w-2xl",
    fullscreen: "max-w-none w-full h-full"
  };
  
  const modalSize = isMobile ? "fullscreen" : size;
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent 
        className={cn(
          "p-0 gap-0 overflow-hidden",
          sizeClasses[modalSize],
          isMobile && "fixed inset-0 m-0 max-w-none w-screen h-screen rounded-none border-none"
        )}
        data-testid={testId}
      >
        <DialogHeader className={cn(
          "p-4 border-b bg-muted/30",
          isMobile ? "p-4" : "p-6"
        )}>
          <DialogTitle className="card-title text-foreground">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className={cn(
          "overflow-y-auto",
          isMobile ? "p-4 flex-1" : "p-6",
          isMobile && "h-full"
        )}>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
};