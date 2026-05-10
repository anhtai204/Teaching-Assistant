from sqlalchemy import text
from src.database import engine

def fix_vector_dimension_768_v2():
    print("Connecting to Supabase to set dimensions to 768 (v2)...")
    with engine.connect() as conn:
        try:
            # 1. Drop only vector indexes (exclude primary key)
            print("Dropping vector indexes on document_chunks...")
            conn.execute(text("""
                DO $$
                DECLARE
                    idx record;
                BEGIN
                    FOR idx IN 
                        SELECT indexname 
                        FROM pg_indexes 
                        WHERE tablename = 'document_chunks' 
                        AND indexname NOT LIKE '%_pkey'
                    LOOP
                        EXECUTE 'DROP INDEX IF EXISTS ' || idx.indexname;
                    END LOOP;
                END $$;
            """))
            
            # 2. Alter column to 768
            print("Altering embedding column to 768 dimensions...")
            conn.execute(text("ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(768);"))
            
            # 3. Create fresh HNSW index
            print("Creating fresh HNSW index...")
            conn.execute(text("CREATE INDEX idx_document_chunks_embedding_hnsw ON document_chunks USING hnsw (embedding vector_cosine_ops);"))
            
            conn.commit()
            print("✅ Successfully updated everything to 768 dimensions!")
        except Exception as e:
            print(f"❌ Error: {e}")
            conn.rollback()

if __name__ == "__main__":
    fix_vector_dimension_768_v2()
