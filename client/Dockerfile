# STEP 1: use node image
FROM node:20-alpine

# STEP 2: working directory
WORKDIR /app

# STEP 3: copy package files
COPY package.json ./
COPY vite.config.js ./
COPY index.html ./

# STEP 4: install deps
RUN npm install

# STEP 5: copy source
COPY src ./src

# STEP 6: expose vite port
EXPOSE 5173

# STEP 7: run vite in container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

