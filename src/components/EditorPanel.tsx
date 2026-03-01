"use client";

import { useState, useEffect } from "react";
import { useSongStore } from "@/store/useSongStore";
import { Duration, Accidental, NotePitch, InstrumentType, BarlineType } from "@/types/music";
import { Music, Plus, Mic2, Layers, Volume2, Trash2, AlignJustify } from "lucide-react";

const PITCHES = ["C", "D", "E", "F", "G", "A", "B"];
const DURATIONS: { label: string; value: Duration }[] = [
    { label: "Whole (1)", value: "w" },
    { label: "Half (1/2)", value: "h" },
    { label: "Quarter (1/4)", value: "q" },
    { label: "Eighth (1/8)", value: "8" },
    { label: "Sixteenth (1/16)", value: "16" },
    { label: "Thirty-second (1/32)", value: "32" },
];

const ACCIDENTALS: { label: string; symbol: string; value: Accidental }[] = [
    { label: "None", symbol: "", value: "none" },
    { label: "Sharp", symbol: "♯", value: "sharp" },
    { label: "Flat", symbol: "♭", value: "flat" },
    { label: "Natural", symbol: "♮", value: "natural" },
];

const INSTRUMENTS: { label: string; value: InstrumentType }[] = [
    { label: "Piano", value: "piano" },
    { label: "Guitar", value: "guitar" },
    { label: "Violin", value: "violin" },
    { label: "Drum", value: "drum" },
    { label: "Synth", value: "synth" },
];

export default function EditorPanel() {
    const { addNote, tracks, activeTrackId, setActiveTrack, addTrack, updateTrack, removeTrack, transposeTrack, clipboard, setClipboard, pasteClipboard, editorState, updateEditorState, selectedNoteId, updateSelectedNote, deleteSelectedNote, setSelectedNoteId } = useSongStore();

    const [selectedOctave, setSelectedOctave] = useState<number>(4);
    const [selectedAccidental, setSelectedAccidental] = useState<Accidental>("none");

    const [isChordMode, setIsChordMode] = useState(false);
    const [chordPitches, setChordPitches] = useState<NotePitch[]>([]);
    const [lyric, setLyric] = useState("");
    const [expression, setExpression] = useState("");
    const [velocity, setVelocity] = useState<number>(100);

    const [inputMode, setInputMode] = useState<"alpha" | "num">("alpha");

    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        type: "alert" | "confirm";
        title: string;
        message: string;
        onConfirm?: () => void;
    }>({ isOpen: false, type: "alert", title: "", message: "" });

    const activeTrack = tracks.find(t => t.id === activeTrackId);
    const activeNotes = activeTrack ? activeTrack.notes : [];

    // Global keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input or textarea
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            if ((e.key === "Delete" || e.key === "Backspace") && selectedNoteId) {
                e.preventDefault();
                deleteSelectedNote();
            }
            if (e.key === "Escape" && selectedNoteId) {
                setSelectedNoteId(null);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedNoteId, deleteSelectedNote, setSelectedNoteId]);

    const handleAddSinglePitch = (pitchStr: string) => {
        const staveTarget = (activeTrack?.instrument === "piano" && editorState.activeTargetClef === "treble") ? "treble"
            : (activeTrack?.instrument === "piano" && editorState.activeTargetClef === "bass") ? "bass"
                : undefined;

        addNote({
            pitches: [{ pitch: pitchStr, octave: selectedOctave, accidental: selectedAccidental }],
            duration: editorState.duration,
            isRest: false,
            lyric: lyric ? lyric.trim() : undefined,
            expression: expression ? expression.trim() : undefined,
            velocity,
            isDotted: editorState.isDotted,
            tieToNext: editorState.tieToNext,
            staveTarget
        });
        setLyric(""); // reset lyric after adding
        setExpression("");
        // Auto reset toggles
        updateEditorState({ isDotted: false, tieToNext: false });
    };

    const handlePitchClick = (pitchStr: string) => {
        if (isChordMode) {
            // Add to chord buffer
            setChordPitches(prev => [...prev, { pitch: pitchStr, octave: selectedOctave, accidental: selectedAccidental }]);
        } else {
            // Add immediately
            handleAddSinglePitch(pitchStr);
        }
    };

    const handleInsertChord = () => {
        if (chordPitches.length === 0) return;

        const staveTarget = (activeTrack?.instrument === "piano" && editorState.activeTargetClef === "treble") ? "treble"
            : (activeTrack?.instrument === "piano" && editorState.activeTargetClef === "bass") ? "bass"
                : undefined;

        addNote({
            pitches: [...chordPitches],
            duration: editorState.duration,
            isRest: false,
            lyric: lyric ? lyric.trim() : undefined,
            expression: expression ? expression.trim() : undefined,
            velocity,
            isDotted: editorState.isDotted,
            tieToNext: editorState.tieToNext,
            staveTarget
        });

        // Reset buffer and lyric
        setChordPitches([]);
        setLyric("");
        setExpression("");
        updateEditorState({ isDotted: false, tieToNext: false });
    };

    const handleAddRest = () => {
        addNote({
            pitches: [],
            duration: editorState.duration,
            isRest: true,
            lyric: lyric ? lyric.trim() : undefined,
            expression: expression ? expression.trim() : undefined,
            isDotted: editorState.isDotted
        });
        setLyric("");
        setExpression("");
        updateEditorState({ isDotted: false, tieToNext: false });
    };

    const handleAddBarline = (type: BarlineType) => {
        addNote({
            pitches: [],
            duration: "w", // irrelevant for barlines
            isRest: false,
            isBarline: true,
            barlineType: type
        });
    };

    const handleAddTrackMenu = () => {
        addTrack({
            name: "Synth",
            instrument: "synth",
            volume: 80,
            clef: "treble"
        });
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-4 xl:gap-6 items-stretch">
            {/* CONTEXTUAL MENU FOR SELECTED NOTE */}
            {selectedNoteId && (
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex flex-wrap gap-4 justify-between items-center shadow-sm animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500 text-white p-1.5 rounded-full">
                            <Music size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100">Note Selected</h3>
                            <p className="text-[10px] text-blue-700 dark:text-blue-300">You can edit its properties here.</p>
                        </div>
                    </div>

                    <div className="flex gap-4 items-center">
                        <div>
                            <h4 className="text-[10px] text-blue-800 dark:text-blue-200 uppercase tracking-wider font-semibold mb-1">Change Duration</h4>
                            <div className="flex bg-white/50 dark:bg-slate-800/50 rounded gap-1 p-0.5 border border-blue-200 dark:border-blue-700">
                                {DURATIONS.map((dur) => {
                                    const selectedNote = tracks.flatMap(t => t.notes).find(n => n.id === selectedNoteId);
                                    const isSelected = selectedNote?.duration === dur.value;
                                    return (
                                        <button
                                            key={dur.value}
                                            onClick={() => updateSelectedNote({ duration: dur.value })}
                                            className={`px-3 py-1 text-[10px] rounded transition-colors font-semibold ${isSelected ? "bg-blue-500 text-white shadow" : "text-blue-600 dark:text-blue-300 hover:bg-white dark:hover:bg-slate-700"}`}
                                        >
                                            {dur.label.split(' ')[0]}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={deleteSelectedNote}
                                className="flex items-center gap-1 bg-white hover:bg-rose-50 text-rose-600 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 px-3 py-2 rounded text-xs font-bold transition-colors shadow-sm"
                            >
                                <Trash2 size={14} /> Delete Note
                            </button>
                            <button
                                onClick={() => setSelectedNoteId(null)}
                                className="flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded text-xs font-bold transition-colors shadow-sm"
                            >
                                Deselect
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col xl:flex-row gap-4 xl:gap-6 items-stretch">
                {/* BLOCK 1: Track Settings */}
                <div className="flex flex-col gap-2 min-w-[280px] xl:max-w-sm xl:border-r border-slate-200 dark:border-slate-700 xl:pr-6">
                    <div className="flex justify-between items-center mb-1">
                        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 uppercase tracking-wide">
                            <Layers size={14} className="text-blue-500 dark:text-blue-400" /> Tracks
                        </h2>
                        <div className="flex gap-2">
                            <button
                                onClick={handleAddTrackMenu}
                                className="p-1 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
                                title="Add New Track"
                            >
                                <Plus size={14} />
                            </button>
                            <button
                                onClick={() => {
                                    if (tracks.length > 1) {
                                        setModalConfig({
                                            isOpen: true,
                                            type: "confirm",
                                            title: "Delete Track",
                                            message: `Are you sure you want to delete ${activeTrack?.name}?`,
                                            onConfirm: () => removeTrack(activeTrackId)
                                        });
                                    } else {
                                        setModalConfig({
                                            isOpen: true,
                                            type: "alert",
                                            title: "Cannot Delete Track",
                                            message: "You must have at least one track in the project."
                                        });
                                    }
                                }}
                                disabled={tracks.length <= 1}
                                className="p-1 rounded text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                                title="Remove Track"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-1 overflow-x-auto pb-1 hide-scrollbar">
                        {tracks.map(track => {
                            const isGenericTrackName = /^Track\s*\d*$/i.test(track.name);
                            const displayName = isGenericTrackName ? track.instrument.charAt(0).toUpperCase() + track.instrument.slice(1) : track.name;

                            return (
                                <button
                                    key={track.id}
                                    onClick={() => setActiveTrack(track.id)}
                                    className={`px-2 py-1 whitespace-nowrap rounded text-xs font-semibold transition-colors border ${activeTrackId === track.id
                                        ? "bg-blue-600 border-blue-500 text-white shadow"
                                        : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        }`}
                                >
                                    {displayName}
                                </button>
                            )
                        })}
                    </div>

                    {activeTrack && (
                        <div className="flex flex-col gap-2 mt-auto">
                            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-200 dark:border-none">
                                <button
                                    onClick={() => setClipboard(activeNotes)}
                                    disabled={activeNotes.length === 0}
                                    className="flex-1 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded transition-colors"
                                >
                                    Copy Track
                                </button>
                                <button
                                    onClick={pasteClipboard}
                                    disabled={!clipboard || clipboard.length === 0}
                                    className="flex-1 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded transition-colors"
                                >
                                    Paste
                                </button>
                                {clipboard && clipboard.length > 0 && <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold ml-1">✓</span>}
                            </div>

                            <div className="flex items-center gap-2">
                                <select
                                    value={activeTrack.instrument}
                                    onChange={(e) => {
                                        const newInstrument = e.target.value as InstrumentType;
                                        const newClef = newInstrument === "drum" ? "percussion" : "treble";
                                        const oldDisplayName = activeTrack.instrument.charAt(0).toUpperCase() + activeTrack.instrument.slice(1);
                                        const newDisplayName = newInstrument.charAt(0).toUpperCase() + newInstrument.slice(1);
                                        const nameUpdate = activeTrack.name === oldDisplayName || activeTrack.name.startsWith("Track ") ? newDisplayName : activeTrack.name;
                                        updateTrack(activeTrackId, { instrument: newInstrument, clef: newClef, name: nameUpdate });
                                    }}
                                    className="flex-1 bg-slate-100 dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 px-2 py-1 rounded text-xs font-medium outline-none border-none"
                                >
                                    {INSTRUMENTS.map((inst) => (
                                        <option key={inst.value} value={inst.value}>{inst.label}</option>
                                    ))}
                                </select>

                                <div className="flex bg-slate-100 dark:bg-slate-700/50 rounded gap-px items-center px-1">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 ml-1">Trans</span>
                                    <button onClick={() => transposeTrack(activeTrackId, -1)} className="px-1.5 py-0.5 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">-</button>
                                    <span className="text-xs font-mono font-bold w-4 text-center text-slate-700 dark:text-slate-200">
                                        {activeTrack.transpose ? (activeTrack.transpose > 0 ? `+${activeTrack.transpose}` : activeTrack.transpose) : 0}
                                    </span>
                                    <button onClick={() => transposeTrack(activeTrackId, 1)} className="px-1.5 py-0.5 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">+</button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Volume2 size={14} className="text-slate-400" />
                                <input
                                    type="range"
                                    min="0" max="100"
                                    value={activeTrack.volume ?? 80}
                                    onChange={(e) => updateTrack(activeTrackId, { volume: parseInt(e.target.value) })}
                                    className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* BLOCK 2: Modifiers & Barlines (Moved Notation out) */}
                <div className="flex flex-col gap-3 flex-1 xl:border-r border-slate-200 dark:border-slate-700 xl:pr-6">
                    {/* Octave & Accidental */}
                    <div className="flex flex-wrap lg:flex-nowrap gap-3">
                        <div className="flex-1">
                            <h3 className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider font-semibold">Octave: {selectedOctave}</h3>
                            <div className="flex bg-slate-100 dark:bg-slate-700/50 rounded gap-px items-center px-1 h-[28px]">
                                <select
                                    value={selectedOctave}
                                    onChange={(e) => setSelectedOctave(parseInt(e.target.value))}
                                    className="w-full bg-slate-100/50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded text-xs font-semibold outline-none focus:ring-1 focus:ring-blue-500 border-none"
                                >
                                    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((oct) => (
                                        <option key={oct} value={oct}>Octave {oct}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider font-semibold">Accidental</h3>
                            <div className="flex bg-slate-100 dark:bg-slate-700/50 rounded p-0.5 gap-0.5">
                                {ACCIDENTALS.map((acc) => (
                                    <button
                                        key={acc.value}
                                        onClick={() => setSelectedAccidental(acc.value)}
                                        className={`px-3 py-1 text-sm rounded transition-colors ${selectedAccidental === acc.value ? "bg-indigo-600 text-white shadow" : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"}`}
                                    >
                                        {acc.symbol || "-"}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Modifiers (Dot, Tie) */}
                    <div className="flex gap-1 items-end pt-1">
                        <button
                            onClick={() => updateEditorState({ isDotted: !editorState.isDotted })}
                            className={`flex-1 px-3 py-1.5 text-xs font-bold rounded transition-colors border ${editorState.isDotted ? "bg-amber-500 border-amber-600 text-white shadow-inner" : "bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-200 dark:hover:bg-slate-600"}`}
                        >
                            . Dot
                        </button>
                        <button
                            onClick={() => updateEditorState({ tieToNext: !editorState.tieToNext })}
                            className={`flex-1 px-3 py-1.5 text-xs font-bold rounded transition-colors border ${editorState.tieToNext ? "bg-purple-500 border-purple-600 text-white shadow-inner" : "bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-200 dark:hover:bg-slate-600"}`}
                        >
                            ‿ Slur
                        </button>
                    </div>

                    {/* Barlines & Velocity */}
                    <div className="flex flex-wrap lg:flex-nowrap gap-3 mt-auto">
                        <div className="flex-1">
                            <h3 className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider font-semibold">Barlines</h3>
                            <div className="flex bg-slate-100 dark:bg-slate-700/50 rounded p-0.5 gap-0.5">
                                <button onClick={() => handleAddBarline("single")} className="flex-1 py-1 text-[10px] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors font-bold">|</button>
                                <button onClick={() => handleAddBarline("double")} className="flex-1 py-1 text-[10px] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors font-bold">||</button>
                                <button onClick={() => handleAddBarline("end")} className="flex-1 py-1 text-[10px] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors font-bold">|||</button>
                                <button onClick={() => handleAddBarline("repeat-begin")} className="flex-1 py-1 text-[10px] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors font-bold">|{`:`}</button>
                                <button onClick={() => handleAddBarline("repeat-end")} className="flex-1 py-1 text-[10px] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors font-bold">{`:`}|</button>
                            </div>
                        </div>
                    </div>

                    <div className="min-w-[100px]">
                        <h3 className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider font-semibold">Velocity: {velocity}%</h3>
                        <input
                            type="range"
                            min="0" max="100"
                            value={velocity}
                            onChange={(e) => setVelocity(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>
                </div>

                {/* BLOCK 3: Pitch Input & Chords & Notation */}
                <div className="flex flex-col gap-3 flex-1 xl:border-r border-slate-200 dark:border-slate-700 xl:pr-6">
                    <div className="flex justify-between items-center mb-[-4px]">
                        <div className="flex bg-slate-100 dark:bg-slate-700/50 p-0.5 rounded">
                            <button onClick={() => setInputMode("alpha")} className={`px-2 py-0.5 text-[10px] font-bold rounded ${inputMode === "alpha" ? "bg-slate-500 text-white" : "text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600"}`}>CDE</button>
                            <button onClick={() => setInputMode("num")} className={`px-2 py-0.5 text-[10px] font-bold rounded ${inputMode === "num" ? "bg-slate-500 text-white" : "text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600"}`}>123</button>
                        </div>

                        <button
                            onClick={() => setIsChordMode(!isChordMode)}
                            className={`text-[10px] font-bold px-2 py-1 rounded border transition-colors ${isChordMode ? 'bg-indigo-100 border-indigo-300 text-indigo-700 dark:bg-indigo-900/50 dark:border-indigo-500 dark:text-indigo-300' : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-600 hover:bg-slate-100'}`}
                        >
                            CHORD MODE: {isChordMode ? 'ON' : 'OFF'}
                        </button>
                    </div>

                    <div className="flex gap-1">
                        {PITCHES.map((pitch, index) => {
                            const label = inputMode === "alpha" ? pitch : (index + 1).toString();
                            return (
                                <button
                                    key={pitch}
                                    onClick={() => handlePitchClick(pitch)}
                                    className="flex-1 bg-slate-50 dark:bg-slate-700 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500 text-slate-700 dark:text-slate-200 font-bold py-2 rounded shadow-sm border border-slate-200 dark:border-slate-600 text-sm relative flex flex-col items-center justify-center transition-colors"
                                >
                                    {label}
                                    {selectedAccidental !== "none" && <span className="absolute top-0 right-0.5 text-[8px] text-indigo-500 dark:text-indigo-300 pointer-events-none">{ACCIDENTALS.find(a => a.value === selectedAccidental)?.symbol}</span>}
                                </button>
                            );
                        })}
                    </div>

                    {/* Chord UI or Rests */}
                    {isChordMode ? (
                        <div className="flex items-center gap-2 bg-indigo-50 dark:bg-slate-800 p-1.5 rounded border border-indigo-100 dark:border-indigo-900 shadow-inner h-[34px]">
                            <div className="flex-1 flex gap-1 items-center overflow-x-auto hide-scrollbar">
                                {chordPitches.map((p, i) => (
                                    <span key={i} className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0">
                                        {p.pitch}{ACCIDENTALS.find(a => a.value === p.accidental)?.symbol}{p.octave}
                                    </span>
                                ))}
                                {chordPitches.length === 0 && <span className="text-[10px] text-slate-400 italic px-1">Adding to chord...</span>}
                            </div>
                            {chordPitches.length > 0 && <button onClick={() => setChordPitches([])} className="text-[10px] text-rose-500 hover:underline px-1">Clear</button>}
                            <button onClick={handleInsertChord} disabled={chordPitches.length === 0} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[10px] font-bold px-3 py-1 rounded shadow">Insert</button>
                        </div>
                    ) : (
                        <button
                            onClick={handleAddRest}
                            className="w-full bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400 py-1.5 px-4 rounded text-xs transition-colors border border-dashed border-slate-300 dark:border-slate-500 hover:text-slate-700 dark:hover:text-slate-200 h-[34px] flex items-center justify-center font-bold"
                        >
                            Insert Rest
                        </button>
                    )}

                    {/* Notation (Moved Here) */}
                    <div className="mt-auto">
                        <h3 className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider font-semibold">Notation Duration</h3>
                        <div className="flex bg-slate-100 dark:bg-slate-700/50 rounded p-0.5 gap-0.5">
                            {DURATIONS.map((dur) => (
                                <button
                                    key={dur.value}
                                    onClick={() => updateEditorState({ duration: dur.value })}
                                    className={`flex-1 py-1.5 text-[10px] rounded transition-colors ${editorState.duration === dur.value ? "bg-emerald-600 text-white shadow font-bold" : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"}`}
                                >
                                    {dur.label.split(' ')[0]}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* BLOCK 4: Lyrics & Expressions */}
                <div className="flex flex-col gap-2 min-w-[120px] max-w-[200px]">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                            <Mic2 size={12} /> Lyric Syllable
                        </h3>
                        <input
                            type="text"
                            value={lyric}
                            onChange={(e) => setLyric(e.target.value)}
                            placeholder="e.g. Hal-"
                            className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 px-2 py-1.5 rounded text-xs outline-none focus:border-blue-500 transition-colors shadow-inner h-[28px]"
                        />
                    </div>

                    <div className="flex flex-col gap-1 mt-1">
                        <h3 className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                            <AlignJustify size={12} /> Expression
                        </h3>
                        <input
                            type="text"
                            value={expression}
                            onChange={(e) => setExpression(e.target.value)}
                            placeholder="p, f, cresc."
                            className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 px-2 py-1.5 rounded text-xs outline-none focus:border-blue-500 transition-colors shadow-inner h-[28px]"
                        />
                    </div>
                </div>

                {/* Modal Overlay */}
                {modalConfig.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-sm w-full mx-4 animate-in fade-in zoom-in duration-200">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">{modalConfig.title}</h3>
                            <p className="text-slate-600 dark:text-slate-300 text-sm mb-6">{modalConfig.message}</p>

                            <div className="flex justify-end gap-3">
                                {modalConfig.type === "confirm" && (
                                    <button
                                        onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}
                                        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors border border-slate-300 dark:border-slate-600"
                                    >
                                        Cancel
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (modalConfig.onConfirm) modalConfig.onConfirm();
                                        setModalConfig({ ...modalConfig, isOpen: false });
                                    }}
                                    className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm ${modalConfig.type === "confirm" ? "bg-rose-600 hover:bg-rose-500" : "bg-blue-600 hover:bg-blue-500"}`}
                                >
                                    {modalConfig.type === "confirm" ? "Delete" : "OK"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
