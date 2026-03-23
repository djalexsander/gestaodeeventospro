import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { City, Artist, TechnicalRider, EventItem, EventStatus } from '@/types';
import { useCompany } from '@/context/CompanyContext';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface AppContextType {
  cities: City[];
  artists: Artist[];
  riders: TechnicalRider[];
  events: EventItem[];
  loading: boolean;
  hasUpdates: boolean;
  refreshData: () => Promise<void>;
  addCity: (city: Omit<City, 'id'>) => Promise<string | null>;
  updateCity: (city: City) => Promise<void>;
  deleteCity: (id: string) => Promise<void>;
  addArtist: (artist: Omit<Artist, 'id'>) => Promise<string | null>;
  updateArtist: (artist: Artist) => Promise<void>;
  deleteArtist: (id: string) => Promise<void>;
  addRider: (rider: Omit<TechnicalRider, 'id'>) => Promise<void>;
  updateRider: (rider: TechnicalRider) => Promise<void>;
  deleteRider: (id: string) => Promise<void>;
  addEvent: (event: Omit<EventItem, 'id'>) => Promise<string | undefined>;
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
  const [hasUpdates, setHasUpdates] = useState(false);
  const { activeCompanyId } = useCompany();
  const { user, isAdminMaster, role, loading: authLoading } = useAuth();

  const fetchAll = useCallback(async () => {
    if (authLoading) return;

    if (!user || isAdminMaster) {
      setCities([]);
      setArtists([]);
      setRiders([]);
      setEvents([]);
      setLoading(false);
      setHasUpdates(false);
      return;
    }

    setLoading(true);

    let citiesQ = supabase.from('cities').select('*').order('name');
    let artistsQ = supabase.from('artists').select('*').order('name');
    let ridersQ = supabase.from('technical_riders').select('*').order('name');
    let eventsQ = supabase.from('events').select('*').order('date');

    if (activeCompanyId) {
      citiesQ = citiesQ.eq('company_id', activeCompanyId);
      artistsQ = artistsQ.eq('company_id', activeCompanyId);
      ridersQ = ridersQ.eq('company_id', activeCompanyId);
      eventsQ = eventsQ.eq('company_id', activeCompanyId);
    }

    const [citiesRes, artistsRes, ridersRes, eventsRes] = await Promise.all([
      citiesQ, artistsQ, ridersQ, eventsQ,
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
    if (eventsRes.data) {
      const mapped = eventsRes.data.map(e => ({
        id: e.id, date: e.date, name: e.name, cityId: e.city_id, venue: e.venue,
        artistId: e.artist_id, riderId: e.rider_id, setupTime: e.setup_time,
        showTime: e.show_time, departureDate: (e as any).departure_date || null,
        departureTime: (e as any).departure_time || '', notes: e.notes,
        staffNotes: (e as any).staff_notes || '', status: e.status as EventStatus,
      }));
      // Usuários comuns só veem eventos confirmados
      setEvents(role === 'user' ? mapped.filter(e => e.status === 'Confirmado') : mapped);
    }

    setLoading(false);
    setHasUpdates(false);
  }, [activeCompanyId, authLoading, isAdminMaster, user]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const handleChange = () => { void fetchAll(); };
    const channel = supabase
      .channel('data-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cities' }, handleChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'artists' }, handleChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'technical_riders' }, handleChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, handleChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_members' }, handleChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_staff' }, handleChange)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  const refreshData = useCallback(async () => { await fetchAll(); }, [fetchAll]);

  const uploadRiderFile = useCallback(async (file: File): Promise<{ fileName: string; fileUrl: string } | null> => {
    const ext = file.name.split('.').pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('riders').upload(path, file);
    if (error) { toast.error('Erro ao enviar PDF'); return null; }
    const { data: urlData } = supabase.storage.from('riders').getPublicUrl(path);
    return { fileName: file.name, fileUrl: urlData.publicUrl };
  }, []);

  // Cities CRUD
  const addCity = useCallback(async (city: Omit<City, 'id'>): Promise<string | null> => {
    const insertData: any = { name: city.name, state: city.state };
    if (activeCompanyId) insertData.company_id = activeCompanyId;
    const { data, error } = await supabase.from('cities').insert(insertData).select().single();
    if (error) { toast.error('Erro ao criar cidade'); return null; }
    setCities(prev => [...prev, { id: data.id, name: data.name, state: data.state }]);
    return data.id;
  }, [activeCompanyId]);

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
  const addArtist = useCallback(async (artist: Omit<Artist, 'id'>): Promise<string | null> => {
    const insertData: any = {
      name: artist.name, musical_style: artist.musicalStyle, contact: artist.contact,
      rider_file_name: artist.riderFileName, rider_file_url: artist.riderFileUrl, notes: artist.notes,
    };
    if (activeCompanyId) insertData.company_id = activeCompanyId;
    const { data, error } = await supabase.from('artists').insert(insertData).select().single();
    if (error) { toast.error('Erro ao criar artista'); return null; }
    setArtists(prev => [...prev, {
      id: data.id, name: data.name, musicalStyle: data.musical_style, contact: data.contact,
      defaultRiderId: null, riderFileName: data.rider_file_name, riderFileUrl: data.rider_file_url, notes: data.notes,
    }]);
    return data.id;
  }, [activeCompanyId]);

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
    const insertData: any = {
      name: rider.name, artist_id: rider.artistId, equipment: rider.equipment,
      sound_system: rider.soundSystem, microphones: rider.microphones, monitors: rider.monitors, notes: rider.notes,
      rider_file_name: rider.riderFileName, rider_file_url: rider.riderFileUrl,
    };
    if (activeCompanyId) insertData.company_id = activeCompanyId;
    const { data, error } = await supabase.from('technical_riders').insert(insertData).select().single();
    if (error) { toast.error('Erro ao criar rider'); return; }
    setRiders(prev => [...prev, {
      id: data.id, name: data.name, artistId: data.artist_id, equipment: data.equipment,
      soundSystem: data.sound_system, microphones: data.microphones, monitors: data.monitors, notes: data.notes,
      riderFileName: data.rider_file_name, riderFileUrl: data.rider_file_url,
    }]);
  }, [activeCompanyId]);

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
  const addEvent = useCallback(async (event: Omit<EventItem, 'id'>): Promise<string | undefined> => {
    const insertData: any = {
      date: event.date, name: event.name, city_id: event.cityId, venue: event.venue,
      artist_id: event.artistId, rider_id: event.riderId, setup_time: event.setupTime,
      show_time: event.showTime, notes: event.notes, status: event.status,
      departure_date: event.departureDate, departure_time: event.departureTime,
      staff_notes: event.staffNotes,
    };
    if (activeCompanyId) insertData.company_id = activeCompanyId;
    const { data, error } = await supabase.from('events').insert(insertData).select().single();
    if (error) { toast.error('Erro ao criar evento'); return undefined; }
    setEvents(prev => [...prev, {
      id: data.id, date: data.date, name: data.name, cityId: data.city_id, venue: data.venue,
      artistId: data.artist_id, riderId: data.rider_id, setupTime: data.setup_time,
      showTime: data.show_time, departureDate: (data as any).departure_date || null,
      departureTime: (data as any).departure_time || '', notes: data.notes,
      staffNotes: (data as any).staff_notes || '', status: data.status as EventStatus,
    }]);
    return data.id;
  }, [activeCompanyId]);

  const updateEvent = useCallback(async (event: EventItem) => {
    const { error } = await supabase.from('events').update({
      date: event.date, name: event.name, city_id: event.cityId, venue: event.venue,
      artist_id: event.artistId, rider_id: event.riderId, setup_time: event.setupTime,
      show_time: event.showTime, notes: event.notes, status: event.status,
      departure_date: event.departureDate, departure_time: event.departureTime,
      staff_notes: event.staffNotes,
    } as any).eq('id', event.id);
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
      cities, artists, riders, events, loading, hasUpdates, refreshData,
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
