import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Palette, Bell, User, HelpCircle, Sun, Moon, Check } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const FloatingSettings = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('themes');
  const { currentTheme, currentMode, setTheme, setMode, availableThemes } = useTheme();

  const handleThemeChange = (themeName: any) => {
    setTheme(themeName);
  };

  const settingsOptions = [
    {
      key: 'themes',
      title: 'Temas',
      description: 'Personalizar cores e aparência',
      icon: Palette,
      color: 'blue'
    },
    {
      key: 'notifications',
      title: 'Notificações',
      description: 'Gerenciar alertas e lembretes',
      icon: Bell,
      color: 'yellow'
    },
    {
      key: 'account',
      title: 'Conta',
      description: 'Perfil e preferências',
      icon: User,
      color: 'green'
    },
    {
      key: 'help',
      title: 'Ajuda',
      description: 'Suporte e documentação',
      icon: HelpCircle,
      color: 'purple'
    }
  ];

  const renderThemesTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-primary flex items-center gap-2 mb-4">
          <Palette className="h-5 w-5" />
          Aparência do Sistema
        </h3>
        
        {/* Toggle Light/Dark Mode */}
        <div className="p-4 bg-muted rounded-lg border mb-6">
          <h4 className="text-base font-medium text-foreground flex items-center gap-2 mb-4">
            <Settings className="h-4 w-4" />
            Modo de Exibição
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card 
              className={`cursor-pointer transition-all ${
                currentMode === 'light' 
                  ? 'border-primary shadow-lg' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setMode('light')}
              data-testid="mode-card-light"
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Sun className="h-5 w-5 text-orange-500" />
                    <span className="font-medium">Modo Claro</span>
                  </div>
                  {currentMode === 'light' && (
                    <Check className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Interface clara e brilhante
                </p>
              </CardContent>
            </Card>
            
            <Card 
              className={`cursor-pointer transition-all ${
                currentMode === 'dark' 
                  ? 'border-primary shadow-lg' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setMode('dark')}
              data-testid="mode-card-dark"
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Moon className="h-5 w-5 text-gray-600" />
                    <span className="font-medium">Modo Escuro</span>
                  </div>
                  {currentMode === 'dark' && (
                    <Check className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Interface escura e elegante
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Theme Color Selection */}
        <h4 className="text-base font-medium text-foreground flex items-center gap-2 mb-4">
          <Palette className="h-4 w-4" />
          Paleta de Cores
        </h4>
        <p className="text-muted-foreground mb-4">
          Selecione uma paleta de cores para personalizar o sistema
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableThemes.map((theme) => (
            <Card 
              key={theme.name}
              className={`cursor-pointer transition-all ${
                currentTheme.name === theme.name
                  ? 'border-2 shadow-lg'
                  : 'border hover:border-primary/50'
              }`}
              style={{
                borderColor: currentTheme.name === theme.name ? theme.colors.primary : undefined
              }}
              onClick={() => handleThemeChange(theme.name)}
              data-testid={`theme-card-${theme.name}`}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium" style={{ color: theme.colors.primary }}>
                    {theme.displayName}
                  </h4>
                  {currentTheme.name === theme.name && (
                    <Check className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {theme.description}
                </p>
                
                {/* Color Preview */}
                <div className="flex gap-2 flex-wrap">
                  <div 
                    className="w-6 h-6 rounded border border-border"
                    style={{ backgroundColor: theme.colors.primary }}
                    title="Cor primária"
                  />
                  <div 
                    className="w-6 h-6 rounded border border-border"
                    style={{ backgroundColor: theme.colors.secondary }}
                    title="Cor secundária"
                  />
                  <div 
                    className="w-6 h-6 rounded border border-border"
                    style={{ backgroundColor: theme.colors.success }}
                    title="Cor de sucesso"
                  />
                  <div 
                    className="w-6 h-6 rounded border border-border"
                    style={{ backgroundColor: theme.colors.warning }}
                    title="Cor de aviso"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  const renderComingSoonTab = (option: any) => (
    <div className="text-center py-12">
      <option.icon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-medium text-muted-foreground mb-2">
        {option.title}
      </h3>
      <p className="text-muted-foreground">
        Esta funcionalidade estará disponível em breve!
      </p>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'themes':
        return renderThemesTab();
      default:
        const option = settingsOptions.find(opt => opt.key === activeTab);
        return renderComingSoonTab(option);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <Button
        size="lg"
        className="fixed bottom-8 right-8 z-50 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        onClick={() => setIsOpen(true)}
        data-testid="floating-settings-button"
        title="Configurações do Sistema"
      >
        <Settings className="h-5 w-5" />
      </Button>

      {/* Settings Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="settings-modal">
          <DialogHeader className="bg-primary text-primary-foreground p-6 -m-6 mb-6 rounded-t-lg">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Settings className="h-6 w-6" />
              Configurações do Sistema
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Settings Navigation */}
            <div className="md:col-span-1">
              <div className="space-y-2">
                {settingsOptions.map((option) => (
                  <button
                    key={option.key}
                    className={`w-full p-3 text-left rounded-lg border transition-all ${
                      activeTab === option.key
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-muted border-border'
                    }`}
                    onClick={() => setActiveTab(option.key)}
                    data-testid={`settings-tab-${option.key}`}
                  >
                    <div className="flex items-center gap-3">
                      <option.icon className="h-5 w-5" />
                      <div>
                        <div className="font-medium text-sm">
                          {option.title}
                        </div>
                        <div className="text-xs opacity-70">
                          {option.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="md:col-span-3">
              {renderTabContent()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FloatingSettings;