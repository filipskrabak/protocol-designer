FROM node:22.2 as builder

WORKDIR /home/frontend

COPY package.json .

RUN npm install

COPY . .

FROM builder as dev 
CMD ["npm", "run", "dev"]

FROM builder as build
RUN node node_modules/vite/bin/vite.js build

FROM nginx:alpine as prod

# Copy nginx config templates
COPY nginx-http.conf.template /etc/nginx/nginx-http.conf.template
COPY nginx-ssl.conf.template /etc/nginx/nginx-ssl.conf.template

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

COPY --from=build /home/frontend/dist /usr/share/nginx/html

EXPOSE 80 443

ENTRYPOINT ["/docker-entrypoint.sh"]


