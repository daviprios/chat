FROM node:16 AS build

WORKDIR /app
COPY . .

RUN npm install -g pnpm
RUN pnpm install
RUN pnpm build

###################################

FROM node:16
EXPOSE 8000

WORKDIR /app
COPY --from=build /app/dist/ ./

RUN npm install -g pm2
ENTRYPOINT [ "pm2-runtime", "/app/index.js"]