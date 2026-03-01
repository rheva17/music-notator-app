<div align="center">
  <img src="https://raw.githubusercontent.com/rheva17/music-notator-app/master/public/logo-placeholder.png" alt="Music Notator App Logo" width="120" />

  # 🎹 Music Notator App

  **A modern, web-based musical notation editor built with Next.js, VexFlow, and Zustand.**

  <p align="center">
    <a href="#-features">Features</a> •
    <a href="#-dual-notation-system">Dual Notation</a> •
    <a href="#-getting-started">Get Started</a> •
    <a href="#-interactive-demo">Demo</a>
  </p>

  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/VexFlow-FFA500?style=for-the-badge&logo=javascript&logoColor=white" alt="VexFlow" />
  <img src="https://img.shields.io/badge/Zustand-4A2B29?style=for-the-badge&logo=react&logoColor=white" alt="Zustand" />
</div>

<br />

> Create, edit, and interact with musical notation directly in your browser. This application bridges the gap between traditional Western notation and Numbered notation (Not Angka), providing a seamless compositional experience.

---

## ✨ Features

- **🎼 Dual Notation System**: View and edit sheet music simultaneously in both Standard Notation (VexFlow) and Numbered Notation format.
- **🎹 Interactive Virtual Piano**: Input notes directly into your sheet music using an onscreen piano or via your PC keyboard mapping mapping (e.g., press `A` for C4).
- **🖱️ Instant Editing & Selection**: Click any note on the sheet to instantly select, modify, or delete it seamlessly without re-rendering delays.
- **🎵 Multi-track Support**: Compose complex scores with multiple instruments, customizable time signatures, and clefs (Treble, Bass).
- **⏱️ Note & Rhythm Control**: Comprehensive editor panel for changing note durations, accidentals (sharps/flats), dotted notes, and ties.
- **🌙 Beautiful UI/UX**: Sleek design with Dark/Light mode support, built carefully with Tailwind CSS for maximum responsiveness.

<br />

## 📸 App Interface Overview

*(Add screenshots to `/public/docs/` and link them here to showcase your beautiful app!)*

### 1. Main Composition Studio
> The central hub where creativity happens. Features a split-view design with a comprehensive editor panel on the right and the notation workspace on the left.
> 
> `<img src="https://raw.githubusercontent.com/rheva17/music-notator-app/master/public/docs/main-interface.png" width="100%" alt="Main Interface" />`

### 2. Dual Notation: Standard & Numbered
> Seamlessly switch or view both Western standard notation (using VexFlow) and Asian Numbered Musical Notation (Not Angka).
> 
> `<img src="https://raw.githubusercontent.com/rheva17/music-notator-app/master/public/docs/dual-notation.png" width="100%" alt="Dual Notation Details" />`

### 3. Interactive Virtual Piano
> An elegantly designed on-screen piano that maps perfectly to your computer keyboard for rapid musical transcription.
> 
> `<img src="https://raw.githubusercontent.com/rheva17/music-notator-app/master/public/docs/virtual-piano.png" width="80%" alt="Virtual Piano" />`

<br />

## 🚀 Getting Started

First, clone the repository and install the dependencies on your local machine:

```bash
git clone https://github.com/rheva17/music-notator-app.git
cd music-notator-app
npm install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

<br />

## 💡 How to Use

#### Method 1: Mouse Input
1. **Adding Notes**: Toggle **"Input to Sheet: ON"** in the Virtual Piano area. Use your mouse to click the piano keys to append notes.
2. **Editing Notes**: **Click** any note head on the music sheet. The note will turn blue (selected). While selected, press another piano key to instantly replace its pitch.
3. **Changing Durations**: Use the Editor Panel on the right to select quarter notes, half notes, flags, or dots before inputting/changing notes.

#### Method 2: Keyboard Power User
- **Piano Keys**: `A`=C4, `W`=C#4, `S`=D4, `E`=D#4, `D`=E4, `F`=F4, `T`=F#4, `G`=G4, `Y`=G#4, `H`=A4, `U`=A#4, `J`=B4.
- **Selection**: Click a note to select it.
- **Deletion**: Hit the `Delete` or `Backspace` key on your keyboard to remove a selected note.

<br />

## 🛠️ Technology Stack Deep Dive

- **React / Next.js Framework**: Provides robust routing, SSR options, and absolute control over the component tree.
- **VexFlow SVG Engraving**: We utilize VexFlow for high-quality, professional-level musical rendering entirely on the client, maintaining crisp vectors across all screen sizes.
- **Zustand State Engine**: Stores the complex, nested JSON structure of measures, tracks, and notes securely, avoiding Prop Drilling.
- **Instant CSS DOM Modification**: To prevent heavy SVG re-renders, note highlighting utilizes vanilla DOM extraction logic for instant visual feedback.

<br />

## 📄 License & Attribution

This project is open-source and available under the standard MIT License.

---
<div align="center">
  <b>Built with ❤️ by Rheva.</b><br>
  <i>Empowering digital music education and composition.</i>
</div>
