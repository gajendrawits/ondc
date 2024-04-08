# Use the official Node.js image as the base image
FROM node:latest

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port the app runs on
EXPOSE 80

# Command to run the application
CMD ["node", "index.js"]
