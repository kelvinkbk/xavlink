# Android Safe Area Insets Fix

## Problem

The Android system navigation bar (Back/Home/Recents buttons) was overlapping with the app's bottom navigation bar, making it difficult to interact with the app's menu items.

This occurred because the tab bar had a fixed `paddingBottom: 8` that didn't account for:

- **Hardware button navigation** (older Android devices with physical buttons)
- **Gesture navigation** (newer Android devices with swipe gestures)
- **Different device navigation bar heights** (varies by Android version and manufacturer)

## Solution

Implemented **Safe Area Insets** from the `react-native-safe-area-context` library to dynamically adjust the bottom navigation bar's padding based on the device's safe area.

### Changes Made

**File:** `mobile/src/navigation/MainTabs.jsx`

#### 1. Added Import

```javascript
import { useSafeAreaInsets } from "react-native-safe-area-context";
```

#### 2. Added Hook in MainTabs Component

```javascript
const MainTabs = () => {
  // ... other hooks
  const insets = useSafeAreaInsets();
  // ... rest of component
};
```

#### 3. Updated Tab Bar Styling

**Before:**

```javascript
tabBarStyle: {
  // ... other styles
  paddingBottom: 8,
  // ...
}
```

**After:**

```javascript
tabBarStyle: {
  // ... other styles
  paddingBottom: Math.max(8, insets.bottom),
  // ...
}
```

## How It Works

1. **`useSafeAreaInsets()`** - Hook that provides safe area measurements for all device edges
2. **`insets.bottom`** - The bottom safe area inset value, automatically calculated by React Native:
   - On Android: Accounts for system navigation bar height (0 if gestures, ~48dp if buttons)
   - On iOS: Accounts for home indicator and notch if present
   - Automatically updates when device orientation changes or nav bar settings change

3. **`Math.max(8, insets.bottom)`** - Ensures minimum 8px padding while using full safe area:
   - Uses the larger value between the minimum padding (8px) and the safe area inset
   - Prevents content from being hidden by system UI

## Compatibility

✅ **Already Supported** - Your app.js already has `SafeAreaProvider` configured:

```javascript
import { SafeAreaProvider } from "react-native-safe-area-context";
// Used in App wrapper
```

## Testing Recommendations

1. **Test on Android devices with different navigation settings:**
   - Gesture navigation (Pixel 4+, Android 9+)
   - Hardware button navigation (older devices)
   - Navigation bar position changes (if supported)

2. **Test on devices with different screen sizes:**
   - Small phones, tablets, foldables
   - Landscape and portrait orientations

3. **Behavior to verify:**
   - Bottom menu items are now fully accessible
   - No overlap with system navigation buttons
   - Tab bar properly respects safe area on all devices
   - FAB button (already using insets.bottom) is also properly positioned

## Related Components

The `FloatingActionButton` component already uses safe area insets correctly:

```javascript
const insets = useSafeAreaInsets();
// Applied as: bottom: Math.max(12, (bottomOffset || 0) + insets.bottom + 16)
```

## Future Improvements

- Consider creating a custom hook for consistent safe area handling across the app
- Monitor for any other bottom-positioned components that might need similar treatment
