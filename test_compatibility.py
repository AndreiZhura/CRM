import sys
print(f"Python: {sys.version}")

requirements = {
    'fastapi': '0.104.1',
    'uvicorn': '0.24.0', 
    'sqlalchemy': '2.0.23',
    'psycopg2-binary': '2.9.9',
    'jinja2': '3.1.3'
}

print("\nТребуемые версии:")
for pkg, ver in requirements.items():
    print(f"  {pkg:20} == {ver}")
