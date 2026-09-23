FROM node:22-alpine AS build
WORKDIR /app
COPY client/package*.json client/
RUN npm --prefix client ci
COPY client/ client/
RUN npm --prefix client run build
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY server/package*.json server/
RUN npm --prefix server ci --omit=dev
COPY server/ server/
COPY --from=build /app/client/build client/build
USER node
EXPOSE 5000
CMD ["node", "server/index.js"]
