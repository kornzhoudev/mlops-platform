import transformers
from datasets import load_dataset

def train_model():
    # Load dataset from processed parquet files
    dataset = load_dataset("parquet", data_files={
        "train": "data/processed/sentiment_data_train.parquet",
        "test": "data/processed/sentiment_data_test.parquet"
    })

    # Initialize tokenizer and model
    tokenizer = transformers.AutoTokenizer.from_pretrained("bert-base-uncased")
    model = transformers.AutoModelForSequenceClassification.from_pretrained("bert-base-uncased", num_labels=2)

    # Define training arguments
    training_args = transformers.TrainingArguments(
        output_dir="./results",
        num_train_epochs=3,
        per_device_train_batch_size=16,
        per_device_eval_batch_size=64,
    )

    # Initialize trainer
    trainer = transformers.Trainer(
        model=model,
        args=training_args,
        train_dataset=dataset["train"],
        eval_dataset=dataset["test"],
    )

    # Train the model
    trainer.train()

    # Save the trained model
    trainer.save_model("./sentiment_model")

if __name__ == "__main__":
    train_model()