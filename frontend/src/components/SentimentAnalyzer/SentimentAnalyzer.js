import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, ThumbsUp, ThumbsDown, Meh, Loader } from "lucide-react";

const API_GATEWAY_ENDPOINT = "https://h5q4xxbiv4.execute-api.ap-southeast-2.amazonaws.com/prod";

const SentimentChat = () => {
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      text: "Hello! I can help analyze the sentiment of your messages. Type something to get started!", 
      sender: "bot",
      sentiment: "positive",
      confidence: 0.95
    }
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedMessages = localStorage.getItem('sentimentChat');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  const analyzeSentiment = async (text) => {
    try {
      const response = await axios.post(`${API_GATEWAY_ENDPOINT}/analyze`, { text });
      return response.data;
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return { 
        sentiment: 'neutral', 
        confidence: 0,
        error: error.response?.data?.error || error.message 
      };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      text: newMessage,
      sender: "user"
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage("");
    setIsLoading(true);

    const result = await analyzeSentiment(newMessage);
    
    const botResponse = {
      id: messages.length + 2,
      text: result.error 
        ? `Sorry, I encountered an error: ${result.error}`
        : `I analyzed your message and found it to be ${result.sentiment} with ${(result.confidence * 100).toFixed(1)}% confidence.`,
      sender: "bot",
      sentiment: result.sentiment,
      confidence: result.confidence
    };

    setMessages(prev => [...prev, botResponse]);
    setIsLoading(false);

    // Save to localStorage
    localStorage.setItem('sentimentChat', JSON.stringify([...messages, userMessage, botResponse]));
  };

  const getSentimentIcon = (sentiment) => {
    switch(sentiment?.toLowerCase()) {
      case 'positive': return <ThumbsUp className="h-4 w-4 text-green-500" />;
      case 'negative': return <ThumbsDown className="h-4 w-4 text-red-500" />;
      default: return <Meh className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 h-screen flex flex-col">
      <Card className="flex-1 mb-4 bg-gradient-to-r from-blue-500 to-purple-600">
        <ScrollArea className="h-[600px] w-full p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.sender === "user"
                    ? "bg-white text-gray-900"
                    : "bg-purple-200 text-gray-900"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {message.sender === "bot" && message.sentiment && (
                    <div className="flex items-center gap-1">
                      {getSentimentIcon(message.sentiment)}
                      <span className="text-sm font-medium">
                        {message.confidence ? `${(message.confidence * 100).toFixed(1)}%` : ''}
                      </span>
                    </div>
                  )}
                </div>
                {message.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-center">
              <Loader className="animate-spin h-6 w-6 text-white" />
            </div>
          )}
        </ScrollArea>
      </Card>
      
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message to analyze its sentiment..."
          className="flex-1"
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading || !newMessage.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

export default SentimentChat;