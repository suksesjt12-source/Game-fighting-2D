export type ArenaId = 'mountain_village' | 'moon_temple' | 'volcanic_field' | 'ruined_city';

export interface ArenaDefinition {
  id: ArenaId;
  name: string;
  subtitle: string;
  description: string;
  ambientTint: string;
  floorColor: string;
  floorHighlight: string;
  particleColor: string;
  particleSecondary: string;
  particleDirection: 'up' | 'drift' | 'fall';
}

export const WORLD_WIDTH = 1280;
export const WORLD_HEIGHT = 720;
export const GROUND_Y = 574;
export const STAGE_LEFT = 140;
export const STAGE_RIGHT = 1140;

export const ARENAS: Record<ArenaId, ArenaDefinition> = {
  mountain_village: {
    id: 'mountain_village',
    name: 'Mountain Village',
    subtitle: 'Twilight Lantern Courtyard',
    description: 'Mist-draped alpine shrine steps illuminated by warm amber paper lanterns beneath snow peaks.',
    ambientTint: 'rgba(245, 158, 11, 0.14)',
    floorColor: '#1E2330',
    floorHighlight: 'rgba(251, 191, 36, 0.22)',
    particleColor: '#FBBF24',
    particleSecondary: '#CBD5E1',
    particleDirection: 'drift',
  },
  moon_temple: {
    id: 'moon_temple',
    name: 'Moon Temple',
    subtitle: 'Celestial Eclipse Sanctum',
    description: 'Ancient floating marble sanctum suspended above moonlit clouds and arcane cyan wisps.',
    ambientTint: 'rgba(56, 189, 248, 0.16)',
    floorColor: '#121B2E',
    floorHighlight: 'rgba(34, 211, 238, 0.25)',
    particleColor: '#38BDF8',
    particleSecondary: '#A855F7',
    particleDirection: 'up',
  },
  volcanic_field: {
    id: 'volcanic_field',
    name: 'Volcanic Field',
    subtitle: 'Obsidian Caldera Edge',
    description: 'Scorched basalt bridge overlooking glowing magma falls and drifting crimson embers.',
    ambientTint: 'rgba(249, 115, 22, 0.18)',
    floorColor: '#1C1414',
    floorHighlight: 'rgba(249, 115, 22, 0.30)',
    particleColor: '#FB923C',
    particleSecondary: '#EF4444',
    particleDirection: 'up',
  },
  ruined_city: {
    id: 'ruined_city',
    name: 'Ruined City',
    subtitle: 'Shattered Viaduct Dusk',
    description: 'Golden sunset beams piercing storm clouds over fractured stone arches and battle banners.',
    ambientTint: 'rgba(251, 191, 36, 0.14)',
    floorColor: '#1F1E24',
    floorHighlight: 'rgba(245, 158, 11, 0.22)',
    particleColor: '#FDE68A',
    particleSecondary: '#9CA3AF',
    particleDirection: 'drift',
  },
};

export const ARENA_ORDER: ArenaId[] = ['mountain_village', 'moon_temple', 'volcanic_field', 'ruined_city'];
