FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY bin/api bin/migrate /app/
COPY migrations /app/migrations
RUN chmod 755 /app/api /app/migrate
EXPOSE 8080
CMD ["/bin/sh", "-c", "/app/migrate && exec /app/api"]
