export type Duration = "w" | "h" | "q" | "8" | "16" | "32"; // whole, half, quarter, eighth, sixteenth, thirty-second
export type Accidental = "none" | "sharp" | "flat" | "natural";

export interface NotePitch {
    pitch: string; // e.g., "C", "D"
    octave: number; // 1-7
    accidental: Accidental;
}

export type BarlineType = "single" | "double" | "end" | "repeat-begin" | "repeat-end" | "repeat-both";

export interface NoteItem {
    id: string;
    pitches: NotePitch[]; // Array of pitches. Length > 1 means chord. Empty means rest.
    duration: Duration;
    isRest: boolean;
    lyric?: string; // Optional lyric attached to this note
    isDotted?: boolean; // If true, adds a rhythm dot (augments duration by 1/2)
    tieToNext?: boolean; // If true, adds a slur/tie to the subsequent note
    isBarline?: boolean; // True if this note acts as a barline separator
    barlineType?: BarlineType;
    velocity?: number; // 0-100 for dynamic volume
    expression?: string; // e.g., "p", "f", "cresc."
    staveTarget?: "treble" | "bass"; // Explicit stave target for grand staff
}

export type ClefType = "treble" | "bass" | "percussion";
export type InstrumentType = "piano" | "guitar" | "violin" | "drum" | "synth";

export interface Track {
    id: string;
    name: string;
    instrument: InstrumentType; // Tone.js instrument identifier or generic name
    volume: number; // 0-100
    clef: ClefType;
    notes: NoteItem[];
    transpose?: number; // Visual tracking of transpose relative to original pitch (default 0)
}

export type TimeSignature = [number, number]; // e.g., [4, 4] for 4/4 time

export interface SongConfiguration {
    tempo: number; // BPM
    keySignature: string; // e.g., "C", "G"
    timeSignature: TimeSignature;
    metronome: boolean;
    loop: boolean;
    zoom: number; // Zoom level in percentage, e.g., 100, 150
}

export type NotationMode = "standard" | "numbered";
