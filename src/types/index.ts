export type EventStatus = 'Confirmado' | 'Pendente' | 'Cancelado';

export interface City {
  id: string;
  name: string;
  state: string;
}

export interface TechnicalRider {
  id: string;
  name: string;
  artistId: string | null;
  equipment: string;
  soundSystem: string;
  microphones: string;
  monitors: string;
  notes: string;
}

export interface Artist {
  id: string;
  name: string;
  musicalStyle: string;
  contact: string;
  defaultRiderId: string | null;
  riderFileName: string | null;
  riderFileUrl: string | null;
  notes: string;
}

export interface EventItem {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  name: string;
  cityId: string;
  venue: string;
  artistId: string;
  riderId: string | null;
  setupTime: string;
  showTime: string;
  notes: string;
  status: EventStatus;
}
