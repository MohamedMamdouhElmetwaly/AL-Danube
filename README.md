# Al Danube - Riyadh 3D Model Viewer

An interactive 3D geospatial viewer for the Al Danube market model in Riyadh, Saudi Arabia, built with Next.js and CesiumJS.

## 🌐 Live Demo

**🚀 View Live Application:** [https://mohamedmamdouhelmetwaly.github.io/AL-Danube/](https://mohamedmamdouhelmetwaly.github.io/AL-Danube/)

The project automatically deploys to GitHub Pages when you push to the main branch.

## 🚀 Features

- **Full-Screen 3D Map** - Immersive satellite imagery view powered by CesiumJS
- **Interactive 3D Model** - Detailed market building with realistic textures
- **Smart Model Loading** - On-demand model loading for optimal performance
- **Riyadh City View** - Initial view showing the extent of Riyadh with distance-based labeling
- **Place Search** - Search for locations by name or coordinates
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **Model Controls** - Comprehensive placement, rotation, and scaling controls
- **Auto-save** - Position and settings persist across sessions

## 📋 Prerequisites

- Node.js 18+ or npm
- Modern web browser with WebGL support

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/MohamedMamdouhElmetwaly/AL-Danube.git
   cd AL-Danube
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Build for Production

```bash
npm run build
npm start
```

## 📦 Project Structure

```
danube-viewer/
├── app/                      # Next.js app directory
│   ├── api/                 # API routes (search)
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   ├── map-engine.ts        # CesiumJS map engine
│   ├── page.tsx             # Main page component
│   └── placement.ts         # Model placement logic
├── components/              # Reusable UI components
│   └── ui/                  # Shadcn UI components
├── public/                  # Static assets
│   ├── cesium/             # CesiumJS library and assets
│   ├── models/             # 3D model files (glTF)
│   └── favicon.svg
├── hooks/                   # React hooks
├── lib/                     # Utility functions
└── package.json            # Dependencies and scripts
```

## 🎮 Usage

### Initial View
- The map starts showing Riyadh city extent from ~120km altitude
- "RIYADH" label appears and disappears based on zoom level (>15km)

### Model Visibility
- Toggle the **Model** switch to load and show the 3D market model
- Model loads on-demand (first toggle only)
- Camera maintains position - use **Focus** button to zoom to model

### Search
- Use the search bar to find places or enter coordinates
- Format: `latitude, longitude` (e.g., `24.7136, 46.7219`)
- Search by place name (e.g., "Riyadh City Center")

### Model Controls (Sidebar)
- **Position**: Adjust latitude/longitude, place on map, nudge by 1m
- **Rotation**: Rotate model 0-360 degrees
- **Scale**: Overall scale and individual axis scaling
- **Height**: Ground offset adjustment
- **Focus**: Fly camera to model location
- **Reset**: Restore default placement

### Navigation
- **Pan**: Left-click drag or touch drag
- **Zoom**: Scroll wheel or pinch
- **Tilt**: Right-click drag or Ctrl+left-drag
- **Rotate**: Middle-click drag

## 🔧 Configuration

### Search API
The search functionality uses Nominatim (OpenStreetMap) API. To customize:
- Edit `app/api/search/route.ts`
- Configure rate limiting and caching as needed

### Model Files
Located in `public/models/`:
- `market-al-danube.gltf` - Main glTF file
- `geometry-*.bin` - Geometry buffers
- `textures/` - Model textures

### Map Settings
Edit `app/map-engine.ts` to customize:
- Initial camera position
- Imagery provider
- Terrain settings
- Label visibility thresholds

## 🌐 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Cloudflare Pages
```bash
npm run build
# Deploy the .next/ directory
```

### Static Export
```bash
npm run build
# Serve the out/ directory
```

## 📝 Environment Variables

No environment variables required for basic functionality. Optional:
- `NEXT_PUBLIC_CESIUM_ION_TOKEN` - For Cesium Ion assets (not required for this project)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project uses the Al Danube 3D model:
- Model by [sherif shawky](https://sketchfab.com/shawky.sherif1)
- Imagery © Esri, Maxar, Earthstar Geographics
- CesiumJS © Cesium

## 🙏 Acknowledgments

- **CesiumJS** - 3D globe and map rendering
- **Next.js** - React framework
- **Shadcn UI** - UI component library
- **OpenStreetMap** - Place search via Nominatim

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Check existing issues for solutions

## 🔗 Links

- [Live Demo](https://github.com/MohamedMamdouhElmetwaly/AL-Danube)
- [CesiumJS Documentation](https://cesium.com/learn/cesiumjs/)
- [Next.js Documentation](https://nextjs.org/docs)

---

Built with ❤️ for geospatial visualization
