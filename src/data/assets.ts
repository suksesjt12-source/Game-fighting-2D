import titleBgUrl from '../assets/images/eclipse_title_bg_1794752528161.jpg';
import mountainVillageUrl from '../assets/images/arena_mountain_village_1794752528076.jpg';
import moonTempleUrl from '../assets/images/arena_moon_temple_1794752528757.jpg';
import volcanicFieldUrl from '../assets/images/arena_volcanic_field_1794752529772.jpg';
import ruinedCityUrl from '../assets/images/arena_ruined_city_1794752530991.jpg';
import kairoPortraitUrl from '../assets/images/portrait_kairo_1794752530991.jpg';
import reinaPortraitUrl from '../assets/images/portrait_reina_1794752531060.jpg';
import razenPortraitUrl from '../assets/images/portrait_razen_1794752531794.jpg';
import shiroPortraitUrl from '../assets/images/portrait_shiro_1794752532612.jpg';
import yunaPortraitUrl from '../assets/images/portrait_yuna_1794752533203.jpg';
import ignisPortraitUrl from '../assets/images/portrait_ignis_1794752534203.jpg';

import { ArenaId } from '../arena/ArenaData';
import { CharacterId } from '../characters/CharacterData';

export const TITLE_BG_URL = titleBgUrl;

export const ARENA_IMAGES: Record<ArenaId, string> = {
  mountain_village: mountainVillageUrl,
  moon_temple: moonTempleUrl,
  volcanic_field: volcanicFieldUrl,
  ruined_city: ruinedCityUrl,
};

export const CHARACTER_PORTRAITS: Record<CharacterId, string> = {
  kairo: kairoPortraitUrl,
  reina: reinaPortraitUrl,
  razen: razenPortraitUrl,
  shiro: shiroPortraitUrl,
  yuna: yunaPortraitUrl,
  ignis: ignisPortraitUrl,
};
