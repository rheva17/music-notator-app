import * as Tone from "tone";
import { NoteItem, Track, SongConfiguration, InstrumentType } from "@/types/music";

class AudioEngine {
    private synths: Map<string, Tone.PolySynth> = new Map();
    private channels: Map<string, Tone.Channel> = new Map();
    // Preview synths for Virtual Piano (preventing conflicts with transport)
    private previewSynths: Map<InstrumentType, Tone.PolySynth> = new Map();

    private metronomeSynth: Tone.MembraneSynth | null = null;
    private metronomeLoop: Tone.Loop | null = null;
    private isInitialized = false;
    private onEndedCallback: (() => void) | null = null;

    // Global FX
    private masterReverb: Tone.Freeverb | null = null;

    constructor() { }

    // Only needed for simple exports where we don't care about multi-track yet
    // but ideally exportUtils should be updated to use the new architecture
    getSynth(): Tone.PolySynth {
        if (this.synths.size === 0) throw new Error("AudioEngine not initialized or no tracks available");
        return Array.from(this.synths.values())[0];
    }

    async initialize() {
        if (!this.isInitialized) {
            await Tone.start();
            this.metronomeSynth = new Tone.MembraneSynth().toDestination();

            // Initialize preview synths
            const instruments: InstrumentType[] = ["piano", "guitar", "violin", "drum", "synth"];
            instruments.forEach(inst => {
                const synth = this.createSynthForInstrument(inst).toDestination();
                this.previewSynths.set(inst, synth);
            });

            this.isInitialized = true;
        }
    }

    private createSynthForInstrument(instrument: InstrumentType): Tone.PolySynth {
        switch (instrument) {
            case "piano":
                // Smoother piano sound with longer release and softer attack
                return new Tone.PolySynth(Tone.Synth, {
                    oscillator: { type: "triangle" },
                    envelope: { attack: 0.02, decay: 0.3, sustain: 0.2, release: 2.0 }
                });
            case "guitar":
                // Acoustic-like guitar: plucked attack, long release
                return new Tone.PolySynth(Tone.Synth, {
                    oscillator: { type: "pwm", modulationFrequency: 0.2 },
                    envelope: { attack: 0.015, decay: 0.5, sustain: 0.1, release: 2.5 }
                });
            case "violin":
                // Smoother bowing attack for violin
                return new Tone.PolySynth(Tone.AMSynth, {
                    harmonicity: 3.02,
                    oscillator: { type: "sawtooth" },
                    envelope: { attack: 0.2, decay: 0.1, sustain: 1, release: 1.5 },
                    modulation: { type: "triangle" },
                    modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 }
                });
            case "drum":
                // Better percussive drum sound using MembraneSynth
                return new Tone.PolySynth(Tone.MembraneSynth, {
                    pitchDecay: 0.05,
                    octaves: 10,
                    oscillator: { type: "sine" },
                    envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4, attackCurve: "exponential" }
                });
            case "synth":
            default:
                // Soft pad-like synth
                return new Tone.PolySynth(Tone.Synth, {
                    oscillator: { type: "sine" },
                    envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 1.5 }
                });
        }
    }

    private setupSynths(tracks: Track[]) {
        // Clear old synths
        this.synths.forEach(synth => {
            synth.releaseAll();
            synth.dispose();
        });
        this.channels.forEach(channel => channel.dispose());
        this.synths.clear();
        this.channels.clear();

        // Create new synths and channels per track
        tracks.forEach(track => {
            const synth = this.createSynthForInstrument(track.instrument);

            // Map 0-100 to decibels roughly (-60 to 0)
            const decibels = track.volume === 0 ? -Infinity : 20 * Math.log10(track.volume / 100);
            const channel = new Tone.Channel(decibels);

            // Route through global reverb if available, otherwise direct destination
            if (this.masterReverb) {
                channel.connect(this.masterReverb);
            } else {
                channel.toDestination();
            }

            synth.connect(channel);

            this.synths.set(track.id, synth);
            this.channels.set(track.id, channel);
        });
    }

    private setupMetronome(config: SongConfiguration) {
        if (this.metronomeLoop) {
            this.metronomeLoop.dispose();
            this.metronomeLoop = null;
        }

        if (config.metronome && this.metronomeSynth) {
            const beatsPerBar = config.timeSignature[0];
            let beatCount = 0;

            this.metronomeLoop = new Tone.Loop((time) => {
                if (beatCount % beatsPerBar === 0) {
                    // Downbeat (Higher pitch, louder)
                    this.metronomeSynth?.triggerAttackRelease("C5", "8n", time, 1);
                } else {
                    // Upbeat (Lower pitch, softer)
                    this.metronomeSynth?.triggerAttackRelease("C4", "8n", time, 0.5);
                }
                beatCount++;
            }, "4n"); // Tick every quarter note

            this.metronomeLoop.start(0);
        }
    }

    setTempo(bpm: number) {
        Tone.getTransport().bpm.value = bpm;
    }

    playTracks(tracks: Track[], config: SongConfiguration, onEnded?: () => void) {
        // Clear any previous events
        Tone.getTransport().cancel();
        Tone.getTransport().stop();
        this.synths.forEach(synth => synth.releaseAll()); // Kill ringing notes

        this.onEndedCallback = onEnded || null;

        this.setTempo(config.tempo);
        this.setupSynths(tracks);
        this.setupMetronome(config);

        let maxDurationSeconds = 0;

        tracks.forEach(track => {
            let currentTimeSeconds = 0;
            const synth = this.synths.get(track.id);

            track.notes.forEach((note) => {
                const toneDuration = this.getToneDuration(note.duration);
                const durationSeconds = Tone.Time(toneDuration).toSeconds();

                if (!note.isRest && synth && note.pitches) {
                    const tonePitches = note.pitches.map(p => {
                        let accSuffix = "";
                        if (p.accidental === "sharp") accSuffix = "#";
                        if (p.accidental === "flat") accSuffix = "b";
                        return `${p.pitch}${accSuffix}${p.octave}`;
                    });

                    if (tonePitches.length > 0) {
                        // Crucial: Schedule along the Tone Transport so Pause, Loop, and Cancel work!
                        Tone.Transport.schedule((time) => {
                            // Convert velocity 0-100 to 0-1
                            const velocityVal = note.velocity !== undefined ? note.velocity / 100 : 1;
                            synth.triggerAttackRelease(tonePitches, toneDuration, time, velocityVal);
                        }, currentTimeSeconds);
                    }
                }

                currentTimeSeconds += durationSeconds;
            });

            if (currentTimeSeconds > maxDurationSeconds) {
                maxDurationSeconds = currentTimeSeconds;
            }
        });

        // Setup Looping or End Callback
        if (config.loop && maxDurationSeconds > 0) {
            Tone.getTransport().loop = true;
            Tone.getTransport().loopStart = 0;
            Tone.getTransport().loopEnd = maxDurationSeconds;
        } else {
            Tone.getTransport().loop = false;
            if (maxDurationSeconds > 0) {
                Tone.Transport.schedule((time) => {
                    Tone.Draw.schedule(() => {
                        this.stop();
                        if (this.onEndedCallback) {
                            this.onEndedCallback();
                            this.onEndedCallback = null;
                        }
                    }, time);
                }, maxDurationSeconds);
            } else {
                // Empty track
                if (this.onEndedCallback) {
                    setTimeout(this.onEndedCallback, 100);
                }
            }
        }

        Tone.getTransport().start();
    }

    // Retained for backward compat with simpler parts of the app (like toolbar button state)
    // but ideally we just use maxDurationSeconds in the UI as well.
    playNotes(notes: NoteItem[], tempo: number) {
        // We will mock this by wrapping in a dummy track
        // Only used by export functions currently.
        const mockTrack: Track = {
            id: "export-mock",
            name: "Mock Track",
            instrument: "piano",
            volume: 80,
            clef: "treble",
            notes: notes
        };
        this.playTracks([mockTrack], {
            tempo,
            keySignature: "C",
            timeSignature: [4, 4],
            metronome: false,
            loop: false,
            zoom: 100
        });
    }

    pause() {
        Tone.getTransport().pause();
        this.synths.forEach(synth => synth.releaseAll());
    }

    resume() {
        Tone.getTransport().start();
    }

    stop() {
        Tone.getTransport().stop();
        Tone.getTransport().cancel();
        if (this.metronomeLoop) {
            this.metronomeLoop.stop();
        }
        this.synths.forEach(synth => synth.releaseAll());
        this.previewSynths.forEach(synth => synth.releaseAll());
    }

    // --- Virtual Piano Feature ---
    playPreviewNote(instrument: InstrumentType, pitch: string, duration: string = "8n") {
        if (!this.isInitialized) return;
        const synth = this.previewSynths.get(instrument);
        if (synth) {
            synth.triggerAttackRelease(pitch, duration);
        }
    }
    // -----------------------------

    private getToneDuration(vexDuration: string): string {
        const map: Record<string, string> = {
            w: "1n",
            h: "2n",
            q: "4n",
            "8": "8n",
            "16": "16n",
            "32": "32n",
        };
        return map[vexDuration] || "4n";
    }
}

export const audioEngine = new AudioEngine();
