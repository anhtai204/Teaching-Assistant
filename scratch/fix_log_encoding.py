import os

file_path = r"d:\App-13-Uni\A20-App-013\.ai-log\session.jsonl"

def fix_encoding(path):
    if not os.path.exists(path):
        return
    
    # Read raw bytes to detect null bytes (UTF-16) or BOM
    with open(path, 'rb') as f:
        content = f.read()
    
    # Remove null bytes if present (clunky but effective for UTF-16 to UTF-8 conversion in this context)
    if b'\x00' in content:
        print("Detected null bytes (likely UTF-16), fixing...")
        content = content.replace(b'\x00', b'')
    
    # Remove BOM if present
    if content.startswith(b'\xef\xbb\xbf'):
        print("Detected UTF-8 BOM, removing...")
        content = content[3:]
    
    # Write back as clean UTF-8
    with open(path, 'wb') as f:
        f.write(content)
    print("Encoding fix complete.")

if __name__ == "__main__":
    fix_encoding(file_path)
