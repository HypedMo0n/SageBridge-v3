import type {Metadata,Viewport} from 'next';import {Inter} from 'next/font/google';import './globals.css';import {AppChrome} from '@/components/AppChrome';
const inter=Inter({subsets:['latin'],weight:['400','500'],variable:'--font-inter'});
export const metadata:Metadata={title:'SageBridge',description:'Sage 50 mobile companion'};export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#161826'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" className={inter.variable}><body><a href="#content" className="sr-only focus:not-sr-only">Skip to content</a><AppChrome>{children}</AppChrome></body></html>}
