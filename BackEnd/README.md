# David's notes on the backend to try to understand how it is storing the data.

## app.yaml

Config file for running on Google App engine.

## corsproxy.js

Simple server to retrieve data from xeno-canto without worrying about CORS issues. Points to the local machine.

## package-lock.json

packaging versions for node packages

## package.json

package details for node packages.

## server.js

MQTT subscriber that loads the JS database. 