# STEP 1: use node image
FROM node:20-alpine

# STEP 2: set working directory
WORKDIR /app

# STEP 3: copy package.json first (docker caching)
COPY package.json ./

# STEP 4: install deps
RUN npm install --production

# STEP 5: copy source code
COPY src ./src

# STEP 6: expose port
EXPOSE 5000

# STEP 7: start server
CMD ["node", "src/server.js"]

