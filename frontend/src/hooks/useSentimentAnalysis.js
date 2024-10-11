import { useState } from 'react';
import { analyzeSentiment } from '../services/api';

export const useSentimentAnalysis = () => {
  const [text, setText] = useState('');
  const [sentiment, setSentiment] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAnalyzeSentiment = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyzeSentiment(text);
      setSentiment(result);
    } catch (err) {
      setError('An error occurred while analyzing the sentiment.');
    } finally {
      setIsLoading(false);
    }
  };

  return { 
    text, 
    setText, 
    sentiment, 
    isLoading, 
    error, 
    analyzeSentiment: handleAnalyzeSentiment 
  };
};