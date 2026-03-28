import { useState, useEffect } from 'react'
import OpenAI from 'openai'
import './App.css'

function App() {
    const [selectedText, setSelectedText] = useState<string>('')
    const [apiKey, setApiKey] = useState<string>('')
    const [prompt, setPrompt] = useState<string>('Please break down the following text into its components as JSON:\n\n{{text}}')
    const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false)
    const [llmResponse, setLlmResponse] = useState<string>('')
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [error, setError] = useState<string>('')
    const [lastProcessedText, setLastProcessedText] = useState<string>('')

    useEffect(() => {
        // Load settings from storage
        chrome.storage.local.get(['apiKey', 'prompt', 'lastProcessedText', 'llmResponse'], (result: { [key: string]: any }) => {
            if (typeof result.apiKey === 'string') setApiKey(result.apiKey);
            if (typeof result.prompt === 'string') setPrompt(result.prompt);
            if (typeof result.lastProcessedText === 'string') setLastProcessedText(result.lastProcessedText);
            if (typeof result.llmResponse === 'string') setLlmResponse(result.llmResponse);
        });

        const fetchSelection = async () => {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

                if (tab?.id) {
                    const results = await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => window.getSelection()?.toString() || '',
                    });

                    if (results && results[0]?.result) {
                        const currentText = results[0].result;
                        setSelectedText(currentText);
                    }
                }
            } catch (error) {
                console.error("Error fetching selection:", error);
            }
        };

        fetchSelection();
    }, []);

    const fetchFromLLM = async (text: string) => {
        if (!apiKey) {
            setError('Please set your OpenAI API Key in settings.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const openai = new OpenAI({
                apiKey: apiKey,
                dangerouslyAllowBrowser: true // Necessary for browser-side calls
            });

            const fullPrompt = prompt.replace('{{text}}', text);

            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini', // Lightweight and fast
                messages: [{ role: 'user', content: fullPrompt }],
            });

            const content = response.choices[0]?.message?.content || '';
            setLlmResponse(content);
            setLastProcessedText(text);

            // Persist the last processed text and result so it doesn't re-run on every open
            await chrome.storage.local.set({
                lastProcessedText: text,
                llmResponse: content
            });
        } catch (err: any) {
            console.error("OpenAI API Error:", err);
            setError(`Error calling OpenAI: ${err.message || 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Trigger LLM call when selectedText changes and is different from lastProcessedText
    useEffect(() => {
        if (selectedText && selectedText !== lastProcessedText && !isLoading && !isConfigOpen) {
            fetchFromLLM(selectedText);
        }
    }, [selectedText, lastProcessedText, isConfigOpen]);

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
                    <div style={{ marginBottom: '12px' }}>
                        <h3>Selected Text:</h3>
                        <div style={{
                            border: '1px solid #ccc',
                            padding: '8px',
                            borderRadius: '4px',
                            backgroundColor: '#f9f9f9',
                            minHeight: '20px',
                            fontSize: '0.9rem'
                        }}>
                            {selectedText || 'No text selected. Select some text on the page and open the extension.'}
                        </div>
                    </div>

                    {isLoading && (
                        <div style={{ color: '#666', fontStyle: 'italic', marginBottom: '12px' }}>
                            Calling LLM...
                        </div>
                    )}

                    {error && (
                        <div style={{
                            color: '#721c24',
                            backgroundColor: '#f8d7da',
                            border: '1px solid #f5c6cb',
                            padding: '8px',
                            borderRadius: '4px',
                            marginBottom: '12px',
                            fontSize: '0.85rem'
                        }}>
                            {error}
                        </div>
                    )}

                    {llmResponse && !isLoading && (
                        <div>
                            <h3>Analysis:</h3>
                            <pre style={{
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                backgroundColor: '#f0f0f0',
                                padding: '8px',
                                borderRadius: '4px',
                                fontSize: '0.85rem',
                                border: '1px solid #ddd'
                            }}>
                                {llmResponse}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default App
