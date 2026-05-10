from dotenv import load_dotenv
load_dotenv()
import os
import psycopg2
import bcrypt

url = os.getenv("DATABASE_URL")
print(f"Connecting to: {url[:55]}...")

try:
    conn = psycopg2.connect(url, sslmode="require")
    cur = conn.cursor()

    # 1. List all tables
    cur.execute("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
    tables = [r[0] for r in cur.fetchall()]
    print(f"\n📋 Tables: {tables}")

    # 2. Check users
    if "users" in tables:
        cur.execute("SELECT email, role, password_hash FROM users")
        users = cur.fetchall()
        print(f"\n👥 Users ({len(users)} total):")
        for u in users:
            email, role, pw_hash = u
            # Test password
            test_pw = "student123" if role == "student" else "lecturer123"
            try:
                pw_ok = bcrypt.checkpw(test_pw.encode(), pw_hash.encode())
            except Exception:
                pw_ok = "ERROR (hash invalid)"
            print(f"  {email} | role={role} | password_ok={pw_ok}")
    else:
        print("\n❌ 'users' table NOT FOUND")

    conn.close()
    print("\n✅ DB connection OK")
except Exception as e:
    print(f"\n❌ ERROR: {e}")
