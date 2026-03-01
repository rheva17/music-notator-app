import { NoteItem, SongConfiguration } from "@/types/music";
import MidiWriter from "midi-writer-js";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { audioEngine } from "@/engine/AudioEngine";
import * as Tone from "tone";

export const exportToMIDI = (notes: NoteItem[], config: SongConfiguration) => {
    if (notes.length === 0) return;

    const track = new MidiWriter.Track();
    track.setTempo(config.tempo);

    // Note: timeSignature in midi-writer-js needs numerator, denominator, midi_clocks_per_tick, notes_per_midi_clock
    track.setTimeSignature(config.timeSignature[0], config.timeSignature[1], 24, 8);

    notes.forEach((note) => {
        // Map internal duration to midi-writer duration
        const durationMap: Record<string, string> = {
            w: "1",
            h: "2",
            q: "4",
            "8": "8",
            "16": "16",
        };

        const midiDur = durationMap[note.duration] || "4";

        if (note.isRest || !note.pitches || note.pitches.length === 0) {
            track.addEvent(new MidiWriter.NoteEvent({ pitch: [], duration: midiDur, wait: midiDur }));
        } else {
            const midiPitches = note.pitches.map(p => {
                let accSuffix = "";
                if (p.accidental === "sharp") accSuffix = "#";
                if (p.accidental === "flat") accSuffix = "b";
                return `${p.pitch}${accSuffix}${p.octave}`;
            });

            track.addEvent(new MidiWriter.NoteEvent({ pitch: midiPitches, duration: midiDur }));
        }
    });

    const write = new MidiWriter.Writer(track);
    const dataUri = write.dataUri();

    // Download trigger
    const link = document.createElement("a");
    link.href = dataUri;
    link.download = `music-notator-${Date.now()}.mid`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportToPDF = async (elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
        const canvas = await html2canvas(element, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');

        // Create landscape PDF for music
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
        pdf.save(`music-sheet-${Date.now()}.pdf`);
    } catch (error) {
        console.error("Failed to generate PDF", error);
    }
};

export const exportToAudio = async (notes: NoteItem[], config: SongConfiguration) => {
    if (notes.length === 0) return;

    // Initialize engine if not already done
    await audioEngine.initialize();

    // Tone Setup for Recording
    const dest = Tone.getDestination();
    const actx = dest.context.rawContext as AudioContext;
    const destNode = actx.createMediaStreamDestination();

    // Create a recorder node to tap into Tone's output
    const recorder = new Tone.Recorder();

    // Connect synth to the recorder
    audioEngine.getSynth().connect(recorder);

    // Play all notes
    audioEngine.playNotes(notes, config.tempo);

    // Start recording
    recorder.start();

    // Calculate approx total time
    const totalDurationSeconds = notes.length * (60 / config.tempo) + 1; // +1s buffer

    setTimeout(async () => {
        const recording = await recorder.stop();
        audioEngine.stop();

        // Force disconnect
        audioEngine.getSynth().disconnect(recorder);

        // Download as webm
        const url = URL.createObjectURL(recording);
        const anchor = document.createElement("a");
        anchor.download = `music-audio-${Date.now()}.webm`;
        anchor.href = url;
        anchor.click();
        URL.revokeObjectURL(url);
    }, totalDurationSeconds * 1000);
};
