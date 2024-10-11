export const analyzeSentiment = async (text) => {
  // Simulating API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  return Math.random() > 0.5 ? 'Positive' : 'Negative';
};
