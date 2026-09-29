# iOS TestFlight Spike

This branch packages the existing React/Vite client with Capacitor. The native project is in `apps/web/ios` and is intended to build on a remote macOS runner.

## Remote build

1. Create a Codemagic account and connect the GitHub repository.
2. Select the `ios-capacitor-spike` branch and use `codemagic.yaml`.
3. Add `VITE_API_URL` as the deployed HTTPS API URL. Do not use `localhost`.
4. In Apple Developer, register bundle ID `com.meetup.community` and create the App Store Connect integration required by Codemagic.
5. Start the `ios-testflight` workflow. Codemagic supplies macOS, Xcode, CocoaPods, signing, and archive tooling.
6. Install the resulting build through TestFlight on a physical iPhone.

The first spike uses foreground location only. Background tracking, native push, and App Store release configuration are separate follow-up work.

## Local Windows checks

Run `npm run build --workspace meetup-web` and then `npm run mobile:sync --workspace meetup-web`. These validate the web bundle and copy it into the iOS project, but Windows cannot run Xcode, CocoaPods, or the iOS simulator.