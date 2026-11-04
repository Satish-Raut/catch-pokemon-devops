#* Stage 1: Build the frontend application
FROM node:22-alpine AS build

#* '/app' as the working directory inside the container.
WORKDIR /app

#* Copies the package-related JSON files from your local project into /app inside the container. 
COPY package*.json ./

#* Installs all project dependencies using the package-lock.json file.
#* Instead of using 'npm install' we use 'npm ci', because it ensures consistent dependency installation during automated builds.
RUN npm ci

#* Copies the remaining application source code into the container.
COPY . .

# TMDB's v3 API key is public in a browser build; provide it at build time.
ARG VITE_TMDB_API_KEY
ENV VITE_TMDB_API_KEY=${VITE_TMDB_API_KEY}

#* Executes the build script defined in your package.json.
#* This converts your development application into optimized production files into a 'dist' folder.
RUN npm run build

#* Stage 2: Serve the application using Nginx
FROM nginx:alpine

#* Copy the production-ready React files generated in Stage 1 into the Nginx web server directory in Stage 2.
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
