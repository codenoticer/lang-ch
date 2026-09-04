import {useEffect, useState} from 'react'
import OpenAI from 'openai'
import { toBlob } from 'html-to-image'
import './App.css'

function App() {
    const [selectedText, setSelectedText] = useState<string>('')
    const [apiKey, setApiKey] = useState<string>('')
    const [prompt, setPrompt] = useState<string>(`Placeholder`)
    const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false)
    const [llmResponse, setLlmResponse] = useState<string>('')
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [error, setError] = useState<string>('')
    const [lastProcessedText, setLastProcessedText] = useState<string>('')
    const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle')

    useEffect(() => {
        // Load settings from storage
        chrome.storage.local.get(['apiKey', 'prompt', 'lastProcessedText', 'llmResponse'], (result: {
            [key: string]: any
        }) => {
            if (typeof result.apiKey === 'string') setApiKey(result.apiKey);
            if (typeof result.prompt === 'string') setPrompt(result.prompt);
            if (typeof result.lastProcessedText === 'string') setLastProcessedText(result.lastProcessedText);
            if (typeof result.llmResponse === 'string') setLlmResponse(result.llmResponse);
        });

        const fetchSelection = async () => {
            try {
                const [tab] = await chrome.tabs.query({active: true, currentWindow: true});

                if (tab?.id) {
                    const results = await chrome.scripting.executeScript({
                        target: {tabId: tab.id},
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

        if (!prompt.includes('{{text}}')) {
            setError('Error: Prompt must contain the {{text}} placeholder.');
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

            const response = await openai.responses.create({
                model: 'gpt-5.6-luna',
                service_tier: 'priority', // 2x the price
                reasoning: { effort: 'medium' }, // 'low', 'none'
                input: [{role: 'user', content: fullPrompt}],
                text: { format: { type: 'json_object' } }
            });

            const content = response.output_text || '';
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
        if (selectedText && selectedText.trim() !== lastProcessedText.trim() && !isLoading && !isConfigOpen) {
            fetchFromLLM(selectedText);
        }
    }, [selectedText, lastProcessedText, isConfigOpen]);

    const handleSave = () => {
        chrome.storage.local.set({apiKey, prompt}, () => {
            setIsConfigOpen(false);
        });
    };

    return (
        <div style={{padding: '16px', boxSizing: 'border-box'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h1 style={{margin: 0}}>Yomibro</h1>
                <button
                    onClick={() => setIsConfigOpen(!isConfigOpen)}
                    style={{fontSize: '1.2rem', cursor: 'pointer', background: 'none', border: 'none'}}
                    title="Settings"
                >
                    ⚙️
                </button>
            </div>

            {isConfigOpen ? (
                <div style={{marginTop: '16px'}}>
                    <div style={{marginBottom: '12px'}}>
                        <label style={{display: 'block', marginBottom: '4px'}}>OpenAI API Key:</label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            style={{width: '100%', padding: '4px', boxSizing: 'border-box'}}
                        />
                    </div>
                    <div style={{marginBottom: '12px'}}>
                        <label style={{display: 'block', marginBottom: '4px'}}>Prompt Template (use {"{{text}}"} for
                            selection):</label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            style={{width: '100%', minHeight: '100px', padding: '4px', boxSizing: 'border-box'}}
                        />
                    </div>
                    <button
                        onClick={handleSave}
                        style={{width: '100%', padding: '8px', cursor: 'pointer'}}
                    >
                        Save Settings
                    </button>
                </div>
            ) : (
                <div style={{marginTop: '16px'}}>
                    <div style={{marginBottom: '12px'}}>
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
                        <div style={{color: '#666', fontStyle: 'italic', marginBottom: '12px'}}>
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
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <h3>Analysis:</h3>
                                <button
                                    className={`copy-button ${copyStatus === 'success' ? 'success' : ''}`}
                                    onClick={() => {
                                        const element = document.querySelector('.t2.text_size') as HTMLElement;
                                        if (element) {
                                            toBlob(element, { cacheBust: true })
                                                .then((blob) => {
                                                    if (blob) {
                                                        const item = new ClipboardItem({ 'image/png': blob });
                                                        return navigator.clipboard.write([item]);
                                                    }
                                                })
                                                .then(() => {
                                                    setCopyStatus('success');
                                                    setTimeout(() => setCopyStatus('idle'), 2000);
                                                })
                                                .catch((err) => {
                                                    setCopyStatus('error');
                                                    setTimeout(() => setCopyStatus('idle'), 2000);
                                                    console.error('oops, something went wrong!', err);
                                                });
                                        }
                                    }}
                                    title="Copy Analysis as Image"
                                >
                                    {copyStatus === 'success' ? '✅ Copied!' : copyStatus === 'error' ? '❌ Error' : '📋 Copy'}
                                </button>
                            </div>
                            <AnalysisView response={llmResponse}/>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

interface AnalysisData {
    mandarin: string;
    english: string;
    breakdown: {
        term: string;
        pinyin: string;
        explanation: string;
    }[];
    word_by_word: string;
    note: string;
}

function AnalysisView({response}: { response: string }) {
    try {
        const data: AnalysisData = JSON.parse(response);
        return (
            <div className="t2 text_size">
                <span className="english">{data.mandarin}<br/>{data.english}</span>
                <table className="breakdown-table">
                    <tbody>
                    {data.breakdown.map((item, index) => (
                        <tr key={index}>
                            <td className="component">
                                <ruby>
                                    {item.term}
                                    <rt className="pinyin">{item.pinyin}</rt>
                                </ruby>
                            </td>
                            <td className="explanation">{item.explanation}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                <div className="word-by-word">{data.word_by_word}</div>
                {data.note && <div className="note">{data.note}</div>}
            </div>
        );
    } catch (err) {
        return (
            <pre style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                backgroundColor: '#f0f0f0',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '0.85rem',
                border: '1px solid #ddd'
            }}>
                {response}
            </pre>
        );
    }
}

export default App
