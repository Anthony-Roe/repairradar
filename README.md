# Running the Project with Docker

This section provides instructions to build and run the project using Docker. Follow these steps to set up and execute the application in a containerized environment.

## Requirements

- Docker version 20.10 or higher
- Docker Compose version 1.29 or higher

## Environment Variables

- Ensure the following environment variables are set:
  - `NODE_ENV`: Set to `production` for the application container.
  - `NODE_OPTIONS`: Set to `--max-old-space-size=4096` for memory optimization.

## Build and Run Instructions

1. Clone the repository and navigate to the project root directory.
2. Build and start the services using Docker Compose:
   ```bash
   docker-compose up --build
   ```
3. Access the application at `http://localhost:3000`.

## Service Configuration

- **app**:
  - Exposed Port: `3000`
  - Build Context: `./`
- **scripts**:
  - Build Context: `./scripts`

## Notes

- Ensure the `.env.local` file is present in the root directory if environment-specific configurations are required.
- The `scripts` service is configured to execute Python-based scripts as defined in the `Dockerfile` within the `./scripts` directory.

For further details, refer to the respective Dockerfiles and the `docker-compose.yml` file.