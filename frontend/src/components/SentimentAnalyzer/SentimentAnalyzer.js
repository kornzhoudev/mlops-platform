import React, { useState } from 'react';
import axios from 'axios';
import { ThumbsUp, ThumbsDown, Search } from 'lucide-react';

const SentimentAnalyzer = () => {
  const [text, setText] = useState('');
  const [sentiment, setSentiment] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  //api gateway endpoint just for testing purposes
  const apiGatewayEndpoint = process.env.REACT_APP_API_GATEWAY_ENDPOINT;

  const analyzeSentiment = async () => {
    setIsLoading(true)
    try {
      const response = await axios.post(`${apiGatewayEndpoint}/analyze`, { text });
      setSentiment(response.data.sentiment);
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white rounded-xl shadow-lg">
      <h1 className="text-4xl font-bold mb-6 text-gray-800">Sentiment Analyzer</h1>
      <div className="mb-6">
        <textarea
          className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ease-in-out"
          rows="4"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to analyze..."
        />
      </div>
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
      {sentiment && (
        <div className={`mt-8 p-6 rounded-lg ${sentiment === 'Positive' ? 'bg-green-100' : 'bg-red-100'} transition-all duration-500 ease-in-out`}>
          <h2 className="text-2xl font-semibold mb-4">Analysis Result:</h2>
          <div className="flex items-center text-lg">
            {sentiment === 'Positive' ? (
              <ThumbsUp className="mr-3 h-8 w-8 text-green-600" />
            ) : (
              <ThumbsDown className="mr-3 h-8 w-8 text-red-600" />
            )}
            <span className={sentiment === 'Positive' ? 'text-green-700' : 'text-red-700'}>
              {sentiment}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SentimentAnalyzer;