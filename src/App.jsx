import { useState, useEffect } from 'react'
import MedicinesTable from './components/MedicinesTable'
import ChatBot from './components/ChatBot'
import './App.css'

function App() {
  const [medicinesData, setMedicinesData] = useState([])

  // Încarcă datele CSV pentru a le trimite la ChatBot
  useEffect(() => {
    const fetchCSV = async () => {
      try {
        const response = await fetch('/medicamente_cnas.csv')
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
      <MedicinesTable />
      <ChatBot medicinesData={medicinesData} />
    </div>
  )
}

export default App
