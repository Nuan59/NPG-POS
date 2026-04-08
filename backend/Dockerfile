FROM python:3.10

ENV PYTHONUNBUFFERED 1

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# ✅ รัน makemigrations และ migrate อัตโนมัติก่อน start server
CMD python manage.py makemigrations --no-input && python manage.py migrate --no-input && gunicorn --bind 0.0.0.0:8000 core.wsgi:application