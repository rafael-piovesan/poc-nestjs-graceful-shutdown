FROM node:16.8.0


WORKDIR /app

COPY . /app
RUN npm install
RUN npm run build

CMD ["node", "--enable-source-maps", "dist/main"]