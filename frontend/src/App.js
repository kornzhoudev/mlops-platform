import React from 'react';
import SentimentAnalyzer from './components/SentimentAnalyzer/SentimentAnalyzer';
import { SentimentProvider } from './context/SentimentContext';
import './styles/global.css';  // Make sure this path is correct

const App = () => {
  return (
    <SentimentProvider>
      <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
        <div className="relative py-3 sm:max-w-xl sm:mx-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-light-blue-500 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
          <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
            <SentimentAnalyzer />
          </div>
        </div>
      </div>
    </SentimentProvider>
  );
};

export default App;