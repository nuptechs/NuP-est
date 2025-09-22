import { useState } from 'react';
import { Button, Modal, Header, Segment, Grid, Card, Icon, Popup, Label } from 'semantic-ui-react';
import { useTheme } from '@/contexts/ThemeContext';
import type { MouseEvent } from 'react';

const FloatingSettings = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('themes');
  const { currentTheme, setTheme, availableThemes } = useTheme();

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
        Escolher Tema
      </Header>
      <p style={{ marginBottom: '2rem', color: 'var(--nup-text-secondary)' }}>
        Selecione uma paleta de cores para personalizar a aparência do sistema
      </p>
      <Grid stackable>
        {availableThemes.map((theme) => (
          <Grid.Column key={theme.name} width={8} style={{ marginBottom: '1rem' }}>
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
      </Grid>
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
        size="large"
        closeIcon
        data-testid="settings-modal"
      >
        <Modal.Header style={{ backgroundColor: 'var(--nup-primary)', color: 'white' }}>
          <Icon name="setting" />
          Configurações do Sistema
        </Modal.Header>
        <Modal.Content>
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
        </Modal.Content>
      </Modal>
    </>
  );
};

export default FloatingSettings;