"use client";

import { Play, Square, Download, Settings2, FileMusic, RefreshCw, AudioLines, Undo2, Redo2, BellRing, Repeat, Pause, Upload } from "lucide-react";
import { NotationMode } from "@/types/music";
import { audioEngine } from "@/engine/AudioEngine";
import { useState, useRef } from "react";
import { exportToMIDI, exportToPDF, exportToAudio } from "@/utils/exportUtils";
import { parseMidiFile } from "@/utils/midiUtils";
import { useSongStore } from "@/store/useSongStore";

export default function Toolbar() {
    const { config, notationMode, tracks, activeTrackId, past, future, updateConfig, toggleNotationMode, clearNotes, undo, redo, setTracks } = useSongStore();
    const [playbackState, setPlaybackState] = useState<"stopped" | "playing" | "paused">("stopped");

    // activeNotes retained for single-track exports (until exports support multi-track)
    const activeTrack = tracks.find(t => t.id === activeTrackId);
    const activeNotes = activeTrack ? activeTrack.notes : [];

    const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateConfig({ tempo: parseInt(e.target.value) || 120 });
    };

    const handleTimeSigChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const [num, den] = e.target.value.split("/");
        updateConfig({ timeSignature: [parseInt(num), parseInt(den)] });
    };

    const handleKeySigChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateConfig({ keySignature: e.target.value });
    };

    const handlePlay = async () => {
        if (playbackState === "paused") {
            audioEngine.resume();
            setPlaybackState("playing");
        } else {
            await audioEngine.initialize();
            setPlaybackState("playing");
            audioEngine.playTracks(tracks, config, () => {
                setPlaybackState("stopped");
            });
        }
    };

    const handlePause = () => {
        audioEngine.pause();
        setPlaybackState("paused");
    };

    const handleStop = () => {
        audioEngine.stop();
        setPlaybackState("stopped");
    };

    const handleNotationToggle = () => toggleNotationMode();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);

        try {
            // Give React a frame to paint the loading state before synchronous heavy parsing locks the thread
            await new Promise((resolve) => setTimeout(resolve, 50));

            const buffer = await file.arrayBuffer();
            const { tracks: newTracks, config: parsedConfig } = await parseMidiFile(buffer);

            if (newTracks.length > 0) {
                setTracks(newTracks);
                if (parsedConfig) {
                    updateConfig(parsedConfig);
                }
            } else {
                alert("File MIDI tidak memiliki track notasi yang valid.");
            }
        } catch (error) {
            console.error("Error parsing MIDI:", error);
            alert("Gagal membaca file MIDI. Pastikan file dalam format yang benar.");
        } finally {
            setIsImporting(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-wrap gap-6 items-center justify-between relative">

            {/* Loading Overlay */}
            {isImporting && (
                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-50 rounded-xl flex items-center justify-center gap-3 text-white">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span className="font-semibold text-sm tracking-wide">Menganalisa & Merakit Lembar Musik...</span>
                </div>
            )}

            {/* Hidden File Input */}
            <input
                type="file"
                accept=".mid,.midi"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
            />

            {/* Left Group - Playback */}
            <div className="flex items-center gap-3">
                <button
                    onClick={handlePlay}
                    disabled={playbackState === "playing" || !activeTrack || activeTrack.notes.length === 0}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white p-3 rounded-full transition-colors active:scale-95 shadow-md flex items-center justify-center relative overflow-hidden group"
                    aria-label="Play"
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-full" />
                    <Play size={20} className="relative z-10 ml-1" />
                </button>
                <button
                    onClick={handlePause}
                    disabled={playbackState !== "playing"}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white p-3 rounded-full transition-colors active:scale-95 shadow-md flex items-center justify-center relative overflow-hidden group"
                    aria-label="Pause"
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-full" />
                    <Pause size={20} className="relative z-10" />
                </button>
                <button
                    onClick={handleStop}
                    disabled={playbackState === "stopped"}
                    className="bg-slate-200 dark:bg-slate-700 hover:bg-rose-500 disabled:opacity-50 disabled:hover:bg-slate-200 dark:disabled:hover:bg-slate-700 text-slate-700 hover:text-white dark:text-white p-3 rounded-full transition-colors active:scale-95 shadow-md flex items-center justify-center"
                    aria-label="Stop"
                >
                    <Square size={20} />
                </button>
            </div>

            {/* Middle Group - Settings */}
            <div className="flex flex-wrap items-center gap-4 bg-slate-100 dark:bg-slate-900/50 p-2 px-4 rounded-lg">
                <div className="flex items-center gap-2">
                    <Settings2 size={16} className="text-slate-500 dark:text-slate-400" />
                    <span className="text-slate-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wide">BPM:</span>
                    <input
                        type="number"
                        value={config.tempo}
                        onChange={handleBpmChange}
                        className="w-16 bg-white dark:bg-slate-700 border border-slate-300 dark:border-none text-slate-800 dark:text-slate-100 px-2 py-1 rounded text-center text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        min={40}
                        max={240}
                    />
                </div>

                <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />

                <div className="flex items-center gap-2">
                    <span className="text-slate-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wide">Time:</span>
                    <select
                        value={`${config.timeSignature[0]}/${config.timeSignature[1]}`}
                        onChange={handleTimeSigChange}
                        className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-none text-slate-800 dark:text-slate-100 px-2 py-1 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="2/4">2/4</option>
                        <option value="3/4">3/4</option>
                        <option value="4/4">4/4</option>
                        <option value="6/8">6/8</option>
                    </select>
                </div>

                <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />

                <div className="flex items-center gap-2">
                    <span className="text-slate-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wide">Key:</span>
                    <select
                        value={config.keySignature}
                        onChange={handleKeySigChange}
                        className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-none text-slate-800 dark:text-slate-100 px-2 py-1 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="C">C Major</option>
                        <option value="G">G Major</option>
                        <option value="D">D Major</option>
                        <option value="A">A Major</option>
                        <option value="F">F Major</option>
                        <option value="Bb">Bb Major</option>
                        <option value="Eb">Eb Major</option>
                    </select>
                </div>

                <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleNotationToggle}
                        className="px-3 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-2"
                    >
                        {notationMode === "standard" ? "Standard (Balok)" : "Numbered (Angka)"}
                        <RefreshCw size={14} className="text-slate-500 dark:text-slate-400" />
                    </button>
                </div>

                <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />

                <div className="flex items-center gap-2">
                    <span className="text-slate-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wide">Zoom: {config.zoom}%</span>
                    <input
                        type="range"
                        min="50" max="200" step="10"
                        value={config.zoom}
                        onChange={(e) => updateConfig({ zoom: parseInt(e.target.value) })}
                        className="w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>

                <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => updateConfig({ metronome: !config.metronome })}
                        className={`p-1.5 rounded transition-colors ${config.metronome ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        title="Toggle Metronome"
                    >
                        <BellRing size={16} />
                    </button>
                    <button
                        onClick={() => updateConfig({ loop: !config.loop })}
                        className={`p-1.5 rounded transition-colors ${config.loop ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        title="Toggle Loop"
                    >
                        <Repeat size={16} />
                    </button>
                </div>
            </div>

            {/* Right Group - Exports and Actions */}
            <div className="flex flex-wrap items-center gap-3">


                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg p-1 border border-slate-200 dark:border-none">
                    <button
                        onClick={undo}
                        disabled={past.length === 0}
                        className="p-2 text-slate-500 dark:text-slate-300 hover:text-slate-800 hover:bg-slate-200 dark:hover:text-white dark:hover:bg-slate-600 disabled:opacity-30 disabled:hover:bg-transparent rounded transition-colors"
                        title="Undo"
                    >
                        <Undo2 size={18} />
                    </button>
                    <button
                        onClick={redo}
                        disabled={future.length === 0}
                        className="p-2 text-slate-500 dark:text-slate-300 hover:text-slate-800 hover:bg-slate-200 dark:hover:text-white dark:hover:bg-slate-600 disabled:opacity-30 disabled:hover:bg-transparent rounded transition-colors"
                        title="Redo"
                    >
                        <Redo2 size={18} />
                    </button>
                </div>

                <div className="h-6 w-px bg-slate-300 dark:bg-slate-700" />
                <button onClick={clearNotes} className="text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-slate-700 px-3 py-2 rounded text-sm transition-colors font-medium border border-rose-200 dark:border-none">
                    Clear All
                </button>
                <div className="h-6 w-px bg-slate-300 dark:bg-slate-700" />
                <button
                    onClick={() => exportToPDF('notation-container')}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-transform active:scale-95 shadow-md text-sm font-medium border border-blue-500 dark:border-none"
                >
                    <FileMusic size={16} /> Export PDF
                </button>
                <button
                    onClick={() => exportToMIDI(activeNotes, config)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-transform active:scale-95 shadow-md text-sm font-medium border border-indigo-500 dark:border-none"
                >
                    <Download size={16} /> Export MIDI
                </button>
                <button
                    onClick={() => exportToAudio(activeNotes, config)}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-transform active:scale-95 shadow-md text-sm font-medium border border-purple-500 dark:border-none"
                >
                    <AudioLines size={16} /> Export Audio
                </button>
                <div className="h-6 w-px bg-slate-300 dark:bg-slate-700" />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-transform active:scale-95 shadow-md text-sm font-medium border border-emerald-500 dark:border-none"
                    title="Import file MIDI (.mid)"
                >
                    <Upload size={16} /> Import MIDI
                </button>
            </div>
        </div>
    );
}
