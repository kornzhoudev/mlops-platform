import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import { Send, ThumbsUp, ThumbsDown, Meh, Loader, Moon, Sun, Download, Trash2, Copy, RefreshCw } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const API_GATEWAY_ENDPOINT = "https://h5q4xxbiv4.execute-api.ap-southeast-2.amazonaws.com/prod";

const SentimentChat = () => {
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      text: "Hello! I can help analyze the sentiment of your messages. Type something to get started!", 
      sender: "bot",
      sentiment: "positive",
      confidence: 0.95,
      timestamp: new Date().toISOString()
    }
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationTitle, setConversationTitle] = useState("New Conversation");
  const [retryCount, setRetryCount] = useState(0);
  const scrollAreaRef = useRef(null);
  const inputRef = useRef(null);
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    const savedMessages = localStorage.getItem('sentimentChat');
    const savedTitle = localStorage.getItem('conversationTitle');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
    if (savedTitle) {
      setConversationTitle(savedTitle);
    }
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const analyzeSentiment = async (text, attempt = 1) => {
    try {
      const response = await axios.post(`${API_GATEWAY_ENDPOINT}/analyze`, { text }, {
        timeout: 10000, // 10 second timeout
      });
      setRetryCount(0); // Reset retry count on success
      return response.data;
    } catch (error) {
      console.error(`Error analyzing sentiment (attempt ${attempt}):`, error);
      
      // Retry logic for network errors
      if (attempt < 3 && (error.code === 'ECONNABORTED' || error.response?.status >= 500)) {
        setRetryCount(attempt);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        return analyzeSentiment(text, attempt + 1);
      }
      
      return { 
        sentiment: 'neutral', 
        confidence: 0,
        error: error.response?.data?.error || error.message,
        isRetryable: error.code === 'ECONNABORTED' || error.response?.status >= 500
      };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now() + Math.random(),
      text: newMessage.trim(),
      sender: "user",
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage("");
    setIsLoading(true);

    const result = await analyzeSentiment(userMessage.text);
    
    const botResponse = {
      id: Date.now() + Math.random() + 1,
      text: result.error 
        ? `Sorry, I encountered an error: ${result.error}${result.isRetryable ? ' (Auto-retry attempted)' : ''}`
        : `I analyzed your message and found it to be **${result.sentiment.toUpperCase()}** with ${(result.confidence * 100).toFixed(1)}% confidence.`,
      sender: "bot",
      sentiment: result.sentiment,
      confidence: result.confidence,
      timestamp: new Date().toISOString(),
      error: result.error
    };

    setMessages(prev => {
      const newMessages = [...prev, botResponse];
      // Save to localStorage
      localStorage.setItem('sentimentChat', JSON.stringify(newMessages));
      return newMessages;
    });
    setIsLoading(false);
    
    // Focus back to input
    inputRef.current?.focus();
  };

  // Utility functions
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / 60000);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getSentimentIcon = (sentiment) => {
    switch(sentiment?.toLowerCase()) {
      case 'positive': return <ThumbsUp className="h-4 w-4 text-green-500" />;
      case 'negative': return <ThumbsDown className="h-4 w-4 text-red-500" />;
      default: return <Meh className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getSentimentColor = (sentiment) => {
    switch(sentiment?.toLowerCase()) {
      case 'positive': return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
      case 'negative': return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
      default: return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400';
    }
  };

  const copyMessage = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const exportConversation = useCallback(() => {
    const conversation = messages.map(msg => ({
      timestamp: formatTimestamp(msg.timestamp),
      sender: msg.sender,
      text: msg.text,
      sentiment: msg.sentiment,
      confidence: msg.confidence
    }));
    
    const dataStr = JSON.stringify(conversation, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `sentiment-conversation-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [messages]);

  const clearConversation = useCallback(() => {
    if (window.confirm('Are you sure you want to clear this conversation?')) {
      const initialMessage = {
        id: 1,
        text: "Hello! I can help analyze the sentiment of your messages. Type something to get started!",
        sender: "bot",
        sentiment: "positive",
        confidence: 0.95,
        timestamp: new Date().toISOString()
      };
      setMessages([initialMessage]);
      localStorage.setItem('sentimentChat', JSON.stringify([initialMessage]));
    }
  }, []);

  const retryAnalysis = async (messageId, originalText) => {
    setIsLoading(true);
    const result = await analyzeSentiment(originalText);
    
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? {
            ...msg,
            text: result.error 
              ? `Sorry, I encountered an error: ${result.error}`
              : `I analyzed your message and found it to be **${result.sentiment.toUpperCase()}** with ${(result.confidence * 100).toFixed(1)}% confidence.`,
            sentiment: result.sentiment,
            confidence: result.confidence,
            error: result.error,
            timestamp: new Date().toISOString()
          }
        : msg
    ));
    setIsLoading(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            clearConversation();
            break;
          case 's':
            e.preventDefault();
            exportConversation();
            break;
          case '/':
            e.preventDefault();
            inputRef.current?.focus();
            break;
          default:
            // Do nothing for other keys
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [messages, exportConversation, clearConversation]);

  return (
    <div className="max-w-4xl mx-auto p-4 h-screen flex flex-col bg-background">
      {/* Header */}
      <Card className="mb-4 bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-700 dark:to-purple-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between text-white">
            <div>
              <h1 className="text-xl font-bold">{conversationTitle}</h1>
              <p className="text-sm opacity-90">
                {messages.length - 1} messages • {retryCount > 0 && `Retrying... (${retryCount}/3)`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="text-white hover:bg-white/20"
                title="Toggle theme"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={exportConversation}
                className="text-white hover:bg-white/20"
                title="Export conversation (Ctrl+S)"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={clearConversation}
                className="text-white hover:bg-white/20"
                title="Clear conversation (Ctrl+K)"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messages */}
      <Card className="flex-1 mb-4 dark:bg-gray-800">
        <ScrollArea ref={scrollAreaRef} className="h-[500px] w-full p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-6 flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-4 shadow-sm ${
                  message.sender === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600"
                }`}
              >
                {/* Message Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {message.sender === "bot" && message.sentiment && (
                      <div className="flex items-center gap-2">
                        {getSentimentIcon(message.sentiment)}
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${getSentimentColor(message.sentiment)}`}>
                          {message.sentiment?.toUpperCase()}
                        </span>
                        {message.confidence && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {(message.confidence * 100).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimestamp(message.timestamp)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyMessage(message.text)}
                      className="h-6 w-6 opacity-50 hover:opacity-100"
                      title="Copy message"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    {message.sender === "bot" && message.error && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => retryAnalysis(message.id, messages.find(m => m.id === message.id - 1)?.text)}
                        className="h-6 w-6 opacity-50 hover:opacity-100"
                        title="Retry analysis"
                        disabled={isLoading}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Message Content */}
                <div className="text-sm leading-relaxed">
                  {message.text.includes('**') ? (
                    message.text.split('**').map((part, index) => 
                      index % 2 === 1 ? <strong key={index}>{part}</strong> : part
                    )
                  ) : (
                    message.text
                  )}
                </div>

                {/* Confidence Bar for Bot Messages */}
                {message.sender === "bot" && message.confidence && !message.error && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>Confidence</span>
                      <span>{(message.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          message.sentiment === 'positive' ? 'bg-green-500' :
                          message.sentiment === 'negative' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}
                        style={{ width: `${(message.confidence * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-center py-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Loader className="animate-spin h-5 w-5" />
                <span className="text-sm">Analyzing sentiment...</span>
              </div>
            </div>
          )}
        </ScrollArea>
      </Card>
      
      {/* Input Form */}
      <Card className="dark:bg-gray-800">
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message to analyze its sentiment... (Ctrl+/ to focus)"
                className="pr-16 dark:bg-gray-700 dark:border-gray-600"
                disabled={isLoading}
                maxLength={500}
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                {newMessage.length}/500
              </span>
            </div>
            <Button type="submit" disabled={isLoading || !newMessage.trim()} className="px-6">
              {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Shortcuts: Ctrl+K (clear), Ctrl+S (export), Ctrl+/ (focus input)
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SentimentChat;