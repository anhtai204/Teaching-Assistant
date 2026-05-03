import random
import string

def generate_enrollment_code(length: int = 6) -> str:
    """Generates a random alphanumeric code of specified length."""
    characters = string.ascii_uppercase + string.digits
    return ''.join(random.choices(characters, k=length))
