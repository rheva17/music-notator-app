import { Midi } from "@tonejs/midi";
import { NoteItem, NotePitch, Duration, Accidental, Track, SongConfiguration } from "@/types/music";

/**
 * Converts a MIDI file buffer into a set of application Tracks.
 */
export async function parseMidiFile(fileBuffer: ArrayBuffer): Promise<{ tracks: Track[], config: Partial<SongConfiguration> }> {
    const midi = new Midi(fileBuffer);
    const tracks: Track[] = [];

    const tempo = midi.header.tempos.length > 0 ? Math.round(midi.header.tempos[0].bpm) : 120;
    const timeSigs = midi.header.timeSignatures;
    const timeSig = timeSigs.length > 0 ? timeSigs[0].timeSignature : [4, 4];
    const keySigs = midi.header.keySignatures;
    const keySig = keySigs.length > 0 ? keySigs[0].key : "C";

    const beatsPerMeasure = timeSig[0] * (4 / timeSig[1]);

    const secondsPerBeat = 60 / tempo;
    const QUANTIZE_RES = 0.25; // 16th notes resolution

    // Standard duration mapper
    function getStandardDuration(beats: number): { dur: Duration, isDotted: boolean, actualBeats: number } {
        if (beats >= 4) return { dur: "w", isDotted: false, actualBeats: 4 };
        if (beats >= 3) return { dur: "h", isDotted: true, actualBeats: 3 };
        if (beats >= 2) return { dur: "h", isDotted: false, actualBeats: 2 };
        if (beats >= 1.5) return { dur: "q", isDotted: true, actualBeats: 1.5 };
        if (beats >= 1) return { dur: "q", isDotted: false, actualBeats: 1 };
        if (beats >= 0.75) return { dur: "8", isDotted: true, actualBeats: 0.75 };
        if (beats >= 0.5) return { dur: "8", isDotted: false, actualBeats: 0.5 };
        if (beats >= 0.25) return { dur: "16", isDotted: false, actualBeats: 0.25 };
        return { dur: "32", isDotted: false, actualBeats: 0.125 };
    }

    midi.tracks.forEach((midiTrack, tIndex) => {
        if (midiTrack.notes.length === 0) return;

        const trackNotes: NoteItem[] = [];
        let currentBeat = 0;

        function appendDuration(targetBeats: number, pitches: NotePitch[], isRest: boolean) {
            let remaining = Math.round(targetBeats / 0.125) * 0.125;
            while (remaining >= 0.125) {
                // Protect against tiny float inaccuracies crossing measure lines
                let measurePos = Number((currentBeat % beatsPerMeasure).toFixed(4));
                let spaceInMeasure = beatsPerMeasure - measurePos;
                if (spaceInMeasure <= 0.001) spaceInMeasure = beatsPerMeasure;

                let chunkBeats = Math.min(remaining, spaceInMeasure);

                const stdDur = getStandardDuration(chunkBeats);

                trackNotes.push({
                    id: crypto.randomUUID(),
                    pitches: isRest ? [] : [...pitches],
                    duration: stdDur.dur,
                    isRest: isRest,
                    isDotted: stdDur.isDotted,
                    // Tie note if it is physically continuing into the next chunk
                    tieToNext: !isRest && remaining > stdDur.actualBeats + 0.05
                });

                remaining -= stdDur.actualBeats;
                remaining = Math.round(remaining / 0.125) * 0.125;
                currentBeat += stdDur.actualBeats;
                currentBeat = Math.round(currentBeat / 0.125) * 0.125;
            }
        }

        const quantizedNotes = midiTrack.notes.map(n => {
            const startBeat = Math.round((n.time / secondsPerBeat) / QUANTIZE_RES) * QUANTIZE_RES;
            let durBeats = Math.round((n.duration / secondsPerBeat) / QUANTIZE_RES) * QUANTIZE_RES;
            if (durBeats < QUANTIZE_RES) durBeats = QUANTIZE_RES;
            return {
                startBeat,
                endBeat: startBeat + durBeats,
                pitchInfo: parseMidiPitch(n.name)
            };
        });

        // 1. Find all unique note rhythm grid points (start and end)
        const allEvents = Array.from(new Set([
            ...quantizedNotes.map(n => n.startBeat),
            ...quantizedNotes.map(n => n.endBeat)
        ])).sort((a, b) => a - b);

        for (let i = 0; i < allEvents.length - 1; i++) {
            const eventTime = allEvents[i];
            const nextEventTime = allEvents[i + 1];
            const duration = nextEventTime - eventTime;

            if (duration < 0.125) continue; // Skip vanishingly small grid slices

            // 2. Fill whitespace gap with rests
            if (eventTime > currentBeat + 0.05) {
                appendDuration(eventTime - currentBeat, [], true);
            }

            // Snap track time exactly to avoid float drift
            currentBeat = eventTime;

            // 3. Find cluster of pitches striking or holding at this exact grid slice
            const activeNotes = quantizedNotes.filter(n => n.startBeat <= eventTime + 0.01 && n.endBeat >= nextEventTime - 0.01);

            if (activeNotes.length === 0) continue; // Gap handled on next pass

            const uniquePitches = new Map<string, NotePitch>();
            activeNotes.forEach(n => {
                const key = `${n.pitchInfo.pitch}${n.pitchInfo.accidental}${n.pitchInfo.octave}`;
                uniquePitches.set(key, n.pitchInfo);
            });

            // 4. Append chord to track 
            appendDuration(duration, Array.from(uniquePitches.values()), false);
        }

        const newTrack: Track = {
            id: crypto.randomUUID(),
            name: midiTrack.name || `Imported Track ${tIndex + 1}`,
            instrument: "piano",
            volume: 80,
            clef: "treble",
            notes: trackNotes,
            transpose: 0
        };

        // Attempt smart clef detection based on average pitch density
        let bassCount = 0;
        let trebleCount = 0;
        trackNotes.forEach(tn => {
            tn.pitches.forEach(p => {
                if (p.octave < 4) bassCount++;
                else trebleCount++;
            });
        });

        if (bassCount > trebleCount) newTrack.clef = "bass";

        tracks.push(newTrack);
    });

    return {
        tracks,
        config: {
            tempo,
            timeSignature: [timeSig[0], timeSig[1]],
            keySignature: keySig
        }
    };
}

function parseMidiPitch(midiName: string): NotePitch {
    // Examples: "C4", "C#4", "Bb3"
    // Tonejs/midi outputs sharps mostly, but we can handle both just in case
    const match = midiName.match(/([a-gA-G])([#b]?)(-?\d+)/);

    if (!match) return { pitch: "C", octave: 4, accidental: "none" };

    const basePitch = match[1].toUpperCase();
    const accSymbol = match[2];
    const octave = parseInt(match[3], 10);

    let accidental: Accidental = "none";
    if (accSymbol === "#") accidental = "sharp";
    if (accSymbol === "b") accidental = "flat";

    return {
        pitch: basePitch,
        octave: octave,
        accidental
    };
}
