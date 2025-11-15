import ExampleComponent from '../components/ExampleComponent';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Welcome to Your NuP App
          </h1>
          
          <p className="text-xl text-muted-foreground">
            This is a portable app template that works both standalone and in the monorepo.
          </p>
          
          <ExampleComponent />
          
          <div className="bg-card border rounded-lg p-8 space-y-4">
            <h2 className="text-2xl font-semibold">Quick Start</h2>
            
            <div className="text-left space-y-2">
              <p className="font-mono text-sm bg-muted p-3 rounded">
                npm run dev
              </p>
              <p className="text-muted-foreground">
                Start development server
              </p>
            </div>
            
            <div className="text-left space-y-2">
              <p className="font-mono text-sm bg-muted p-3 rounded">
                npm run build
              </p>
              <p className="text-muted-foreground">
                Build for production
              </p>
            </div>
          </div>
          
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">
              Ready to add to monorepo?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Just copy this app to the monorepo and register it!
            </p>
            <code className="text-sm bg-black/50 text-white px-3 py-1 rounded">
              npx nup-app register my-app
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
