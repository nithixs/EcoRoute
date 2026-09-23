# EcoRoute client

React interface for EcoRoute AI. See [the project README](../README.md) for setup, configuration, estimation assumptions, tests and deployment.

For development, start the backend from the repository root with `npm --prefix server run dev`, then run `npm start` in this folder. API requests are proxied to port 5000.

The production build is served by the Express backend. Do not deploy the frontend alone: city search, routing, weather and the optional AI assistant require `/api` on the same origin.
