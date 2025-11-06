# Field Extraction API

A Node.js API that extracts fields from images using Google Cloud Vision OCR and OpenAI for intelligent field detection.

## Features

- Extract text from images using Google Cloud Vision OCR
- Identify form fields using regex pattern matching
- Fallback to OpenAI for advanced field extraction when regex fails
- Support for various image formats (JPEG, PNG, GIF, etc.)
- Comprehensive error handling and logging
- Rate limiting to prevent abuse
- CORS protection

## Prerequisites

- Node.js 18 or higher
- Google Cloud Vision API credentials
- OpenAI API key (optional, for fallback extraction)

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

4. Configure your environment variables in the `.env` file

## Google Cloud Vision Setup

You have two options for configuring Google Cloud Vision:

### Option 1: Using a credentials file

1. Create a service account in Google Cloud Console
2. Download the JSON credentials file
3. Set the path in your `.env` file:

```
GOOGLE_APPLICATION_CREDENTIALS=./path/to/credentials.json
```

### Option 2: Using JSON credentials directly

1. Create a service account in Google Cloud Console
2. Download the JSON credentials file
3. Copy the entire JSON content to your `.env` file:

```
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"..."}
```

## OpenAI Setup

1. Get an API key from OpenAI
2. Add it to your `.env` file:

```
OPENAI_API_KEY=your-openai-api-key
```

## Usage

### Start the server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

### API Endpoints

#### Extract Fields from Image

```
POST /api/extract-fields
```

Request body:
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..."
}
```

Response:
```json
{
  "status": "success",
  "fonte": "regex",
  "campos": {
    "nome": "John Doe",
    "email": "john@example.com",
    "telefone": "(11) 98765-4321"
  },
  "texto_completo": "Nome: John Doe\nEmail: john@example.com\nTelefone: (11) 98765-4321"
}
```

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `400 Bad Request`: Missing or invalid input
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server-side errors

## Deployment

### Netlify Functions

This API can be deployed as a Netlify Function:

1. Create a `netlify.toml` file:

```toml
[build]
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"
```

2. Create a Netlify Function wrapper:

```javascript
// netlify/functions/extract-fields.js
const { createHandler } = require('@netlify/functions');
const app = require('./api/server');

module.exports.handler = createHandler(app);
```

3. Configure environment variables in Netlify dashboard

### Docker

1. Create a Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "src/server.js"]
```

2. Build and run the Docker image:

```bash
docker build -t field-extraction-api .
docker run -p 3000:3000 field-extraction-api
```

## License

MIT