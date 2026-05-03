import os
import re

def replace_orange_with_indigo(directory):
    replacements = {
        'orange-': 'indigo-',
        '#F97316': '#4F46E5',  # CTA color in CSS
        '#FB923C': '#6366F1',  # Light orange to light indigo
    }
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.tsx', '.ts', '.css', '.js')):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = content
                for old, new in replacements.items():
                    new_content = new_content.replace(old, new)
                
                if new_content != content:
                    print(f"Updating {path}")
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)

if __name__ == "__main__":
    replace_orange_with_indigo('frontend/src/app')
