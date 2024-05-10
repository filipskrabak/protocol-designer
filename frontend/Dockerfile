FROM node:latest as builder

WORKDIR /home/frontend

COPY package.json .

RUN npm install

COPY . .

FROM builder as dev 
CMD ["npm", "run", "dev"]

FROM builder as build
RUN npm run build

FROM nginx:alpine as prod

COPY nginx.conf /etc/nginx/nginx.conf

COPY --from=build /home/frontend/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]


