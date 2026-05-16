FROM node:20-alpine
WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install
COPY . .
# Ensure data directory exists
RUN mkdir -p data
EXPOSE 25
CMD ["node", "index.js"]
