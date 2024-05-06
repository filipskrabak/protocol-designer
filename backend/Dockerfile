FROM alpine:3.17 as builder

RUN apk add --no-cache python3 py3-pip libpq postgresql-client curl
RUN adduser -D api

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

CMD /home/api/.local/bin/alembic upgrade head && /home/api/.local/bin/uvicorn src.__main__:app --reload --host 0.0.0.0
