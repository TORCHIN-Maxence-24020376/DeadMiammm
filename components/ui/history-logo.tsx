import { Image } from 'expo-image';
import { useMemo } from 'react';
import { ImageStyle, StyleProp } from 'react-native';

type HistoryLogoProps = {
  size?: number;
  primaryColor: string;
  secondaryColor: string;
  highlightColor: string;
  style?: StyleProp<ImageStyle>;
};

export function HistoryLogo({
  size = 40,
  primaryColor,
  secondaryColor,
  highlightColor,
  style,
}: HistoryLogoProps) {
  const source = useMemo(() => {
    const svg = `
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="historyGradient" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="${primaryColor}" />
            <stop offset="1" stop-color="${secondaryColor}" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="56" height="56" rx="18" fill="url(#historyGradient)" />
        <rect x="16" y="17" width="18" height="25" rx="7" fill="${highlightColor}" />
        <rect x="21" y="21" width="21" height="28" rx="8" fill="rgba(255,255,255,0.24)" />
        <circle cx="38" cy="37" r="11.5" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.74)" stroke-width="1.6" />
        <path d="M38 31V37L42.2 39.2" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M20.5 28.5C20.5 24 23.8 20.2 28.2 19.5" stroke="rgba(255,255,255,0.68)" stroke-width="2.2" stroke-linecap="round" />
        <path d="M22.7 16.6L28.9 19.9L24.9 25.3" stroke="rgba(255,255,255,0.68)" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `;

    return {
      uri: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    };
  }, [highlightColor, primaryColor, secondaryColor]);

  return <Image source={source} style={[{ width: size, height: size }, style]} contentFit="contain" />;
}
