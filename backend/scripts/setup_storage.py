from src.supabase_client import supabase

def setup_storage():
    bucket_name = "materials"
    print(f"Checking for bucket: {bucket_name}...")
    
    try:
        # Check if bucket exists
        buckets = supabase.storage.list_buckets()
        exists = any(b.name == bucket_name for b in buckets)
        
        if not exists:
            print(f"Bucket '{bucket_name}' not found. Creating...")
            # Create bucket (public: True allows anyone with URL to view)
            supabase.storage.create_bucket(bucket_name, options={"public": True})
            print(f"✅ Bucket '{bucket_name}' created successfully.")
        else:
            print(f"Bucket '{bucket_name}' already exists.")
            
    except Exception as e:
        print(f"❌ Error setting up storage: {e}")
        print("Note: Ensure your SUPABASE_SERVICE_ROLE_KEY has storage permissions.")

if __name__ == "__main__":
    setup_storage()
