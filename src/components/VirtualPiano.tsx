"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSongStore } from "@/store/useSongStore";
import { audioEngine } from "@/engine/AudioEngine";
import { Piano } from "lucide-react";

// Standard piano layout (expanded to full A0 - C8)
const PIANO_KEYS = [
    // Octave 0
    { note: "A", type: "white", keyMap: "noneA0", octaveOffset: 0 },
    { note: "A#", type: "black", keyMap: "noneBb0", octaveOffset: 0 },
    { note: "B", type: "white", keyMap: "noneB0", octaveOffset: 0 },

    // Octave 1
    { note: "C", type: "white", keyMap: "noneC1", octaveOffset: 1 },
    { note: "C#", type: "black", keyMap: "noneCs1", octaveOffset: 1 },
    { note: "D", type: "white", keyMap: "noneD1", octaveOffset: 1 },
    { note: "D#", type: "black", keyMap: "noneDs1", octaveOffset: 1 },
    { note: "E", type: "white", keyMap: "noneE1", octaveOffset: 1 },
    { note: "F", type: "white", keyMap: "noneF1", octaveOffset: 1 },
    { note: "F#", type: "black", keyMap: "noneFs1", octaveOffset: 1 },
    { note: "G", type: "white", keyMap: "noneG1", octaveOffset: 1 },
    { note: "G#", type: "black", keyMap: "noneGs1", octaveOffset: 1 },
    { note: "A", type: "white", keyMap: "noneA1", octaveOffset: 1 },
    { note: "A#", type: "black", keyMap: "noneBb1", octaveOffset: 1 },
    { note: "B", type: "white", keyMap: "noneB1", octaveOffset: 1 },

    // Octave 2
    { note: "C", type: "white", keyMap: "noneC2", octaveOffset: 2 },
    { note: "C#", type: "black", keyMap: "noneCs2", octaveOffset: 2 },
    { note: "D", type: "white", keyMap: "noneD2", octaveOffset: 2 },
    { note: "D#", type: "black", keyMap: "noneDs2", octaveOffset: 2 },
    { note: "E", type: "white", keyMap: "noneE2", octaveOffset: 2 },
    { note: "F", type: "white", keyMap: "noneF2", octaveOffset: 2 },
    { note: "F#", type: "black", keyMap: "noneFs2", octaveOffset: 2 },
    { note: "G", type: "white", keyMap: "noneG2", octaveOffset: 2 },
    { note: "G#", type: "black", keyMap: "noneGs2", octaveOffset: 2 },
    { note: "A", type: "white", keyMap: "noneA2", octaveOffset: 2 },
    { note: "A#", type: "black", keyMap: "noneBb2", octaveOffset: 2 },
    { note: "B", type: "white", keyMap: "noneB2", octaveOffset: 2 },

    // Octave 3 (Left - Keyboard mapped)
    { note: "C", type: "white", keyMap: "z", octaveOffset: 3 },
    { note: "C#", type: "black", keyMap: "x", octaveOffset: 3 },
    { note: "D", type: "white", keyMap: "c", octaveOffset: 3 },
    { note: "D#", type: "black", keyMap: "v", octaveOffset: 3 },
    { note: "E", type: "white", keyMap: "b", octaveOffset: 3 },
    { note: "F", type: "white", keyMap: "n", octaveOffset: 3 },
    { note: "F#", type: "black", keyMap: "m", octaveOffset: 3 },
    { note: "G", type: "white", keyMap: ",", octaveOffset: 3 },
    { note: "G#", type: "black", keyMap: ".", octaveOffset: 3 },
    { note: "A", type: "white", keyMap: "/", octaveOffset: 3 },
    { note: "A#", type: "black", keyMap: "noneAs3", octaveOffset: 3 },
    { note: "B", type: "white", keyMap: "noneB3", octaveOffset: 3 },

    // Octave 4 (Center - Main mapping)
    { note: "C", type: "white", keyMap: "a", octaveOffset: 4 },
    { note: "C#", type: "black", keyMap: "w", octaveOffset: 4 },
    { note: "D", type: "white", keyMap: "s", octaveOffset: 4 },
    { note: "D#", type: "black", keyMap: "e", octaveOffset: 4 },
    { note: "E", type: "white", keyMap: "d", octaveOffset: 4 },
    { note: "F", type: "white", keyMap: "f", octaveOffset: 4 },
    { note: "F#", type: "black", keyMap: "t", octaveOffset: 4 },
    { note: "G", type: "white", keyMap: "g", octaveOffset: 4 },
    { note: "G#", type: "black", keyMap: "y", octaveOffset: 4 },
    { note: "A", type: "white", keyMap: "h", octaveOffset: 4 },
    { note: "A#", type: "black", keyMap: "u", octaveOffset: 4 },
    { note: "B", type: "white", keyMap: "j", octaveOffset: 4 },

    // Octave 5 (Center-Right)
    { note: "C", type: "white", keyMap: "k", octaveOffset: 5 },
    { note: "C#", type: "black", keyMap: "o", octaveOffset: 5 },
    { note: "D", type: "white", keyMap: "l", octaveOffset: 5 },
    { note: "D#", type: "black", keyMap: "p", octaveOffset: 5 },
    { note: "E", type: "white", keyMap: ";", octaveOffset: 5 },
    { note: "F", type: "white", keyMap: "'", octaveOffset: 5 },
    { note: "F#", type: "black", keyMap: "[", octaveOffset: 5 },
    { note: "G", type: "white", keyMap: "enter", octaveOffset: 5 },
    { note: "G#", type: "black", keyMap: "]", octaveOffset: 5 },
    { note: "A", type: "white", keyMap: "noneA5", octaveOffset: 5 },
    { note: "A#", type: "black", keyMap: "noneAs5", octaveOffset: 5 },
    { note: "B", type: "white", keyMap: "noneB5", octaveOffset: 5 },

    // Octave 6 (Right - no keyboard mapping, just mouse)
    { note: "C", type: "white", keyMap: "noneC6", octaveOffset: 6 },
    { note: "C#", type: "black", keyMap: "noneCs6", octaveOffset: 6 },
    { note: "D", type: "white", keyMap: "noneD6", octaveOffset: 6 },
    { note: "D#", type: "black", keyMap: "noneDs6", octaveOffset: 6 },
    { note: "E", type: "white", keyMap: "noneE6", octaveOffset: 6 },
    { note: "F", type: "white", keyMap: "noneF6", octaveOffset: 6 },
    { note: "F#", type: "black", keyMap: "noneFs6", octaveOffset: 6 },
    { note: "G", type: "white", keyMap: "noneG6", octaveOffset: 6 },
    { note: "G#", type: "black", keyMap: "noneGs6", octaveOffset: 6 },
    { note: "A", type: "white", keyMap: "noneA6", octaveOffset: 6 },
    { note: "A#", type: "black", keyMap: "noneAs6", octaveOffset: 6 },
    { note: "B", type: "white", keyMap: "noneB6", octaveOffset: 6 },

    // Octave 7 
    { note: "C", type: "white", keyMap: "noneC7", octaveOffset: 7 },
    { note: "C#", type: "black", keyMap: "noneCs7", octaveOffset: 7 },
    { note: "D", type: "white", keyMap: "noneD7", octaveOffset: 7 },
    { note: "D#", type: "black", keyMap: "noneDs7", octaveOffset: 7 },
    { note: "E", type: "white", keyMap: "noneE7", octaveOffset: 7 },
    { note: "F", type: "white", keyMap: "noneF7", octaveOffset: 7 },
    { note: "F#", type: "black", keyMap: "noneFs7", octaveOffset: 7 },
    { note: "G", type: "white", keyMap: "noneG7", octaveOffset: 7 },
    { note: "G#", type: "black", keyMap: "noneGs7", octaveOffset: 7 },
    { note: "A", type: "white", keyMap: "noneA7", octaveOffset: 7 },
    { note: "A#", type: "black", keyMap: "noneAs7", octaveOffset: 7 },
    { note: "B", type: "white", keyMap: "noneB7", octaveOffset: 7 },

    // High C8
    { note: "C", type: "white", keyMap: "noneC8", octaveOffset: 8 },
];

export default function VirtualPiano() {
    const { tracks, activeTrackId, addNote, editorState, updateEditorState } = useSongStore();
    const activeTrack = tracks.find(t => t.id === activeTrackId);
    const instrument = activeTrack?.instrument || "synth";
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to center (Middle C/C4 region) on mount
    useEffect(() => {
        if (scrollRef.current) {
            // Rough estimation to center around Octave 4
            const containerWidth = scrollRef.current.clientWidth;
            const scrollWidth = scrollRef.current.scrollWidth;
            scrollRef.current.scrollTo({
                left: (scrollWidth / 2) - (containerWidth / 2) - 100,
                behavior: 'smooth'
            });
        }
    }, []);

    // Base octave for the piano
    const baseOctave = 0;

    const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());

    const playNote = useCallback((noteInfo: typeof PIANO_KEYS[0]) => {
        const octave = baseOctave + (noteInfo.octaveOffset || 0);

        // Apply track transposition
        const trackTranspose = activeTrack?.transpose || 0;

        // Calculate new pitch/octave based on transpose
        const notesOrder = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

        let baseIndex = notesOrder.indexOf(noteInfo.note);
        let totalSemitones = (octave * 12) + baseIndex + trackTranspose;

        // Prevent going below octave 0 or above 10
        totalSemitones = Math.max(0, Math.min(totalSemitones, 127));

        const transposedOctave = Math.floor(totalSemitones / 12);
        const transposedPitchIndex = ((totalSemitones % 12) + 12) % 12;
        const transposedNoteName = notesOrder[transposedPitchIndex];

        const originalPitchString = `${noteInfo.note}${octave}`; // For UI Visual matching
        const transposedPitchString = `${transposedNoteName}${transposedOctave}`; // For audio/sheet

        // Don't re-trigger if already playing (held down)
        if (activeNotes.has(originalPitchString)) return;

        const playNoteAsync = async () => {
            await audioEngine.initialize();

            // Visual feedback
            setActiveNotes(prev => {
                const next = new Set(prev);
                next.add(originalPitchString);
                return next;
            });

            // Play audio (transposed)
            audioEngine.playPreviewNote(instrument, transposedPitchString, "8n");

            // Input to Sheet if enabled (transposed) or if a note is selected
            if (editorState.pianoInputEnabled || useSongStore.getState().selectedNoteId) {
                const isSharp = transposedNoteName.includes("#");
                const basePitch = transposedNoteName.replace("#", "");

                const staveTarget = (activeTrack?.instrument === "piano" && editorState.activeTargetClef === "treble") ? "treble"
                    : (activeTrack?.instrument === "piano" && editorState.activeTargetClef === "bass") ? "bass"
                        : undefined;

                addNote({
                    pitches: [{
                        pitch: basePitch,
                        octave: transposedOctave,
                        accidental: isSharp ? "sharp" : "none"
                    }],
                    duration: editorState.duration,
                    isRest: false,
                    isDotted: editorState.isDotted,
                    tieToNext: editorState.tieToNext,
                    staveTarget
                });

                // Auto reset toggles after input
                if (editorState.isDotted || editorState.tieToNext) {
                    updateEditorState({ isDotted: false, tieToNext: false });
                }
            }
        };

        playNoteAsync();
    }, [instrument, activeNotes, editorState, addNote, updateEditorState, activeTrack?.transpose]);

    const stopNote = useCallback((noteInfo: typeof PIANO_KEYS[0]) => {
        const octave = baseOctave + (noteInfo.octaveOffset || 0);
        const originalPitchString = `${noteInfo.note}${octave}`;

        setActiveNotes(prev => {
            const next = new Set(prev);
            next.delete(originalPitchString);
            return next;
        });
    }, []);

    // Handle Keyboard Events
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            const key = e.key.toLowerCase();
            const noteInfo = PIANO_KEYS.find(k => k.keyMap === key);
            if (noteInfo) {
                playNote(noteInfo);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            const key = e.key.toLowerCase();
            const noteInfo = PIANO_KEYS.find(k => k.keyMap === key);
            if (noteInfo) {
                stopNote(noteInfo);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [playNote, stopNote]);


    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 w-full overflow-hidden flex flex-col mt-4">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200 dark:border-slate-700 flex-wrap">
                <Piano className="text-indigo-500" size={20} />
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex-1 min-w-[120px]">Virtual Piano</h2>

                <div className="flex gap-2 items-center ml-auto">
                    <button
                        onClick={() => updateEditorState({ pianoInputEnabled: !editorState.pianoInputEnabled })}
                        className={`text-xs px-3 py-1.5 rounded-full font-bold transition-colors shadow-sm ${editorState.pianoInputEnabled ? "bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700" : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-700"}`}
                        title={editorState.pianoInputEnabled ? "Virtual Piano will insert notes into the sheet" : "Virtual Piano only plays sound"}
                    >
                        Input to Sheet: {editorState.pianoInputEnabled ? "ON" : "OFF"}
                    </button>

                    <div className="flex border border-slate-200 dark:border-slate-800 rounded px-2 py-1 bg-slate-100 dark:bg-slate-900/50 items-center justify-center min-w-[32px] font-mono text-xs font-bold text-slate-500 dark:text-slate-400" title="Active Track Transpose (Adjust via Toolbar)">
                        {activeTrack?.transpose ? (activeTrack.transpose > 0 ? `+${activeTrack.transpose}` : activeTrack.transpose) : 0}
                    </div>

                    <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/50 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-800">
                        Playing: <span className="font-semibold text-indigo-500 capitalize">{instrument}</span>
                    </span>
                </div>
            </div>


            <div className="flex justify-center relative select-none touch-none overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 w-full" ref={scrollRef}>
                <div className="flex relative min-w-max px-2 md:px-8">
                    {/* Render White Keys */}
                    {PIANO_KEYS.filter(k => k.type === "white").map((key, i) => {
                        const octave = baseOctave + (key.octaveOffset || 0);
                        const isPressed = activeNotes.has(`${key.note}${octave}`);

                        return (
                            <div
                                key={`white-${i}`}
                                onMouseDown={() => playNote(key)}
                                onMouseUp={() => stopNote(key)}
                                onMouseLeave={() => stopNote(key)}
                                onTouchStart={(e) => { e.preventDefault(); playNote(key); }}
                                onTouchEnd={(e) => { e.preventDefault(); stopNote(key); }}
                                className={`
                                    w-10 sm:w-12 h-32 sm:h-40 border-r border-b border-l border-slate-300 rounded-b flex flex-col justify-end items-center pb-2 cursor-pointer transition-all duration-75 relative z-0
                                    ${isPressed ? 'bg-slate-200 border-b-4 border-b-slate-400 shadow-inner translate-y-1' : 'bg-white hover:bg-slate-50 shadow-sm'}
                                `}
                            >
                                <span className="text-xs font-bold text-slate-400">{key.note}</span>
                                {!key.keyMap.startsWith("none") && (
                                    <span className="text-[9px] text-slate-300 font-mono mt-1 hidden sm:block">{key.keyMap.toUpperCase()}</span>
                                )}
                            </div>
                        );
                    })}

                    {/* Render Black Keys Absolutely */}
                    {PIANO_KEYS.map((key, i) => {
                        if (key.type === "white") return null;

                        // Calculate position based on previous white keys
                        const whiteKeyIndex = PIANO_KEYS.slice(0, i).filter(k => k.type === "white").length;
                        // For responsive widths: 2.5rem on small screens, 3rem on sm+ screens
                        const leftOffsetSm = (whiteKeyIndex * 3) + 1.5; // sm screens
                        const leftOffset = (whiteKeyIndex * 2.5) + 1.25; // default screens

                        const octave = baseOctave + (key.octaveOffset || 0);
                        const isPressed = activeNotes.has(`${key.note}${octave}`);

                        return (
                            <div
                                key={`black-${i}`}
                                style={{
                                    // Using custom property for responsive absolute positioning
                                    left: `calc(env(safe-area-inset-left) + max(2.5rem * ${whiteKeyIndex} + 1.25rem, 0rem))`
                                }}
                                onMouseDown={() => playNote(key)}
                                onMouseUp={() => stopNote(key)}
                                onMouseLeave={() => stopNote(key)}
                                onTouchStart={(e) => { e.preventDefault(); playNote(key); }}
                                onTouchEnd={(e) => { e.preventDefault(); stopNote(key); }}
                                className={`
                                    absolute top-0 w-6 sm:w-8 h-20 sm:h-24 rounded-b flex flex-col justify-end items-center pb-2 cursor-pointer transition-all duration-75 z-10
                                    ${isPressed ? 'bg-slate-700 shadow-inner' : 'bg-slate-900 shadow-lg shadow-black/40 hover:bg-slate-800'}
                                `}
                                // Hacky inline style to override Tailwind for sm breakpoint left positioning
                                // Normally prefer a CSS module but this works for inline dynamic widths
                                ref={(el) => {
                                    if (el) {
                                        if (window.innerWidth >= 640) {
                                            el.style.left = `${leftOffsetSm}rem`;
                                        } else {
                                            el.style.left = `${leftOffset}rem`;
                                        }
                                        el.style.transform = 'translateX(-50%)';
                                    }
                                }}
                            >
                                <span className="text-[10px] font-bold text-slate-400 hidden sm:block">{key.note}</span>
                                {!key.keyMap.startsWith("none") && (
                                    <span className="text-[8px] text-slate-500 font-mono mt-0.5 hidden sm:block">{key.keyMap.toUpperCase()}</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="text-center mt-2 text-xs text-slate-500 dark:text-slate-400">
                Gunakan mouse atau keyboard komputer Anda untuk memainkan tuts piano. (Bisa di-scroll ke kiri/kanan jika layarnya kecil)
            </div>
        </div>
    );
}
