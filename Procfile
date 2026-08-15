web: gunicorn config.wsgi:application --workers 2 --threads 4 --bind 0.0.0.0:$PORT --timeout 60 --access-logfile -
release: python manage.py migrate --noinput
