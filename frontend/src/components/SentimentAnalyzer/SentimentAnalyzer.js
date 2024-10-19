import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ThumbsUp, ThumbsDown, Meh, Search, AlertCircle } from 'lucide-react';

const API_GATEWAY_ENDPOINT = "https://h5q4xxbiv4.execute-api.ap-southeast-2.amazonaws.com/prod";

const SentimentAnalyzer = () => {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('sentimentHistory');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const analyzeSentiment = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_GATEWAY_ENDPOINT}/analyze`, { text });
      console.log('Raw API Response:', response);
  
      const data = response.data;
      console.log('API Response data:', data);
  
      if (data.error) {
        throw new Error(data.error);
      }
  
      if (data.sentiment && data.confidence) {
        const newResult = {
          text,
          sentiment: data.sentiment,
          confidence: parseFloat(data.confidence)
        };
        setResult(newResult);
        
        // Update history
        const updatedHistory = [newResult, ...history.slice(0, 4)];
        setHistory(updatedHistory);
        localStorage.setItem('sentimentHistory', JSON.stringify(updatedHistory));
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      setError(error.response?.data?.error || error.message || 'An error occurred while analyzing sentiment');
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8 bg-white rounded-xl shadow-lg">
      <h1 className="text-4xl font-bold mb-6 text-gray-800">Sentiment Analyzer</h1>
      <textarea
        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ease-in-out mb-6"
        rows="4"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text to analyze..."
      />
      <button
        className={`w-full py-3 px-6 text-white rounded-lg transition duration-200 ease-in-out flex items-center justify-center ${
          isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
        }`}
        onClick={analyzeSentiment}
        disabled={isLoading || !text.trim()}
      >
        {isLoading ? (
          <span className="animate-pulse">Analyzing...</span>
        ) : (
          <>
            <Search className="mr-2" size={20} />
            Analyze Sentiment
          </>
        )}
      </button>
      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg flex items-center">
          <AlertCircle className="mr-2" size={20} />
          Error: {error}
        </div>
      )}
      {result && (
        <ResultDisplay result={result} />
      )}
      {history.length > 0 && (
        <AnalysisHistory history={history} />
      )}
    </div>
  );
};

const ResultDisplay = ({ result }) => {
  const getIcon = () => {
    switch(result.sentiment.toLowerCase()) {
      case 'positive': return <ThumbsUp className="mr-3 h-8 w-8 text-green-600" />;
      case 'negative': return <ThumbsDown className="mr-3 h-8 w-8 text-red-600" />;
      default: return <Meh className="mr-3 h-8 w-8 text-yellow-600" />;
    }
  };

  const getColor = () => {
    switch(result.sentiment.toLowerCase()) {
      case 'positive': return 'bg-green-100 text-green-700';
      case 'negative': return 'bg-red-100 text-red-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  return (
    <div className={`mt-8 p-6 rounded-lg ${getColor()} transition-all duration-500 ease-in-out`}>
      <h2 className="text-2xl font-semibold mb-4">Analysis Result:</h2>
      <div className="flex items-center text-lg">
        {getIcon()}
        <span>{result.sentiment}</span>
      </div>
      <div className="mt-2">
        Confidence: {(result.confidence * 100).toFixed(2)}%
      </div>
    </div>
  );
};

// test
const AnalysisHistory = ({ history }) => (
  <div className="mt-8">
    <h2 className="text-2xl font-semibold mb-4">Recent Analyses</h2>
    <div className="space-y-4">
      {history.map((item, index) => (
        <div key={index} className="p-4 bg-gray-100 rounded-lg">
          <div className="font-semibold">{item.sentiment} ({(item.confidence * 100).toFixed(2)}%)</div>
          <div className="text-sm text-gray-600 truncate">{item.text}</div>
        </div>
      ))}
    </div>
  </div>
);

export default SentimentAnalyzer;