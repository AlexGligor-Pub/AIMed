import { useState, useEffect } from 'react'
import MedicinesTable from './components/MedicinesTable'
import ChatBot from './components/ChatBot'
import './App.css'

function App() {
  const [medicinesData, setMedicinesData] = useState([])
  const [selectedAgeCategory, setSelectedAgeCategory] = useState('toate')
  
  // Debug: verifică dacă API key-ul este încărcat
  console.log('App loaded - API Key exists:', !!import.meta.env.VITE_OPENAI_API_KEY)
  console.log('App loaded - API Key length:', import.meta.env.VITE_OPENAI_API_KEY ? import.meta.env.VITE_OPENAI_API_KEY.length : 0)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })

  // Categorii de vârstă (keywords nu mai sunt necesare - folosim coloana CategorieVarsta din CSV)
  const ageCategories = [
    { id: 'toate', label: 'Toate', percentage: 'Toate', description: '', isSpecial: true },
    { id: 'copii', label: 'Copii', icon: '👶', description: '0-12 ani' },
    { id: 'adolescenti', label: 'Adolescenți', icon: '🧒', description: '13-17 ani' },
    { id: 'tineri', label: 'Tineri', icon: '👨', description: '18-35 ani' },
    { id: 'adulti', label: 'Adulți', icon: '👨‍💼', description: '36-64 ani' },
    { id: 'batrani', label: 'Bătrâni', icon: '👴', description: '65+ ani' }
  ]

  // Funcție pentru parsing CSV corect (gestionează ghilimele)
  const parseCSVLine = (line) => {
    const values = []
    let currentValue = ''
    let insideQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        insideQuotes = !insideQuotes
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim())
        currentValue = ''
      } else {
        currentValue += char
      }
    }
    values.push(currentValue.trim())
    return values
  }

  // Încarcă datele CSV pentru a le trimite la ChatBot
  useEffect(() => {
    const fetchCSV = async () => {
      try {
        const response = await fetch('/medicamente_cu_boli_COMPLET.csv')
        const csvText = await response.text()
        const lines = csvText.split('\n')
        const headers = parseCSVLine(lines[0])
        
        const data = []
        for (let i = 1; i < Math.min(lines.length, 100); i++) { // Primele 100 pentru context
          const line = lines[i].trim()
          if (line) {
            const values = parseCSVLine(line)
            const medicine = {}
            headers.forEach((header, index) => {
              medicine[header] = values[index] || ''
            })
            data.push(medicine)
          }
        }
        setMedicinesData(data)
      } catch (error) {
        console.error('Error loading CSV for chatbot:', error)
      }
    }
    fetchCSV()
  }, [])

  return (
    <div className="App">
      <MedicinesTable 
        ageCategory={selectedAgeCategory}
        ageCategoryData={ageCategories.find(c => c.id === selectedAgeCategory)}
        ageCategories={ageCategories}
        onCategoryChange={setSelectedAgeCategory}
      />
      <ChatBot medicinesData={medicinesData} />
    </div>
  )
}

export default App
