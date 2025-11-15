import { Button, Card, Input, Label } from '@nup/app-kit/shims/ui';

export default function ExampleComponent() {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Example Component</h3>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" placeholder="Enter your name" />
        </div>
        
        <Button onClick={() => alert('Hello from App Kit!')}>
          Click Me
        </Button>
      </div>
      
      <p className="text-sm text-muted-foreground mt-4">
        This component uses @nup/app-kit shims that work both standalone and in the monorepo.
      </p>
    </Card>
  );
}
