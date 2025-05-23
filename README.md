# Biodiversidee

## Front End

- The front end is build using NextJS (React) and Javascript.
- It is deployed on Vercel.
- The front end is located in the `/Frontend` directory.

## Back End

### MQTT Subscriber (To get the data)

- The back end is build using NodeJS and Express.
- It is a NodeJS MQTT client, and is deployed on Google App Engine.
- The Database for storing the data is Firestore, but can be easily moved to MongoDB as both are document based databases.

### Scheduled Firebase Functions (To aggregate the data periodically)

- The scheduled functions are build using NodeJS and Express, and deployed as Firebase Functions (which uses Google Cloud Scheduler)
-
