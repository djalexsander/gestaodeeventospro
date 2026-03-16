import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { City, Artist, TechnicalRider, EventItem, EventStatus } from '@/types';
import { toast } from 'sonner';

interface AppContextType {
  cities: City[];
  artists: Artist[];
  riders: TechnicalRider[];
  events: EventItem[];
  loading: boolean;
  addCity: (city: Omit<City, 'id'>) => Promise<void>;
  updateCity: (city: City) => Promise<void>;
  deleteCity: (id: string) => Promise<void>;
  addArtist: (artist: Omit<Artist, 'id'>) => Promise<void>;
  updateArtist: (artist: Artist) => Promise<void>;
  deleteArtist: (id: string) => Promise<void>;
  addRider: (rider: Omit<TechnicalRider, 'id'>) => Promise<void>;
  updateRider: (rider: TechnicalRider) => Promise<void>;
  deleteRider: (id: string) => Promise<void>;
  addEvent: (event: Omit<EventItem, 'id'>) => Promise<void>;
  updateEvent: (event: EventItem) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getArtistById: (id: string) => Artist | undefined;
  getCityById: (id: string) => City | undefined;
  getRiderById: (id: string) => TechnicalRider | undefined;
  getRiderByArtistId: (artistId: string) => TechnicalRider | undefined;
  uploadRiderFile: (file: File) => Promise<{ fileName: string; fileUrl: string } | null>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [cities, setCities] = useState<City[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [riders, setRiders] = useState<TechnicalRider[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all data on mount
  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      const [citiesRes, artistsRes, ridersRes, eventsRes] = await Promise.all([
        supabase.from('cities').select('*').order('name'),
        supabase.from('artists').select('*').order('name'),
        supabase.from('technical_riders').select('*').order('name'),
        supabase.from('events').select('*').order('date'),
      ]);

      if (citiesRes.data) setCities(citiesRes.data.map(c => ({ id: c.id, name: c.name, state: c.state })));
      if (artistsRes.data) setArtists(artistsRes.data.map(a => ({
        id: a.id, name: a.name, musicalStyle: a.musical_style, contact: a.contact,
        defaultRiderId: null, riderFileName: a.rider_file_name, riderFileUrl: a.rider_file_url, notes: a.notes,
      })));
      if (ridersRes.data) setRiders(ridersRes.data.map(r => ({
        id: r.id, name: r.name, artistId: r.artist_id, equipment: r.equipment,
        soundSystem: r.sound_system, microphones: r.microphones, monitors: r.monitors, notes: r.notes,
        riderFileName: r.rider_file_name, riderFileUrl: r.rider_file_url,
      })));
      if (eventsRes.data) setEvents(eventsRes.data.map(e => ({
        id: e.id, date: e.date, name: e.name, cityId: e.city_id, venue: e.venue,
        artistId: e.artist_id, riderId: e.rider_id, setupTime: e.setup_time,
        showTime: e.show_time, notes: e.notes, status: e.status as EventStatus,
      })));
      setLoading(false);
    }
    fetchAll();
  }, []);

  // Upload rider PDF to storage
  const uploadRiderFile = useCallback(async (file: File): Promise<{ fileName: string; fileUrl: string } | null> => {
    const ext = file.name.split('.').pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('riders').upload(path, file);
    if (error) { toast.error('Erro ao enviar PDF'); return null; }
    const { data: urlData } = supabase.storage.from('riders').getPublicUrl(path);
    return { fileName: file.name, fileUrl: urlData.publicUrl };
  }, []);

  // Cities CRUD
  const addCity = useCallback(async (city: Omit<City, 'id'>) => {
    const { data, error } = await supabase.from('cities').insert({ name: city.name, state: city.state }).select().single();
    if (error) { toast.error('Erro ao criar cidade'); return; }
    setCities(prev => [...prev, { id: data.id, name: data.name, state: data.state }]);
  }, []);

  const updateCity = useCallback(async (city: City) => {
    const { error } = await supabase.from('cities').update({ name: city.name, state: city.state }).eq('id', city.id);
    if (error) { toast.error('Erro ao atualizar cidade'); return; }
    setCities(prev => prev.map(c => c.id === city.id ? city : c));
  }, []);

  const deleteCity = useCallback(async (id: string) => {
    const { error } = await supabase.from('cities').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir cidade'); return; }
    setCities(prev => prev.filter(c => c.id !== id));
  }, []);

  // Artists CRUD
  const addArtist = useCallback(async (artist: Omit<Artist, 'id'>) => {
    const { data, error } = await supabase.from('artists').insert({
      name: artist.name, musical_style: artist.musicalStyle, contact: artist.contact,
      rider_file_name: artist.riderFileName, rider_file_url: artist.riderFileUrl, notes: artist.notes,
    }).select().single();
    if (error) { toast.error('Erro ao criar artista'); return; }
    setArtists(prev => [...prev, {
      id: data.id, name: data.name, musicalStyle: data.musical_style, contact: data.contact,
      defaultRiderId: null, riderFileName: data.rider_file_name, riderFileUrl: data.rider_file_url, notes: data.notes,
    }]);
  }, []);

  const updateArtist = useCallback(async (artist: Artist) => {
    const { error } = await supabase.from('artists').update({
      name: artist.name, musical_style: artist.musicalStyle, contact: artist.contact,
      rider_file_name: artist.riderFileName, rider_file_url: artist.riderFileUrl, notes: artist.notes,
    }).eq('id', artist.id);
    if (error) { toast.error('Erro ao atualizar artista'); return; }
    setArtists(prev => prev.map(a => a.id === artist.id ? artist : a));
  }, []);

  const deleteArtist = useCallback(async (id: string) => {
    const { error } = await supabase.from('artists').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir artista'); return; }
    setArtists(prev => prev.filter(a => a.id !== id));
  }, []);

  // Riders CRUD
  const addRider = useCallback(async (rider: Omit<TechnicalRider, 'id'>) => {
    const { data, error } = await supabase.from('technical_riders').insert({
      name: rider.name, artist_id: rider.artistId, equipment: rider.equipment,
      sound_system: rider.soundSystem, microphones: rider.microphones, monitors: rider.monitors, notes: rider.notes,
      rider_file_name: rider.riderFileName, rider_file_url: rider.riderFileUrl,
    }).select().single();
    if (error) { toast.error('Erro ao criar rider'); return; }
    setRiders(prev => [...prev, {
      id: data.id, name: data.name, artistId: data.artist_id, equipment: data.equipment,
      soundSystem: data.sound_system, microphones: data.microphones, monitors: data.monitors, notes: data.notes,
      riderFileName: data.rider_file_name, riderFileUrl: data.rider_file_url,
    }]);
  }, []);

  const updateRider = useCallback(async (rider: TechnicalRider) => {
    const { error } = await supabase.from('technical_riders').update({
      name: rider.name, artist_id: rider.artistId, equipment: rider.equipment,
      sound_system: rider.soundSystem, microphones: rider.microphones, monitors: rider.monitors, notes: rider.notes,
      rider_file_name: rider.riderFileName, rider_file_url: rider.riderFileUrl,
    }).eq('id', rider.id);
    if (error) { toast.error('Erro ao atualizar rider'); return; }
    setRiders(prev => prev.map(r => r.id === rider.id ? rider : r));
  }, []);

  const deleteRider = useCallback(async (id: string) => {
    const { error } = await supabase.from('technical_riders').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir rider'); return; }
    setRiders(prev => prev.filter(r => r.id !== id));
  }, []);

  // Events CRUD
  const addEvent = useCallback(async (event: Omit<EventItem, 'id'>) => {
    const { data, error } = await supabase.from('events').insert({
      date: event.date, name: event.name, city_id: event.cityId, venue: event.venue,
      artist_id: event.artistId, rider_id: event.riderId, setup_time: event.setupTime,
      show_time: event.showTime, notes: event.notes, status: event.status,
    }).select().single();
    if (error) { toast.error('Erro ao criar evento'); return; }
    setEvents(prev => [...prev, {
      id: data.id, date: data.date, name: data.name, cityId: data.city_id, venue: data.venue,
      artistId: data.artist_id, riderId: data.rider_id, setupTime: data.setup_time,
      showTime: data.show_time, notes: data.notes, status: data.status as EventStatus,
    }]);
  }, []);

  const updateEvent = useCallback(async (event: EventItem) => {
    const { error } = await supabase.from('events').update({
      date: event.date, name: event.name, city_id: event.cityId, venue: event.venue,
      artist_id: event.artistId, rider_id: event.riderId, setup_time: event.setupTime,
      show_time: event.showTime, notes: event.notes, status: event.status,
    }).eq('id', event.id);
    if (error) { toast.error('Erro ao atualizar evento'); return; }
    setEvents(prev => prev.map(e => e.id === event.id ? event : e));
  }, []);

  const deleteEvent = useCallback(async (id: string) => {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir evento'); return; }
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  const getArtistById = useCallback((id: string) => artists.find(a => a.id === id), [artists]);
  const getCityById = useCallback((id: string) => cities.find(c => c.id === id), [cities]);
  const getRiderById = useCallback((id: string) => riders.find(r => r.id === id), [riders]);
  const getRiderByArtistId = useCallback((artistId: string) => riders.find(r => r.artistId === artistId), [riders]);

  return (
    <AppContext.Provider value={{
      cities, artists, riders, events, loading,
      addCity, updateCity, deleteCity,
      addArtist, updateArtist, deleteArtist,
      addRider, updateRider, deleteRider,
      addEvent, updateEvent, deleteEvent,
      getArtistById, getCityById, getRiderById, getRiderByArtistId,
      uploadRiderFile,
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
