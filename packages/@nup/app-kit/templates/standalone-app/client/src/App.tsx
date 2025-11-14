import { Route, Switch } from 'wouter';
import HomePage from './pages/HomePage';

export default function App() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route>404 - Not Found</Route>
    </Switch>
  );
}
