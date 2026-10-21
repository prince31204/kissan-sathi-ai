# KisanSaathi AI

KisanSaathi AI is a production-quality Deep Learning based agricultural mobile application designed to assist farmers.

## Project Architecture

This monorepo contains the following major components:

- **`mobile/`**: The frontend React Native application built with Expo, Expo Router, and TypeScript. Organized around modular features.
- **`backend/`**: The backend API service built with Python, FastAPI, and Pydantic, responsible for business logic and serving predictions to the mobile app.
- **`ai/`**: Independent Deep Learning module containing datasets, model training pipelines, evaluation, and inference code. Separated from the backend for independent versioning and scaling.
- **`database/`**: MongoDB schemas, seed data scripts, and database documentation.
- **`docs/`**: Project documentation, API references, architecture diagrams, and project reports.
- **`scripts/`**: Automation scripts for development, deployment, and operational tasks.

## Features (Planned)

1. AI-based crop disease detection
2. Crop stress detection
3. Irrigation recommendation/prediction
4. Farmer field monitoring
5. Agricultural equipment rental marketplace
6. Farmer voice assistant
7. Weather and agricultural information
8. Farmer profile and authentication
9. Notifications
10. Admin management system

## Getting Started

*(Instructions for setting up the environment will be added here as implementation progresses)*
