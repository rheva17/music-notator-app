import { create } from "zustand";
import { NoteItem, NotationMode, SongConfiguration, Track, Duration, Accidental, ClefType } from "../types/music";

interface SongStore {
    // Configuration
    config: SongConfiguration;

    // Current Notation
    tracks: Track[];
    activeTrackId: string;

    // Core state for copy/paste
    clipboard: NoteItem[] | null;

    // View State
    notationMode: NotationMode;

    // History
    past: Track[][];
    future: Track[][];

    // Editor Global State (for sharing input between Panel and Piano)
    editorState: {
        duration: Duration;
        isDotted: boolean;
        tieToNext: boolean;
        pianoInputEnabled: boolean;
        activeTargetClef: ClefType | "auto";
    };
    updateEditorState: (updates: Partial<SongStore['editorState']>) => void;

    // Actions
    toggleNotationMode: () => void;
    setNotationMode: (mode: NotationMode) => void;

    updateConfig: (newConfig: Partial<SongConfiguration>) => void;

    // Track Actions
    addTrack: (track: Omit<Track, "id" | "notes">) => void;
    removeTrack: (id: string) => void;
    setActiveTrack: (id: string) => void;
    updateTrack: (id: string, updates: Partial<Track>) => void;
    transposeTrack: (id: string, semitones: number) => void;
    setTracks: (tracks: Track[]) => void; // Used for MIDI import

    // Note Actions (operates on activeTrackId)
    addNote: (note: Omit<NoteItem, "id">) => void;
    removeNote: (noteId: string) => void;
    clearNotes: () => void; // Clears notes on active track

    // Clipboard Actions
    setClipboard: (notes: NoteItem[]) => void;
    pasteClipboard: () => void; // Pastes to end of active track

    // Interactive Selection
    selectedNoteId: string | null;
    setSelectedNoteId: (id: string | null) => void;
    deleteSelectedNote: () => void;
    updateSelectedNote: (updates: Partial<NoteItem>) => void;

    lastNoteInputTime: number | null;

    undo: () => void;
    redo: () => void;
}

const DEFAULT_CONFIG: SongConfiguration = {
    tempo: 120,
    keySignature: "C",
    timeSignature: [4, 4],
    metronome: false,
    loop: false,
    zoom: 100,
};

export const useSongStore = create<SongStore>((set) => {

    const initialTrack: Track = {
        id: crypto.randomUUID(),
        name: "Piano",
        instrument: "piano",
        volume: 80,
        clef: "treble",
        notes: []
    };

    return {
        config: DEFAULT_CONFIG,
        tracks: [initialTrack],
        activeTrackId: initialTrack.id,
        clipboard: null,
        notationMode: "standard",
        selectedNoteId: null,
        past: [],
        future: [],
        editorState: {
            duration: "q",
            isDotted: false,
            tieToNext: false,
            pianoInputEnabled: false,
            activeTargetClef: "auto",
        },
        lastNoteInputTime: null,

        setSelectedNoteId: (id) => set({ selectedNoteId: id }),

        deleteSelectedNote: () => set((state) => {
            console.log("[STORE] deleteSelectedNote called", state.selectedNoteId);
            if (!state.selectedNoteId) return state;
            const newTracks = state.tracks.map(track => ({
                ...track,
                notes: track.notes.filter(n => n.id !== state.selectedNoteId)
            }));
            console.log("[STORE] Tracks mapped. Old notes length:", state.tracks[0]?.notes.length, "New notes length:", newTracks[0]?.notes.length);
            return {
                tracks: newTracks,
                selectedNoteId: null,
                past: [...state.past, state.tracks],
                future: []
            };
        }),

        updateSelectedNote: (updates) => set((state) => {
            console.log("[STORE] updateSelectedNote called", state.selectedNoteId, updates);
            if (!state.selectedNoteId) return state;
            const newTracks = state.tracks.map(track => ({
                ...track,
                notes: track.notes.map(n => n.id === state.selectedNoteId ? { ...n, ...updates } : n)
            }));
            return {
                tracks: newTracks,
                past: [...state.past, state.tracks],
                future: []
            };
        }),

        updateEditorState: (updates) =>
            set((state) => ({
                editorState: { ...state.editorState, ...updates },
            })),

        toggleNotationMode: () =>
            set((state) => ({
                notationMode: state.notationMode === "standard" ? "numbered" : "standard",
            })),

        setNotationMode: (mode) => set({ notationMode: mode }),

        updateConfig: (newConfig) =>
            set((state) => ({
                config: { ...state.config, ...newConfig },
            })),

        addTrack: (trackData) =>
            set((state) => {
                const newTrack: Track = {
                    ...trackData,
                    id: crypto.randomUUID(),
                    notes: [],
                    transpose: 0
                };
                return {
                    tracks: [...state.tracks, newTrack],
                    activeTrackId: newTrack.id,
                    past: [...state.past, state.tracks],
                    future: []
                };
            }),

        removeTrack: (id) =>
            set((state) => {
                if (state.tracks.length <= 1) return state; // Must have at least one track

                const newTracks = state.tracks.filter((track) => track.id !== id);
                return {
                    tracks: newTracks,
                    activeTrackId: state.activeTrackId === id ? newTracks[0].id : state.activeTrackId,
                    past: [...state.past, state.tracks],
                    future: []
                };
            }),

        setActiveTrack: (id) => set({ activeTrackId: id }),

        updateTrack: (id, updates) => set((state) => {
            const newTracks = state.tracks.map(track => {
                if (track.id === id) {
                    return { ...track, ...updates };
                }
                return track;
            });
            return { tracks: newTracks };
        }),

        transposeTrack: (id: string, semitones: number) => set((state) => {
            if (semitones === 0) return state;

            // Simplified mapping for basic transposition avoiding double sharps/flats
            const pitchToMidi = (pitch: string, octave: number, accidental: Accidental) => {
                const baseOffsets: Record<string, number> = { "C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11 };
                let midi = (octave + 1) * 12 + baseOffsets[pitch];
                if (accidental === "sharp") midi += 1;
                if (accidental === "flat") midi -= 1;
                return midi;
            };

            const midiToPitchInfo = (midi: number) => {
                const octave = Math.floor(midi / 12) - 1;
                const noteClass = midi % 12;
                // Favoring sharps for simplicity in this basic transposer
                const classToNote: Record<number, { pitch: string, accidental: Accidental }> = {
                    0: { pitch: "C", accidental: "none" },
                    1: { pitch: "C", accidental: "sharp" },
                    2: { pitch: "D", accidental: "none" },
                    3: { pitch: "D", accidental: "sharp" },
                    4: { pitch: "E", accidental: "none" },
                    5: { pitch: "F", accidental: "none" },
                    6: { pitch: "F", accidental: "sharp" },
                    7: { pitch: "G", accidental: "none" },
                    8: { pitch: "G", accidental: "sharp" },
                    9: { pitch: "A", accidental: "none" },
                    10: { pitch: "A", accidental: "sharp" },
                    11: { pitch: "B", accidental: "none" }
                };
                return { ...classToNote[noteClass], octave };
            };

            const newTracks = state.tracks.map(track => {
                if (track.id !== id) return track;

                const transposedNotes = track.notes.map(note => {
                    if (note.isRest) return note;

                    const transposedPitches = note.pitches.map(p => {
                        const originalMidi = pitchToMidi(p.pitch, p.octave, p.accidental);
                        const newMidi = originalMidi + semitones;

                        // Prevent octave overflowing into negative space completely or going too high
                        const safeMidi = Math.max(12, Math.min(newMidi, 127));

                        const newInfo = midiToPitchInfo(safeMidi);

                        return {
                            ...p,
                            pitch: newInfo.pitch,
                            octave: newInfo.octave,
                            accidental: newInfo.accidental
                        };
                    });

                    return { ...note, pitches: transposedPitches };
                });

                const currentTranspose = track.transpose || 0;
                return { ...track, notes: transposedNotes, transpose: currentTranspose + semitones };
            });

            return {
                tracks: newTracks,
                past: [...state.past, state.tracks],
                future: []
            };
        }),

        setTracks: (tracks) => set((state) => ({
            tracks: tracks,
            activeTrackId: tracks.length > 0 ? tracks[0].id : state.activeTrackId,
            past: [...state.past, state.tracks],
            future: []
        })),

        addNote: (noteData) =>
            set((state) => {
                const now = Date.now();

                // If a note is currently selected, REPLACE it instead of adding a new one
                if (state.selectedNoteId) {
                    const isChordReplace = state.lastNoteInputTime && (now - state.lastNoteInputTime < 100) && !noteData.isRest;

                    const newTracks = state.tracks.map(track => {
                        // Check if the selected note is in this track
                        if (track.notes.some(n => n.id === state.selectedNoteId)) {
                            return {
                                ...track,
                                notes: track.notes.map(n => {
                                    if (n.id === state.selectedNoteId) {
                                        if (isChordReplace && !n.isRest && n.duration === noteData.duration) {
                                            // Append pitch for chord building on the selected note
                                            const newPitch = noteData.pitches[0];
                                            const isDuplicate = n.pitches.some(p => p.pitch === newPitch.pitch && p.octave === newPitch.octave && p.accidental === newPitch.accidental);
                                            if (!isDuplicate) {
                                                return { ...n, pitches: [...n.pitches, newPitch] };
                                            }
                                            return n;
                                        } else {
                                            // Replace note entirely with the new properties but keep the same ID so it stays selected
                                            return {
                                                ...n,
                                                pitches: noteData.isRest ? [] : noteData.pitches,
                                                isRest: noteData.isRest
                                                // Retain rhythm: duration, isDotted, tieToNext from n
                                            };
                                        }
                                    }
                                    return n;
                                })
                            };
                        }
                        return track;
                    });

                    return {
                        tracks: newTracks,
                        lastNoteInputTime: now,
                        past: [...state.past, state.tracks],
                        future: []
                    };
                }

                // Normal Addition Logic
                const isChord = state.lastNoteInputTime && (now - state.lastNoteInputTime < 100) && !noteData.isRest;
                let newTracks = state.tracks;

                if (isChord) {
                    newTracks = state.tracks.map(track => {
                        if (track.id === state.activeTrackId && track.notes.length > 0) {
                            const notesMap = [...track.notes];
                            const lastNote = notesMap[notesMap.length - 1];

                            // Only group if duration matches and neither are rests
                            if (!lastNote.isRest && lastNote.duration === noteData.duration) {
                                // Add pitch if not duplicate
                                const newPitch = noteData.pitches[0];
                                const isDuplicate = lastNote.pitches.some(p => p.pitch === newPitch.pitch && p.octave === newPitch.octave && p.accidental === newPitch.accidental);

                                if (!isDuplicate) {
                                    notesMap[notesMap.length - 1] = {
                                        ...lastNote,
                                        pitches: [...lastNote.pitches, newPitch]
                                    };
                                }
                                return { ...track, notes: notesMap };
                            }
                        }
                        return track;
                    });
                } else {
                    const newNote: NoteItem = {
                        ...noteData,
                        id: crypto.randomUUID(),
                    };

                    newTracks = state.tracks.map(track => {
                        if (track.id === state.activeTrackId) {
                            return { ...track, notes: [...track.notes, newNote] };
                        }
                        return track;
                    });
                }

                return {
                    tracks: newTracks,
                    lastNoteInputTime: now,
                    past: [...state.past, state.tracks],
                    future: []
                };
            }),

        removeNote: (noteId) =>
            set((state) => {
                const newTracks = state.tracks.map(track => {
                    if (track.id === state.activeTrackId) {
                        return { ...track, notes: track.notes.filter((note) => note.id !== noteId) };
                    }
                    return track;
                });

                return {
                    tracks: newTracks,
                    past: [...state.past, state.tracks],
                    future: []
                };
            }),

        clearNotes: () => set((state) => {
            const activeTrack = state.tracks.find(t => t.id === state.activeTrackId);
            if (!activeTrack || activeTrack.notes.length === 0) return state;

            const newTracks = state.tracks.map(track => {
                if (track.id === state.activeTrackId) {
                    return { ...track, notes: [] };
                }
                return track;
            });

            return {
                tracks: newTracks,
                past: [...state.past, state.tracks],
                future: []
            };
        }),

        setClipboard: (notes) => set({ clipboard: notes }),

        pasteClipboard: () => set((state) => {
            if (!state.clipboard || state.clipboard.length === 0) return state;

            // Clone clipboard notes with new IDs
            const newNotes = state.clipboard.map(note => ({
                ...note,
                id: crypto.randomUUID(),
                // clone pitches array explicitly
                pitches: note.pitches.map(p => ({ ...p }))
            }));

            const newTracks = state.tracks.map(track => {
                if (track.id === state.activeTrackId) {
                    return { ...track, notes: [...track.notes, ...newNotes] };
                }
                return track;
            });

            return {
                tracks: newTracks,
                past: [...state.past, state.tracks],
                future: []
            };
        }),

        undo: () => set((state) => {
            if (state.past.length === 0) return state;
            const previous = state.past[state.past.length - 1];
            const newPast = state.past.slice(0, state.past.length - 1);
            return {
                tracks: previous,
                past: newPast,
                future: [state.tracks, ...state.future]
            };
        }),

        redo: () => set((state) => {
            if (state.future.length === 0) return state;
            const next = state.future[0];
            const newFuture = state.future.slice(1);
            return {
                tracks: next,
                past: [...state.past, state.tracks],
                future: newFuture
            };
        }),
    };
});
