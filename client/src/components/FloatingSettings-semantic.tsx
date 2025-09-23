import { useState } from 'react';
import { Button, Modal, Header, Segment, Grid, Card, Icon, Popup, Label } from 'semantic-ui-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsiveText } from '@/hooks/useResponsiveText';
import { ResponsiveGrid } from '@/components/ui/responsive-components';
import type { MouseEvent } from 'react';

const FloatingSettings = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('themes');
  const { currentTheme, currentMode, setTheme, setMode, availableThemes } = useTheme();
  const { isMobile, isTablet } = useResponsiveText();

  const handleThemeChange = (themeName: any) => {
    setTheme(themeName);
  };

  const settingsOptions = [
    {
      key: 'themes',
      title: 'Temas',
      description: 'Personalizar cores e aparência',
      icon: 'paint brush',
      color: 'blue'
    },
    {
      key: 'notifications',
      title: 'Notificações',
      description: 'Gerenciar alertas e lembretes',
      icon: 'bell',
      color: 'yellow'
    },
    {
      key: 'account',
      title: 'Conta',
      description: 'Perfil e preferências',
      icon: 'user',
      color: 'green'
    },
    {
      key: 'help',
      title: 'Ajuda',
      description: 'Suporte e documentação',
      icon: 'help circle',
      color: 'purple'
    }
  ];

  const renderThemesTab = () => (
    <div>
      <Header as="h3" style={{ marginBottom: '1rem', color: 'var(--nup-primary)' }}>
        <Icon name="paint brush" />
        Aparência do Sistema
      </Header>
      
      {/* Toggle Light/Dark Mode */}
      <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: 'var(--nup-surface-2)', borderRadius: '8px', border: '1px solid var(--nup-border)' }}>
        <Header as="h4" style={{ marginBottom: '1rem', color: 'var(--nup-text-primary)' }}>
          <Icon name="eye" />
          Modo de Exibição
        </Header>
        <ResponsiveGrid columns={2}>
          <Grid.Column>
            <Card 
              fluid
              style={{
                cursor: 'pointer',
                border: currentMode === 'light' ? `2px solid var(--nup-primary)` : '1px solid var(--nup-border)',
                boxShadow: currentMode === 'light' ? `0 4px 8px var(--nup-primary)30` : 'none',
                transition: 'all 0.3s ease',
                borderRadius: '8px',
                backgroundColor: 'var(--nup-surface)'
              }}
              onClick={() => setMode('light')}
              data-testid="mode-card-light"
            >
              <Card.Content>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <Header as="h5" style={{ margin: 0, color: 'var(--nup-text-primary)' }}>
                    <Icon name="sun" style={{ color: '#FFA500' }} />
                    Modo Claro
                  </Header>
                  {currentMode === 'light' && (
                    <Icon name="check circle" color="green" size="large" />
                  )}
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--nup-text-secondary)', margin: 0 }}>
                  Interface clara e brilhante
                </p>
              </Card.Content>
            </Card>
          </Grid.Column>
          <Grid.Column>
            <Card 
              fluid
              style={{
                cursor: 'pointer',
                border: currentMode === 'dark' ? `2px solid var(--nup-primary)` : '1px solid var(--nup-border)',
                boxShadow: currentMode === 'dark' ? `0 4px 8px var(--nup-primary)30` : 'none',
                transition: 'all 0.3s ease',
                borderRadius: '8px',
                backgroundColor: 'var(--nup-surface)'
              }}
              onClick={() => setMode('dark')}
              data-testid="mode-card-dark"
            >
              <Card.Content>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <Header as="h5" style={{ margin: 0, color: 'var(--nup-text-primary)' }}>
                    <Icon name="moon" style={{ color: '#4A5568' }} />
                    Modo Escuro
                  </Header>
                  {currentMode === 'dark' && (
                    <Icon name="check circle" color="green" size="large" />
                  )}
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--nup-text-secondary)', margin: 0 }}>
                  Interface escura e elegante
                </p>
              </Card.Content>
            </Card>
          </Grid.Column>
        </ResponsiveGrid>
      </div>

      {/* Theme Color Selection */}
      <Header as="h4" style={{ marginBottom: '1rem', color: 'var(--nup-text-primary)' }}>
        <Icon name="paint brush" />
        Paleta de Cores
      </Header>
      <p style={{ marginBottom: '2rem', color: 'var(--nup-text-secondary)' }}>
        Selecione uma paleta de cores para personalizar o sistema
      </p>
      <ResponsiveGrid columns={2}>
        {availableThemes.map((theme) => (
          <Grid.Column key={theme.name} style={{ marginBottom: '1rem' }}>
            <Card 
              fluid
              style={{
                cursor: 'pointer',
                border: currentTheme.name === theme.name ? `2px solid ${theme.colors.primary}` : '1px solid #e0e0e0',
                boxShadow: currentTheme.name === theme.name ? `0 4px 8px ${theme.colors.primary}30` : 'none',
                transition: 'all 0.3s ease',
                borderRadius: '8px'
              }}
              onClick={() => handleThemeChange(theme.name)}
              data-testid={`theme-card-${theme.name}`}
            >
              <Card.Content>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <Header as="h4" style={{ margin: 0, color: theme.colors.primary }}>
                    {theme.displayName}
                  </Header>
                  {currentTheme.name === theme.name && (
                    <Icon name="check circle" color="green" size="large" />
                  )}
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--nup-text-secondary)', margin: '0.5rem 0 1rem 0' }}>
                  {theme.description}
                </p>
                
                {/* Preview das cores */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div 
                    style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: theme.colors.primary,
                      borderRadius: '4px',
                      border: '1px solid #ddd'
                    }}
                    title="Cor primária"
                  />
                  <div 
                    style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: theme.colors.secondary,
                      borderRadius: '4px',
                      border: '1px solid #ddd'
                    }}
                    title="Cor secundária"
                  />
                  <div 
                    style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: theme.colors.success,
                      borderRadius: '4px',
                      border: '1px solid #ddd'
                    }}
                    title="Cor de sucesso"
                  />
                  <div 
                    style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: theme.colors.warning,
                      borderRadius: '4px',
                      border: '1px solid #ddd'
                    }}
                    title="Cor de aviso"
                  />
                </div>
              </Card.Content>
            </Card>
          </Grid.Column>
        ))}
      </ResponsiveGrid>
    </div>
  );

  const renderComingSoonTab = (option: any) => (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <Icon name={option.icon} size="huge" color="grey" />
      <Header as="h3" style={{ color: 'var(--nup-text-secondary)' }}>
        {option.title}
      </Header>
      <p style={{ color: 'var(--nup-text-secondary)' }}>
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
      {/* Botão Flutuante */}
      <Popup
        content="Configurações do Sistema"
        trigger={
          <Button
            circular
            size="large"
            style={{
              position: 'fixed',
              bottom: '2rem',
              right: '2rem',
              backgroundColor: 'var(--nup-primary)',
              color: 'white',
              zIndex: 1000,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              border: 'none',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e: MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.backgroundColor = 'var(--nup-primary-hover)';
            }}
            onMouseLeave={(e: MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.backgroundColor = 'var(--nup-primary)';
            }}
            onClick={() => setIsOpen(true)}
            data-testid="floating-settings-button"
          >
            <Icon name="setting" />
          </Button>
        }
        position="left center"
      />

      {/* Modal de Configurações */}
      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        size={isMobile ? "fullscreen" : "large"}
        closeIcon
        data-testid="settings-modal"
        style={isMobile ? {
          width: '100vw',
          height: '100vh',
          margin: 0,
          maxWidth: '100%',
          borderRadius: 0
        } : {}}
      >
        <Modal.Header style={{ 
          backgroundColor: 'var(--nup-primary)', 
          color: 'white',
          padding: isMobile ? '1rem' : '1.5rem 2rem'
        }}>
          <Icon name="setting" />
          Configurações do Sistema
        </Modal.Header>
        <Modal.Content style={{ padding: 0 }}>
          {isMobile ? (
            // Layout Mobile: Só conteúdo, sem sidebar
            <div style={{ padding: '1rem' }}>
              {/* Navegação horizontal no mobile */}
              <div style={{ 
                display: 'flex', 
                gap: '0.5rem', 
                marginBottom: '1.5rem',
                overflowX: 'auto',
                padding: '0.5rem 0'
              }}>
                {settingsOptions.map((option) => (
                  <Button
                    key={option.key}
                    size="small"
                    style={{
                      backgroundColor: activeTab === option.key ? 'var(--nup-primary)' : 'var(--nup-surface)',
                      color: activeTab === option.key ? 'white' : 'var(--nup-text-primary)',
                      border: `1px solid ${activeTab === option.key ? 'var(--nup-primary)' : 'var(--nup-border)'}`,
                      borderRadius: '20px',
                      whiteSpace: 'nowrap',
                      minWidth: 'auto'
                    }}
                    onClick={() => setActiveTab(option.key)}
                    data-testid={`settings-tab-${option.key}-mobile`}
                  >
                    <Icon name={option.icon as any} />
                    {option.title}
                  </Button>
                ))}
              </div>
              {renderTabContent()}
            </div>
          ) : (
            // Layout Desktop: Com sidebar
            <Grid>
              {/* Sidebar com opções */}
              <Grid.Column width={4} style={{ borderRight: '1px solid #e0e0e0' }}>
                <div style={{ padding: '1rem 0' }}>
                  {settingsOptions.map((option) => (
                    <Segment
                      key={option.key}
                      basic
                      style={{
                        cursor: 'pointer',
                        padding: '1rem',
                        margin: '0.5rem 0',
                        backgroundColor: activeTab === option.key ? 'var(--nup-primary-light)' : 'transparent',
                        borderLeft: activeTab === option.key ? `4px solid var(--nup-primary)` : '4px solid transparent',
                        borderRadius: '0 8px 8px 0',
                        transition: 'all 0.3s ease'
                      }}
                      onClick={() => setActiveTab(option.key)}
                      onMouseEnter={(e: MouseEvent<HTMLDivElement>) => {
                        if (activeTab !== option.key) {
                          e.currentTarget.style.backgroundColor = '#f8f9fa';
                        }
                      }}
                      onMouseLeave={(e: MouseEvent<HTMLDivElement>) => {
                        if (activeTab !== option.key) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                      data-testid={`settings-tab-${option.key}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Icon name={option.icon as any} size="large" color={option.color as any} />
                        <div>
                          <div style={{ fontWeight: 'bold', color: 'var(--nup-text-primary)' }}>
                            {option.title}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--nup-text-secondary)' }}>
                            {option.description}
                          </div>
                        </div>
                      </div>
                    </Segment>
                  ))}
                </div>
              </Grid.Column>

              {/* Conteúdo principal */}
              <Grid.Column width={12}>
                <div style={{ padding: '1rem 2rem' }}>
                  {renderTabContent()}
                </div>
              </Grid.Column>
            </Grid>
          )}
        </Modal.Content>
      </Modal>
    </>
  );
};

export default FloatingSettings;