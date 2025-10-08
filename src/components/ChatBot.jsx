import { useState, useRef, useEffect } from 'react'
import './ChatBot.css'

const ChatBot = ({ medicinesData = [] }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Bună! Sunt asistentul tău pentru medicamente CNAS. Îți pot oferi informații despre medicamente, prețuri, substanțe active, liste de compensare și multe altele. Cu ce te pot ajuta?' }
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
      // Creează contextul cu informații despre medicamente
      const medicinesContext = medicinesData.length > 0 
        ? `\n\nDate despre medicamente disponibile (primele ${medicinesData.length} din baza de date CNAS):\n${JSON.stringify(medicinesData.slice(0, 10), null, 2)}\n\nTotal medicamente în baza de date: ${medicinesData.length}. Răspunde la întrebări despre medicamente pe baza acestor date și cunoștințelor tale generale despre medicamente.`
        : ''

      // Adaugă contextul la primul mesaj sistem
      const messagesWithContext = [
        { 
          role: 'system', 
          content: `Ești un asistent medical inteligent specializat în informații despre medicamente din lista CNAS (Casa Națională de Asigurări de Sănătate) din România. Ajuți utilizatorii să găsească informații despre medicamente, prețuri, substanțe active, liste de compensare și alte detalii relevante.${medicinesContext}\n\nRăspunde întotdeauna în limba română, clar și concis. Dacă un utilizator întreabă despre un medicament specific, încearcă să găsești informația în datele furnizate. Dacă informația nu este disponibilă, oferă sfaturi generale bazate pe cunoștințele tale medicale.` 
        },
        ...newMessages
      ]

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: messagesWithContext,
          temperature: 0.7,
          max_tokens: 800
        })
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      const data = await response.json()
      const assistantMessage = data.choices[0].message.content

      setMessages([...newMessages, { role: 'assistant', content: assistantMessage }])
    } catch (error) {
      console.error('Error calling OpenAI:', error)
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: 'Ne pare rău, a apărut o eroare la conectarea cu AI. Te rog încearcă din nou.' 
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
          title="Deschide chat"
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

