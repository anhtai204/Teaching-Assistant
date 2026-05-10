from src.rag.embedding import get_embedding

def check_dim():
    emb = get_embedding()
    test_vector = emb.embed_query("test")
    print(f"Embedding dimension: {len(test_vector)}")

if __name__ == "__main__":
    check_dim()
