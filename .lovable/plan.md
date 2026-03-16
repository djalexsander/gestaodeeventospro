

# Agenda Estação Mix Eventos

## Overview
A professional event management dashboard for **Estação Mix Eventos**, designed to manage musical events, artists, technical riders, and cities with a modern "Backstage Professional" aesthetic.

## Design System
- **Colors:** Electric Indigo (#6366F1) primary, Deep Slate (#0F172A) sidebar, Cool Gray (#F8FAFC) background, status badges (green/yellow/red)
- **Fonts:** Montserrat for headings/branding, Inter for body/data
- **Layout:** Persistent left sidebar + split-screen main view (calendar + daily agenda)

## Pages & Navigation

### Sidebar Navigation
- **Dashboard** (home/calendar view)
- **Artistas** (artist management)
- **Riders Técnicos** (technical rider management)
- **Cidades** (city management)

### 1. Dashboard (Main View)
- **Left 2/3:** Interactive monthly calendar showing event dots color-coded by status (green=Confirmado, yellow=Pendente, red=Cancelado)
- **Right 1/3:** Daily agenda panel listing events for the selected date as cards
- **Filter bar** at top: filter by date range, city, and artist
- Clicking an event opens a **slide-over drawer** with full details (artist, city, venue, rider, schedules, notes, status)
- From the drawer: edit or delete the event
- FAB/button to add new event (opens drawer with form)

### 2. Artistas Page
- Table/card list of all artists with search
- Each artist shows: name, musical style, contact, default rider, notes
- Add/edit/delete artists via dialog
- When an artist has a default rider, it auto-links when creating events

### 3. Riders Técnicos Page
- Table/card list of all technical riders
- Each rider shows: name, linked artist, required equipment, sound system, microphones, monitors, notes
- Add/edit/delete riders via dialog

### 4. Cidades Page
- Simple table of cities with state (Brazilian states)
- Add/edit/delete cities

## Key Features
- **Auto-link rider to artist:** When selecting an artist for an event, the artist's default rider is automatically populated (editable)
- **Status management:** Color-coded badges throughout (Confirmado, Pendente, Cancelado)
- **Responsive:** Sidebar collapses to bottom nav on mobile; calendar switches to weekly strip view on mobile
- **All data stored locally** using React state (no backend initially — can add Supabase later)

## Data Flow
- Local state management with React Context
- CRUD operations for all entities (Events, Artists, Riders, Cities)
- Relationships: Event → Artist → Rider, Event → City

