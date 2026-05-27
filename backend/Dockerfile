FROM python:3.10-slim

# Install runtime dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 curl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m api

USER api

WORKDIR /home/api

# Copy the requirements.txt first, for better cache on rebuild
COPY requirements.txt .
RUN pip3 install -r requirements.txt --no-cache-dir

# Now copy all the files in the project
COPY . .

USER root
# static folder
RUN chown -R api:api /home/api
USER api

EXPOSE 8000

CMD sh -c 'until /home/api/.local/bin/alembic upgrade head; do echo "DB not ready, retrying in 3s..."; sleep 3; done && /home/api/.local/bin/uvicorn src.__main__:app --reload --host 0.0.0.0'
