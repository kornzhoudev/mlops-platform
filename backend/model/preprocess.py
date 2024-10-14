import pandas as pd
from sklearn.model_selection import train_test_split

def preprocess_data(input_file, output_file):
    df = pd.read_csv(input_file)
    df['text'] = df['text'].str.lower()
    df['sentiment'] = df['sentiment'].map({'positive': 1, 'negative': 0})
    
    train_df, test_df = train_test_split(df, test_size=0.2, random_state=42)
    
    train_df.to_parquet(f"{output_file}_train.parquet")
    test_df.to_parquet(f"{output_file}_test.parquet")

# Usage
preprocess_data('data/raw/sentiment_dataset.csv', 'data/processed/sentiment_data')