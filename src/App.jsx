import { useState, useEffect } from 'react'
import MedicinesTable from './components/MedicinesTable'
import ChatBot from './components/ChatBot'
import './App.css'

function App() {
  const [medicinesData, setMedicinesData] = useState([])
  const [selectedAgeCategory, setSelectedAgeCategory] = useState('toate')
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })

  // Categorii de vârstă (keywords nu mai sunt necesare - folosim coloana CategorieVarsta din CSV)
  const ageCategories = [
    { id: 'toate', label: 'Toate', icon: '🏥', description: 'Toate medicamentele' },
    { id: 'copii', label: 'Copii', icon: '👶', description: '0-12 ani' },
    { id: 'adolescenti', label: 'Adolescenți', icon: '🧒', description: '13-17 ani' },
    { id: 'tineri', label: 'Tineri', icon: '👨', description: '18-35 ani' },
    { id: 'adulti', label: 'Adulți', icon: '👨‍💼', description: '36-64 ani' },
    { id: 'batrani', label: 'Bătrâni', icon: '👴', description: '65+ ani' }
  ]

  // Încarcă datele CSV pentru a le trimite la ChatBot
  useEffect(() => {
    const fetchCSV = async () => {
      try {
        const response = await fetch('/medicamente_cu_categorii.csv')
        const csvText = await response.text()
        const lines = csvText.split('\n')
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
        
        const data = []
        for (let i = 1; i < Math.min(lines.length, 100); i++) { // Primele 100 pentru context
          const line = lines[i].trim()
          if (line) {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
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
      <header className="app-header">
        <h1 className="app-title">🏥 MedAI - Baza de Date Medicamente CNAS</h1>
      </header>
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
