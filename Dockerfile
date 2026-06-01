# deploy in nginx
FROM nginx:alpine
COPY ./dist /usr/share/nginx/html
EXPOSE 80
EXPOSE 443
CMD ["nginx", "-g", "daemon off;"]