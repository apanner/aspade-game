FROM node:18-alpine

WORKDIR /app

# Copy package files first
COPY package.json ./
COPY package-lock.json ./

# Install dependencies
RUN npm install

# Copy all source files
COPY . .

# Build the application
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"] 