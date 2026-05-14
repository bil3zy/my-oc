---
name: ionic-ios-build
description: Use when building Ionic apps with Capacitor for iOS device or simulator on macOS
---

# Ionic iOS Build

## Overview
Build Ionic + Capacitor web app and sync to iOS for device or simulator deployment.

## When to Use
- Running `ionic build` followed by `npx cap sync ios`
- Deploying to iOS device or simulator
- Opening Xcode from Ionic project
- Running `ionic capacitor run ios`

## Quick Reference

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `ionic build` | Compile web assets |
| 2 | `npx cap sync ios` | Copy assets to iOS native folder |
| 3 | `ionic cap open ios` | Open Xcode for device deployment |

## Alternative Workflow

**Single command - builds, syncs, and deploys:**
```bash
ionic capacitor run ios
```
Prompts to select device/simulator, then builds and deploys.

## Prerequisites

| Requirement | Command |
|-------------|---------|
| Xcode installed | Download from App Store |
| Command line tools | `xcode-select --install` |
| iOS platform added | `ionic cap add ios` |
| Apple Developer account | For device deployment (not needed for simulator) |

## Full Workflow

```bash
# Step 1: Build web assets
ionic build

# Step 2: Sync to iOS
npx cap sync ios

# Step 3: Open Xcode (for device deployment)
ionic cap open ios
```

In Xcode: select target device → click Run

## Troubleshooting

| Issue | Solution |
|-------|----------|
| iOS not updating after build | Run `npx cap sync ios` again |
| Build fails | Check `ionic build` first works |
| Device not recognized | Ensure Xcode command line tools installed |
| Empty Xcode workspace | Re-run `npx cap sync ios` |

## Environment Variables

None required - commands use local project config.

## Related Commands

| Command | Purpose |
|---------|---------|
| `ionic capacitor run ios --livereload` | Live reload on device |
| `npx cap copy ios` | Copy without update |
| `ionic cap sync ios --prod` | Production build |