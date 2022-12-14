FROM node:16.8.0
WORKDIR /app
COPY package.json package-lock.json /app/
RUN npm install

COPY . /app
RUN npm run build

CMD ["dist/main"]