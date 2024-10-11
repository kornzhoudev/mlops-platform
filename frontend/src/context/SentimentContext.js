import React, { createContext, useState } from 'react';

export const SentimentContext = createContext();

export const SentimentProvider = ({ children }) => {
  const [globalSentiment, setGlobalSentiment] = useState(null);

  return (
    <SentimentContext.Provider value={{ globalSentiment, setGlobalSentiment }}>
      {children}
    </SentimentContext.Provider>
  );
};