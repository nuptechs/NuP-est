import { Button } from '@nup/ui';

export default function HomePage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          Welcome to Your New App
        </h1>
        <p className="text-muted-foreground mb-6">
          Start building something amazing!
        </p>
        <Button>Get Started</Button>
      </div>
    </div>
  );
}
