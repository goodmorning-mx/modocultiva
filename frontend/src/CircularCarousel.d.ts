import type { CSSProperties, ReactNode } from 'react';

export interface CarouselItem {
  id: string;
  src: string;
  label: string;
  style: CSSProperties;
  content: ReactNode;
}

export default function CircularCarousel(props: {
  items: CarouselItem[];
  label: string;
  controls: { previous: string; next: string; rotation: ReactNode };
  paused?: boolean;
  onItemClick: (item: CarouselItem) => void;
  preset?: 'panorama' | 'cylinder' | 'orbit' | 'wheel';
  intro?: 'assemble' | 'none' | 'rise' | 'spin';
  cardWidth?: number;
  aspectRatio?: number;
  speed?: number;
  gap?: number;
  tilt?: number;
  curve?: number;
  perspective?: number;
  autoplay?: 'drift' | 'step' | 'off';
  interval?: number;
  direction?: 'left' | 'right';
  momentum?: number;
  snap?: boolean;
  pauseOnHover?: boolean;
  focusOnClick?: boolean;
  draggable?: boolean;
  parallax?: number;
  stretch?: number;
  fadeColor?: string;
  depthFade?: number;
  innerShade?: number;
  cornerRadius?: number;
}): ReactNode;
