# Expense Sharing App

A beautiful, mobile-first expense sharing app for roommates built with React, TypeScript, Tailwind CSS, Firebase, and OpenAI.

## Features

- 📸 **Receipt Scanning**: Upload receipt photos and get AI-powered itemization
- 💰 **Smart Splitting**: Assign items to specific people or split evenly
- 📊 **Balance Tracking**: Real-time balance calculation between roommates
- 💳 **Payment Integration**: Venmo and Zelle integration for easy payments
- 📱 **Mobile-First Design**: Optimized for mobile use with responsive design
- 📜 **History Tracking**: View all past receipts and payment history

## Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Backend**: Vercel Serverless Functions
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **AI**: OpenAI GPT-4 Vision for receipt analysis
- **Icons**: Lucide React

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Firebase Setup

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database and Storage
3. Copy your Firebase config and update `src/firebase/config.ts`

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your-api-key-here
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=your-app-id

# OpenAI Configuration (for Vercel deployment)
OPENAI_API_KEY=your-openai-api-key-here
```

### 4. OpenAI Setup

1. Get an OpenAI API key from [OpenAI Platform](https://platform.openai.com/)
2. Add it to your environment variables
3. The API endpoint is configured to use GPT-4 Vision for receipt analysis

### 5. Run Development Server

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

The app includes Vercel serverless functions for OpenAI integration.

## Usage

1. **Scan Receipt**: Take a photo of your receipt and let AI extract the items
2. **Split Expenses**: Assign items to yourself, your roommate, or split evenly
3. **View Balance**: See who owes what and settle up easily
4. **Track History**: View all past receipts and payments

## Customization

The app is hardcoded for two roommates: "Yuen Ler" and "Haoming". To customize:

1. Update the types in `src/types/index.ts`
2. Update the UI components to use your names
3. Update the balance calculation logic if needed

## Project Structure

```
src/
├── components/          # Reusable UI components
├── firebase/           # Firebase configuration and services
├── pages/              # Main app pages
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── App.tsx             # Main app component

api/                    # Vercel serverless functions
├── analyze-receipt.ts  # OpenAI receipt analysis endpoint
```

## Contributing

This is a personal expense sharing app, but feel free to fork and customize for your own use!
