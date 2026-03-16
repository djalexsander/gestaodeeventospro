import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { City, Artist, TechnicalRider, EventItem } from '@/types';

interface AppContextType {
  cities: City[];
  artists: Artist[];
  riders: TechnicalRider[];
  events: EventItem[];
  addCity: (city: Omit<City, 'id'>) => void;
  updateCity: (city: City) => void;
  deleteCity: (id: string) => void;
  addArtist: (artist: Omit<Artist, 'id'>) => void;
  updateArtist: (artist: Artist) => void;
  deleteArtist: (id: string) => void;
  addRider: (rider: Omit<TechnicalRider, 'id'>) => void;
  updateRider: (rider: TechnicalRider) => void;
  deleteRider: (id: string) => void;
  addEvent: (event: Omit<EventItem, 'id'>) => void;
  updateEvent: (event: EventItem) => void;
  deleteEvent: (id: string) => void;
  getArtistById: (id: string) => Artist | undefined;
  getCityById: (id: string) => City | undefined;
  getRiderById: (id: string) => TechnicalRider | undefined;
  getRiderByArtistId: (artistId: string) => TechnicalRider | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const sampleCities: City[] = [
  { id: uuidv4(), name: 'São Paulo', state: 'SP' },
  { id: uuidv4(), name: 'Rio de Janeiro', state: 'RJ' },
  { id: uuidv4(), name: 'Belo Horizonte', state: 'MG' },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [cities, setCities] = useState<City[]>(sampleCities);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [riders, setRiders] = useState<TechnicalRider[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);

  const addCity = useCallback((city: Omit<City, 'id'>) => {
    setCities(prev => [...prev, { ...city, id: uuidv4() }]);
  }, []);
  const updateCity = useCallback((city: City) => {
    setCities(prev => prev.map(c => c.id === city.id ? city : c));
  }, []);
  const deleteCity = useCallback((id: string) => {
    setCities(prev => prev.filter(c => c.id !== id));
  }, []);

  const addArtist = useCallback((artist: Omit<Artist, 'id'>) => {
    setArtists(prev => [...prev, { ...artist, id: uuidv4() }]);
  }, []);
  const updateArtist = useCallback((artist: Artist) => {
    setArtists(prev => prev.map(a => a.id === artist.id ? artist : a));
  }, []);
  const deleteArtist = useCallback((id: string) => {
    setArtists(prev => prev.filter(a => a.id !== id));
  }, []);

  const addRider = useCallback((rider: Omit<TechnicalRider, 'id'>) => {
    setRiders(prev => [...prev, { ...rider, id: uuidv4() }]);
  }, []);
  const updateRider = useCallback((rider: TechnicalRider) => {
    setRiders(prev => prev.map(r => r.id === rider.id ? rider : r));
  }, []);
  const deleteRider = useCallback((id: string) => {
    setRiders(prev => prev.filter(r => r.id !== id));
  }, []);

  const addEvent = useCallback((event: Omit<EventItem, 'id'>) => {
    setEvents(prev => [...prev, { ...event, id: uuidv4() }]);
  }, []);
  const updateEvent = useCallback((event: EventItem) => {
    setEvents(prev => prev.map(e => e.id === event.id ? event : e));
  }, []);
  const deleteEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  const getArtistById = useCallback((id: string) => artists.find(a => a.id === id), [artists]);
  const getCityById = useCallback((id: string) => cities.find(c => c.id === id), [cities]);
  const getRiderById = useCallback((id: string) => riders.find(r => r.id === id), [riders]);
  const getRiderByArtistId = useCallback((artistId: string) => riders.find(r => r.artistId === artistId), [riders]);

  return (
    <AppContext.Provider value={{
      cities, artists, riders, events,
      addCity, updateCity, deleteCity,
      addArtist, updateArtist, deleteArtist,
      addRider, updateRider, deleteRider,
      addEvent, updateEvent, deleteEvent,
      getArtistById, getCityById, getRiderById, getRiderByArtistId,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}
