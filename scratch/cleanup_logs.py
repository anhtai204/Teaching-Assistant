import os
import json

log_path = ".ai-log/session.jsonl"
if os.path.exists(log_path):
    with open(log_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    clean_lines = []
    for line in lines:
        try:
            data = json.loads(line)
            # Only keep lines that have the 'ts' field (our required format)
            if "ts" in data:
                clean_lines.append(line)
        except:
            continue
            
    with open(log_path, "w", encoding="utf-8") as f:
        f.writelines(clean_lines)
    print("Log cleanup complete.")
