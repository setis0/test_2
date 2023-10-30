# Use official Node.js image
FROM node:16

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install
RUN npm i -g typescript nodemon ts-node
# Bundle app source
COPY . .
RUN npm run build:dist
# Expose port
EXPOSE 8080

# Command to run the app
CMD [ "node", "./dist/server.js" ]
