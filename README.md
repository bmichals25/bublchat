# bubl

A mobile app clone of bubl built with React Native and Expo.

## Features

- 🗨️ Conversation management (create, switch, delete conversations)
- 💬 Real-time chat interface with simulated AI responses
- 📱 Responsive design that works on both mobile and tablet devices
- 🌙 Clean, modern UI that mimics bubl's interface
- 💾 Persistent storage (conversations are saved locally)

## Screenshots

(Screenshots will appear here once the app is running)

## Getting Started

### Prerequisites

- Node.js (v18.12.1 or higher, v18.18+ recommended)
- npm or yarn
- Expo Go app on your mobile device

> **Note on Node.js compatibility**: This app has been configured to work with Node.js 18.12.1, but Expo recommends v18.18+. Some warnings may appear but should not affect functionality.

### Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/bubl.git
cd bubl
```

2. Install dependencies:
```
npm install
```

3. Start the development server:
```
npm start
```

4. Open the app:
   - Scan the QR code with the Expo Go app on your device
   - iOS: Press `i` to open in iOS simulator (if available)
   - Android: Press `a` to open in Android emulator (if available)
   - Web: Press `w` to open in web browser

### Troubleshooting

If you encounter errors related to Node.js compatibility:

1. The app includes polyfills for `os.availableParallelism()` which is required in newer Expo versions
2. If you see "Metro Bundler" errors, try:
   - Using the `--no-dev --minify` flags (included in npm start)
   - Upgrading to Node.js 18.18 or higher

## Tech Stack

- React Native
- Expo
- TypeScript
- React Navigation
- React Native Paper (UI components)
- AsyncStorage (for local storage)
- React Native Reanimated (for animations)

## Project Structure

```
src/
├── components/       # Reusable UI components
├── context/          # React Context for state management
├── screens/          # App screens
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
```

## License

This project is licensed under the MIT License.

## Acknowledgements

- This is a clone project built for educational purposes
- Inspired by the official bubl interface by OpenAI 