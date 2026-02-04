# SatFinder Pro

🛰️ A web-based satellite dish alignment tool with compass, AR view, and 200+ satellite database.

![SatFinder Pro](https://img.shields.io/badge/SatFinder-Pro-00d4ff?style=for-the-badge)

## Features

- **200+ Satellite Database** - Popular satellites including Hotbird, Astra, Nilesat, and more
- **Digital Compass** - Device orientation-based compass with target indicator
- **Azimuth/Elevation Calculator** - Precise dish alignment calculations
- **LNB Tilt** - Polarization skew angle
- **AR Camera View** - Overlay satellite positions on live camera feed
- **Interactive Map** - Shows your location and satellite direction
- **Satellite Search** - Find satellites by name or region
- **Favorites System** - Save frequently used satellites
- **Sound Alignment Indicator** - Audio feedback that beeps faster as you get closer

## Screenshots

| Compass View | Map View |
|--------------|----------|
| Digital compass with target indicator | Interactive map showing satellite direction |

## How to Run

### Local Development

```bash
# Clone the repository
git clone https://github.com/kwaikashraf/satfinder.git
cd satfinder

# Serve locally (using any static server)
npx serve .
```

Then open http://localhost:3000 in your browser.

### Mobile Access

For full functionality (compass, AR camera), access the app from a mobile device with:
- GPS enabled
- Device orientation sensors
- Camera access for AR view

## Tech Stack

- **HTML5** - Semantic markup
- **CSS3** - Custom properties, animations, glassmorphism
- **Vanilla JavaScript** - No frameworks, pure ES6+
- **Web APIs** - Geolocation, DeviceOrientation, MediaDevices

## Calculations

The app uses spherical trigonometry to calculate:

- **Azimuth** - Compass bearing from observer to satellite
- **Elevation** - Vertical angle above horizon
- **LNB Tilt** - Polarization skew angle

All calculations are based on the user's GPS coordinates and the satellite's geostationary orbital position.

## License

MIT License - Feel free to use and modify!

## Credits

Inspired by [SatFinder Pro](https://play.google.com/store/apps/details?id=com.esys.satfinderpro) Android app.
