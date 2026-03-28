# Project: Yomibro

## Overview
Yomibro is a Chrome extension for learning languages. You select text on a webpage, click on Yomibro, and it will 
put that text into LLM which breaks it down into its components as JSON, which is then formatted into HTML so that you can use it for Anki.

How it works:
1. The user selects text on a webpage
2. The user clicks on Yomibro
3. Yomibro takes the selected the selected text, puts it into the currently configured prompt, and sends the whole prompt to the LLM
4. The LLM responds with a JSON (defined in the prompt)
5. Yomibro then formats the JSON into HTML and displays it in the extension window

Configurable values:
- Prompt: The prompt to send to the LLM
- OpenAI API Key: The API key to use for the LLM

## Tech Stack
- **Frontend Framework**: React 19+
- **Build Tool**: Vite 8+
- **Language**: TypeScript
- **Extension Platform**: Chrome Extension Manifest V3
- **Styling**: Standard CSS (App.css)

## Key Features
- **Text Selection**: Uses the `chrome.tabs` and `chrome.scripting` APIs to execute a script in the context of the active tab and retrieve `window.getSelection()`.

## Project Structure
- `src/App.tsx`: Main React component containing the extension's UI and text-fetching logic.
- `public/manifest.json`: Configuration for the Chrome extension (permissions: `activeTab`, `scripting`).
- `vite.config.ts`: Configuration for building the project with Vite.

## Development Guidelines
- Always follow the existing TypeScript patterns for Chrome API calls.
- Ensure that any new permissions required by features are added to `public/manifest.json`.
- Maintain the minimalist, clean UI established in `App.tsx`.
