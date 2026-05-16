FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Ensure data directory exists
RUN mkdir -p data
EXPOSE 25
CMD ["node", "index.js"]
