import { useEffect } from 'react';
import { startEngine } from './data/engine';
import { Shell } from './ui/Shell';

export default function App() {
  useEffect(() => startEngine(), []);
  return <Shell />;
}
