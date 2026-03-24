# Caramelo POS - API

API for Caramelo POS. Web client available [here](https://github.com/silvestr3/caramelo2-public).

## How to start:

1. Create and activate virtual environment:
```bash
python -m venv ./.venv

# Windows (powershell):
.\venv\Scripts\Activate.ps1

# Linux:
./venv/bin/activate 
```

2. Install dependencies on virtual environment:
```bash
pip install -r requirements.txt
```

3. Run migrations:
```bash
python manage.py migrate
```

4. Create first user:
```bash
python manage.py createsuperuser
```

5. Run development server:
```bash
python manage.py runserver
```

6. To be able to view all of administrator's functionalities, login to `http://localhost:8000/admin` with the superuser just created, and change it's role to `adm`
