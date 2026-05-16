FROM node:20-slim
WORKDIR /app

COPY package*.json ./
RUN npm install

# Copy schema and generate Prisma client
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npx prisma generate --schema ./prisma/schema.prisma

COPY . .

# Ensure data directory exists for uploads
RUN mkdir -p data/attachments
EXPOSE 25
CMD ["node", "index.js"]
