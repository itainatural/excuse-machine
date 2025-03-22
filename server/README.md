# Excuse Machine API

Backend server for the Excuse Machine application. Handles secure API calls to OpenAI.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with:
```
PORT=3001
OPENAI_API_KEY=your_api_key_here
```

3. Run development server:
```bash
npm run dev
```

## Deployment

This server is configured to deploy on Render.com:

1. Create a new Web Service
2. Connect to the GitHub repository
3. Set the following:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment Variables:
     - `NODE_ENV`: production
     - `PORT`: 3001
     - `OPENAI_API_KEY`: your_api_key_here
