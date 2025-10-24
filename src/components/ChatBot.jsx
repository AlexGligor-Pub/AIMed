import { useState, useRef, useEffect } from 'react'
import './ChatBot.css'

const ChatBot = ({ medicinesData = [] }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Bună! Sunt asistentul tău medical. Descrie-mi simptomele sau starea pacientului și îți voi recomanda medicamentele potrivite din lista CNAS. Cu ce te pot ajuta?' }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage = inputMessage.trim()
    setInputMessage('')
    
    // Adaugă mesajul utilizatorului
    const newMessages = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)
    setIsLoading(true)

    try {
      // Creează contextul cu informații despre medicamente și codurile de boală
      const medicinesContext = medicinesData.length > 0 
        ? `\n\nDate despre medicamente disponibile din baza de date CNAS (${medicinesData.length} medicamente):\n${JSON.stringify(medicinesData.slice(0, 20), null, 2)}\n\nFiecare medicament are asociate coduri de boală în coloana "Coduri_Boli" care indică pentru ce afecțiuni este indicat.`
        : ''

      // Adaugă contextul la primul mesaj sistem
      const messagesWithContext = [
        { 
          role: 'system', 
          content: `Ești un asistent medical inteligent specializat în recomandarea medicamentelor din lista CNAS (Casa Națională de Asigurări de Sănătate) din România. 

FUNCȚIONALITATEA TA:
1. Utilizatorul îți descrie simptomele sau starea unui pacient
2. Tu analizezi simptomele și identifici afecțiunile posibile
3. Găsești medicamentele din lista CNAS care au coduri de boală corespunzătoare acelor afecțiuni
4. Recomanzi medicamentele potrivite cu explicații

${medicinesContext}

IMPORTANT:
- Analizează simptomele descrise de utilizator
- Identifică afecțiunile medicale posibile
- Caută în datele furnizate medicamentele care au coduri de boală corespunzătoare
- Recomandă medicamentele potrivite cu explicații clare
- Menționează substanța activă și lista de compensare
- Răspunde întotdeauna în limba română, clar și concis
- Dacă nu găsești medicamente specifice, oferă sfaturi generale bazate pe cunoștințele tale medicale` 
        },
        ...newMessages
      ]

      // Debug: verifică API key-ul
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY
      console.log('API Key exists:', !!apiKey)
      console.log('API Key length:', apiKey ? apiKey.length : 0)
      console.log('API Key starts with:', apiKey ? apiKey.substring(0, 20) + '...' : 'undefined')
      console.log('Full API Key:', apiKey)
      console.log('All env vars:', import.meta.env)
      
      // Test de conectivitate
      console.log('Testing network connectivity...')
      try {
        const testResponse = await fetch('https://httpbin.org/get', { method: 'GET' })
        console.log('Network test successful:', testResponse.status)
      } catch (testError) {
        console.error('Network test failed:', testError)
      }
      
      console.log('Making request to OpenAI API through proxy...')
      const response = await fetch('/api/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: messagesWithContext,
          temperature: 0.7,
          max_tokens: 800
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Response Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        throw new Error(`API Error: ${response.status} - ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      console.log('API Response:', data)
      const assistantMessage = data.choices[0].message.content

      setMessages([...newMessages, { role: 'assistant', content: assistantMessage }])
    } catch (error) {
      console.error('Error calling OpenAI:', error)
      console.error('Error type:', typeof error)
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        response: error.response
      })
      
      let errorMessage = 'Ne pare rău, a apărut o eroare la conectarea cu AI. '
      
      if (error.message.includes('401')) {
        errorMessage += 'Eroare de autentificare - API key invalid sau lipsă.'
      } else if (error.message.includes('429')) {
        errorMessage += 'Prea multe cereri - încearcă din nou mai târziu.'
      } else if (error.message.includes('500')) {
        errorMessage += 'Eroare de server OpenAI.'
      } else {
        errorMessage += `Detalii: ${error.message}`
      }
      
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: errorMessage
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Buton Chat */}
      {!isOpen && (
        <button 
          className="chat-button"
          onClick={() => setIsOpen(true)}
        >
          💬
        </button>
      )}

      {/* Modal Chat */}
      {isOpen && (
        <div className="chat-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="chat-header">
              <h3>🤖 Asistent AI</h3>
              <button 
                className="chat-close-button"
                onClick={() => setIsOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`chat-message ${message.role}`}
                >
                  <div className="message-content">
                    {message.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="chat-message assistant">
                  <div className="message-content loading">
                    <span className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="chat-input-container">
              <textarea
                className="chat-input"
                placeholder="Scrie un mesaj..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                rows={1}
              />
              <button 
                className="chat-send-button"
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim()}
              >
                📤
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ChatBot

