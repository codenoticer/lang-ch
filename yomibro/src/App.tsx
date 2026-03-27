import { useState, useEffect } from 'react'
import './App.css'

function App() {
    const [selectedText, setSelectedText] = useState<string>('')

    useEffect(() => {
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

    return (
        <div style={{padding: '16px', minWidth: '220px'}}>
            <h1>Yomibro</h1>
            <div>
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
        </div>
    )
}

export default App
