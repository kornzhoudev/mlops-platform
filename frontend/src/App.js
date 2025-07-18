import React from 'react';
import SentimentAnalyzer from './components/SentimentAnalyzer/SentimentAnalyzer';
import { SentimentProvider } from './context/SentimentContext';
import { ThemeProvider } from './context/ThemeContext';
import './styles/global.css';

const App = () => {
  return (
    <ThemeProvider>
      <SentimentProvider>
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
          <SentimentAnalyzer />
        </div>
      </SentimentProvider>
    </ThemeProvider>
  );
};

export default App;