import { useEffect } from 'react';
import { startDemoFeed } from './data/demoFeed';
import { startEngine } from './data/engine';
import { startLiveFeed } from './data/liveFeed';
import { Shell } from './ui/Shell';

export default function App() {
  useEffect(() => startEngine(), []);
  useEffect(() => startDemoFeed(), []);
  useEffect(() => startLiveFeed(), []);
  return <Shell />;
}
