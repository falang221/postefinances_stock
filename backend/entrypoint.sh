#!/bin/sh

# Run Prisma migrations
echo "Running Prisma migrations..."
pdm run prisma migrate deploy --schema ./database/schema.prisma

# Start Gunicorn server
echo "Starting Gunicorn server..."
exec pdm run gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app -b 0.0.0.0:8000
