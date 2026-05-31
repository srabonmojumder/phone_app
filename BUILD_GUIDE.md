# T-Drive App - Complete Build Guide

## Project Overview

**Application**: T-Drive (Cloud File Management System)
**Framework**: Expo 56
**Type**: Cross-platform mobile & web app (iOS, Android, Web)
**Language**: TypeScript
**Status**: ✅ Ready to Build

---

## Architecture Analysis

### Tech Stack
| Layer | Technology |
|-------|------------|
| **Frontend** | React 19.2.3, React Native 0.85.3 |
| **Bundler** | Metro (Expo) |
| **Routing** | Expo Router 56.2.8 |
| **Styling** | NativeWind 4.2.4 (Tailwind CSS) |
| **Backend** | Supabase (Auth + Database) |
| **State** | React Context API |
| **Assets** | SVG + PNG icons, Expo Vector Icons |
| **Build** | EAS (Expo Application Services) |

### Project Structure
```
my-app/
├── src/
│   ├── app/                 # Expo Router screens
│   │   ├── (auth)/         # Authentication routes
│   │   └── (app)/          # Protected app routes
│   ├── components/         # Reusable React components
│   │   ├── ui/            # Generic UI components
│   │   └── drive/         # Drive-specific components
│   ├── contexts/          # React Context (Auth, Drive)
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities (Supabase client)
│   └── constants/         # Theme, icons, data
├── assets/
│   ├── icons/            # SVG source icons
│   └── images/           # Generated PNG assets
├── android/              # Android native code
├── app.json             # Expo configuration
├── eas.json             # EAS build configuration
└── package.json         # Dependencies
```

### Key Features
- 🔐 **Authentication**: Supabase-based session management
- 📁 **File Management**: Upload, download, organize cloud files
- 🎬 **Media Support**: Video, images, thumbnails
- 📄 **Document Handling**: PDF viewing with react-native-pdf
- 📊 **Analytics**: Dashboard with charts (react-native-chart-kit)
- 🎨 **Themes**: Dark/Light mode with automatic detection
- 📱 **Responsive**: Optimized for phone, tablet, and web

---

## Dependency Analysis

### Core Dependencies (691 total)
**Production**:
- expo@56.0.8 - Framework
- react@19.2.3, react-native@0.85.3 - UI runtime
- expo-router@56.2.8 - File-based routing
- nativewind@4.2.4 - Styling
- @supabase/supabase-js@2.106.2 - Backend client
- react-native-reanimated@4.3.1 - Animations
- react-native-gesture-handler@2.31.1 - Gestures

**Expo Modules**:
- expo-video@56.1.2, expo-image@56.0.9 - Media
- expo-av, expo-video-thumbnails - Audio/Video
- expo-document-picker, expo-file-system - Files
- expo-media-library - Photo access
- expo-font, expo-symbols - Fonts & icons

**Security**: ⚠️ 11 moderate vulnerabilities (non-critical)

---

## Build Configuration

### app.json Highlights
```json
{
  "expo": {
    "name": "T-Drive",
    "version": "1.0.0",
    "slug": "my-app",
    "experiments": {
      "typedRoutes": true,      // Type-safe routing
      "reactCompiler": true      // Experimental React compiler
    },
    "plugins": [
      "expo-router",
      "expo-splash-screen",
      "expo-video",
      "@config-plugins/react-native-blob-util",
      "@config-plugins/react-native-pdf"
    ]
  }
}
```

### eas.json Configuration
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

---

## Environment Configuration

✅ **Required Environment Variables** (Already configured):
```env
EXPO_PUBLIC_SUPABASE_URL=https://gkhqbsfybgkgnifxbktx.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_jLiNgZkE8gaUq7OTv7XMJg_gYYQlDHh
```

---

## Icon & Assets Analysis

### Icon Configuration
| Asset | Type | Size | Purpose |
|-------|------|------|---------|
| **pwa-icon.svg** | SVG | 512×512 | Master icon (green gradient) |
| **icon.png** | PNG | 1024×1024 | App store icon |
| **android-icon-foreground.png** | PNG | 432×432 | Android adaptive foreground |
| **android-icon-background.png** | PNG | 1024×1024 | Android adaptive background |
| **android-icon-monochrome.png** | PNG | 512×512 | Android monochrome |
| **splash-icon.png** | PNG | Contains app logo | Splash screen |
| **favicon.png** | PNG | Web favicon | Browser tab |

### Icon Generation
Generated from source SVG using Sharp.js:
```bash
npm run generate:icons
```

---

## Build Instructions

### Prerequisites
```bash
✅ Node.js 18+ installed
✅ npm 9+ installed
✅ Dependencies installed (npm install)
✅ Environment variables configured
```

### 1. Development Build (Local Testing)

**Start development server:**
```bash
npm start
```

**Select platform:**
- `w` - Web (http://localhost:8081)
- `i` - iOS Simulator
- `a` - Android Emulator

### 2. Web Build (Production)
```bash
# Build static web app
expo export --platform web
npm run web
```

Output: `dist/` directory with static files

### 3. Android Build

**For Development:**
```bash
eas build --platform android --profile development
```

**For Production (Play Store):**
```bash
eas build --platform android --profile production
```

Output: APK (development) or AAB (production)

### 4. iOS Build

**For Development:**
```bash
eas build --platform ios --profile development
```

**For Production (App Store):**
```bash
eas build --platform ios --profile production
```

Output: Simulator build or archive for App Store

### 5. Build All Platforms
```bash
eas build --platform all
```

---

## Build Commands

| Command | Purpose |
|---------|---------|
| `npm start` | Start dev server (interactive platform selection) |
| `npm run android` | Start Android emulator |
| `npm run ios` | Start iOS simulator |
| `npm run web` | Start web dev server |
| `npm run lint` | Check code quality with ESLint |
| `npm run generate:icons` | Generate PNG icons from SVG |
| `npm run reset-project` | Reset to blank starter template |

---

## Deployment Options

### Option 1: Expo Go (Quick Testing)
- Install Expo Go app on device
- Scan QR code from `npm start`
- Works for development/testing

### Option 2: Development Build + EAS Update
- Build once with EAS: `eas build --platform all --profile development`
- Deploy updates instantly: `eas update`
- No app store review needed

### Option 3: Store Distribution (Production)
- **Google Play**: `eas build --platform android --profile production`
- **Apple App Store**: `eas build --platform ios --profile production`
- Web: Host static build on any CDN/server

---

## Performance Optimization

✅ **Already Configured**:
- React Compiler (experimental) enabled
- TypeScript strict mode
- Tree-shaking via Metro bundler
- SVG transformer for optimized icons
- NativeWind for efficient styling

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 8081 in use | `lsof -i :8081` then `kill -9 <PID>` |
| Metro cache issues | `npm start -- --reset-cache` |
| Module not found | `rm -rf node_modules && npm install` |
| Build stuck | Cancel and retry with `eas build --platform android --profile development` |

---

## Next Steps

1. **Test locally**: `npm start` → Select platform
2. **Fix any issues**: Shown in development console
3. **Build for preview**: `eas build --platform android --profile preview`
4. **Submit to stores**: Follow platform-specific guidelines
5. **Monitor**: Use Expo Dashboard for app usage/crashes

---

## Resources

- Expo Docs: https://docs.expo.dev/versions/v56.0.0/
- Supabase Docs: https://supabase.com/docs
- Expo Router: https://docs.expo.dev/router/introduction/
- EAS Build: https://docs.expo.dev/build/introduction/

