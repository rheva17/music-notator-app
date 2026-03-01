# 🎹 Music Notator App

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/VexFlow-FFA500?style=for-the-badge&logo=javascript&logoColor=white" alt="VexFlow" />
  <img src="https://img.shields.io/badge/Zustand-4A2B29?style=for-the-badge&logo=react&logoColor=white" alt="Zustand" />
</div>

<br />

**Music Notator App** is a modern, responsive web application for creating, editing, and interacting with musical notation directly in your browser. Built with a focus on ease-of-use and power, it supports both standard Western notation (via VexFlow) and Numbered notation (Not Angka), complete with an interactive virtual piano keyboard for intuitive input.

## ✨ Features

- **🎼 Dual Notation System**: View and edit sheet music simultaneously in both Standard Notation (VexFlow) and Numbered Notation format.
- **🎹 Interactive Virtual Piano**: Input notes directly into your sheet music using an onscreen piano or via your PC keyboard mapping.
- **🖱️ Instant Editing**: Click any note on the sheet to instantly select, modify, or delete it seamlessly without re-rendering delays.
- **🎵 Multi-track Support**: Compose complex scores with multiple instruments, customizable time signatures, and clefs (Treble, Bass).
- **⏱️ Note & Rhythm Control**: Comprehensive editor panel for changing note durations, accidentals (sharps/flats), dotted notes, and ties.
- **🌙 Beautiful UI/UX**: Sleek design with Dark/Light mode support, built carefully with Tailwind CSS for maximum responsiveness.

## 🛠️ Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) (React)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Lucide React](https://lucide.dev/) (Icons)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Standard Music Rendering**: [VexFlow](https://github.com/0xfe/vexflow)
- **Language**: TypeScript

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

## 💡 How to Use

1. **Adding Notes**: Toggle **"Input to Sheet: ON"** in the Virtual Piano area. Use your mouse to click the keys or type on your computer keyboard (A, S, D, F, etc.) to append notes to the currently active track.
2. **Editing Notes**: Simply **click** any note head on the music sheet. The note will turn blue (selected). While selected, press another piano key to instantly replace its pitch while keeping its rhythmic value.
3. **Deleting Notes**: Click a note to select it, then hit the `Delete` or `Backspace` key on your keyboard.
4. **Changing Durations**: Use the Editor Panel on the right to select quarter notes, half notes, flags, or dots before inputting/changing notes.

## 📄 License

This project is open-source and available under the standard MIT License.

---
<div align="center">
  <i>Built with ❤️ by Rheva.</i>
</div>
