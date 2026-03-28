import { useState, useEffect } from 'react'
import './App.css'

function App() {
    const [selectedText, setSelectedText] = useState<string>('')
    const [apiKey, setApiKey] = useState<string>('')
    const [prompt, setPrompt] = useState<string>('Please break down the following text into its components as JSON:\n\n{{text}}')
    const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false)

    useEffect(() => {
        // Load settings from storage
        chrome.storage.local.get(['apiKey', 'prompt'], (result: { [key: string]: any }) => {
            if (typeof result.apiKey === 'string') setApiKey(result.apiKey);
            if (typeof result.prompt === 'string') setPrompt(result.prompt);
        });

        const fetchSelection = async () => {
            try {
                // chrome.tabs.query is similar to finding a thread in a ThreadPool
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

                if (tab?.id) {
                    // executeScript is like a Remote Procedure Call (RPC) or Method Invocation on another object (the tab's content)
                    const results = await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => window.getSelection()?.toString() || '',
                    });

                    if (results && results[0]?.result) {
                        setSelectedText(results[0].result);
                    }
                }
            } catch (error) {
                console.error("Error fetching selection:", error);
            }
        };

        fetchSelection();
    }, []);

    const handleSave = () => {
        chrome.storage.local.set({ apiKey, prompt }, () => {
            setIsConfigOpen(false);
        });
    };

    return (
        <div style={{padding: '16px', minWidth: '300px'}}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ margin: 0 }}>Yomibro</h1>
                <button
                    onClick={() => setIsConfigOpen(!isConfigOpen)}
                    style={{ fontSize: '1.2rem', cursor: 'pointer', background: 'none', border: 'none' }}
                    title="Settings"
                >
                    ⚙️
                </button>
            </div>

            {isConfigOpen ? (
                <div style={{ marginTop: '16px' }}>
                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px' }}>OpenAI API Key:</label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            style={{ width: '100%', padding: '4px', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px' }}>Prompt Template (use {"{{text}}"} for selection):</label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            style={{ width: '100%', minHeight: '100px', padding: '4px', boxSizing: 'border-box' }}
                        />
                    </div>
                    <button
                        onClick={handleSave}
                        style={{ width: '100%', padding: '8px', cursor: 'pointer' }}
                    >
                        Save Settings
                    </button>
                </div>
            ) : (
                <div style={{ marginTop: '16px' }}>
                    <h3>Selected Text:</h3>
                    <div style={{
                        border: '1px solid #ccc',
                        padding: '8px',
                        borderRadius: '4px',
                        backgroundColor: '#f9f9f9',
                        minHeight: '40px'
                    }}>
                        {selectedText || 'No text selected. Select some text on the page and open the extension.'}
                    </div>
                </div>
            )}
        </div>
    )
}

export default App
