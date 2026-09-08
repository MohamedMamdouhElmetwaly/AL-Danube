import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Al Danube · Riyadh Spatial Viewer', description: 'Explore and position the Market Al Danube 3D model in Riyadh with CesiumJS.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
