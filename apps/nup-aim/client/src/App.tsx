import { Route, Switch } from 'wouter';
import { Button } from '@nup/ui';
import HomePage from './pages/HomePage';

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <Switch>
        <Route path="/" component={HomePage} />
        <Route>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">404</h1>
              <p className="text-muted-foreground mb-4">Página não encontrada</p>
              <Button onClick={() => window.location.href = '/'}>
                Voltar para Home
              </Button>
            </div>
          </div>
        </Route>
      </Switch>
    </div>
  );
}
