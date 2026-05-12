
import requests
import json

student_id = "bf519ad1-1915-4c2c-8fa5-bc23df00ea5f"
url = f"http://localhost:8000/api/student/{student_id}/all_materials"

try:
    response = requests.get(url)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        materials = response.json()
        print(f"Number of materials: {len(materials)}")
        if materials:
            print(f"First material: {json.dumps(materials[0], indent=2, ensure_ascii=False)}")
    else:
        print(f"Error Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
