FROM node:20-alpine
RUN apk update && apk upgrade
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
CMD ["node", "app.js"]