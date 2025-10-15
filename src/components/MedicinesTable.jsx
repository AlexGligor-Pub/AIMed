import { useState, useEffect, useMemo, useCallback } from 'react'
import './MedicinesTable.css'

const MedicinesTable = ({ ageCategory = 'toate', ageCategoryData = null, ageCategories = [], onCategoryChange = () => {} }) => {
  const [medicines, setMedicines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [showColumnModal, setShowColumnModal] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState({})
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [filters, setFilters] = useState({})
  const [searchTerms, setSearchTerms] = useState({})
  const [showFilters, setShowFilters] = useState({})
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [diseases, setDiseases] = useState({})
  const [selectedCompensationCategory, setSelectedCompensationCategory] = useState('toate')

  // Primele 4 coloane afișate implicit (fără Coduri_Boli)
  const defaultVisibleColumns = [
    'Denumire medicament',
    'Substanta activa', 
    'Lista de compensare',
    'Cod medicament'
  ]

  // Categorii de compensare
  const compensationCategories = [
    { id: 'toate', label: 'Toate'},
    { id: 'A', label: 'A', percentage: '', description: '90% compensare' },
    { id: 'B', label: 'B', percentage: '', description: '50% compensare' },
    { id: 'C1', label: 'C1', percentage: '', description: '100% compensare' },
    { id: 'C2', label: 'C2', percentage: '', description: '100% compensare' },
    { id: 'C3', label: 'C3', percentage: '', description: '100% compensare' },
    { id: 'D', label: 'D', percentage: '', description: '20% compensare' }
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

  // Funcție pentru încărcarea bolilor
  const fetchDiseases = async () => {
    try {
      const response = await fetch('/coduri_boala.csv')
      const csvText = await response.text()
      const lines = csvText.split('\n')
      const diseasesMap = {}
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line) {
          const values = parseCSVLine(line)
          if (values.length >= 2) {
            diseasesMap[values[0]] = values[1]
          }
        }
      }
      
      setDiseases(diseasesMap)
      console.log(`✅ Încărcate ${Object.keys(diseasesMap).length} boli`)
    } catch (error) {
      console.error('❌ Eroare la încărcarea bolilor:', error)
    }
  }

  // Funcție pentru încărcarea medicamentelor
  const fetchMedicines = async () => {
    try {
      setLoading(true)
      console.log('🔄 Încerc să încarc fișierul CSV...')
      const response = await fetch('/medicamente_cu_boli_COMPLET.csv')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const csvText = await response.text()
      console.log('✅ CSV încărcat cu succes, încep procesarea...')
      
      const lines = csvText.split('\n')
      const headers = parseCSVLine(lines[0])
      
      const medicinesData = []
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line) {
          const values = parseCSVLine(line)
          const medicine = {}
          headers.forEach((header, index) => {
            medicine[header] = values[index] || ''
          })
          medicinesData.push(medicine)
        }
      }
      
      console.log(`✅ Procesat cu succes: ${medicinesData.length} medicamente`)
      console.log('📊 Exemplu medicament:', medicinesData[0])
      setMedicines(medicinesData)
      setError(null)
      setLoading(false)
    } catch (err) {
      console.error('❌ Eroare la încărcarea medicamentelor:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  // Funcție pentru a încărca toate filtrele din JSON
  const loadAllFiltersFromJSON = async () => {
    try {
      console.log('🔄 Încerc să încarc filtrele din all-filters.json...')
      const response = await fetch('/all-filters.json')
      if (response.ok) {
        console.log('✅ Fișier JSON găsit, procesez...')
        const data = await response.json()
        console.log('✅ JSON parsat cu succes, coloane găsite:', Object.keys(data).length)
        const initialFilters = {}
        const initialSearchTerms = {}
        const initialShowFilters = {}
        
        Object.keys(data).forEach(column => {
          initialFilters[column] = {}
          initialSearchTerms[column] = ''
          initialShowFilters[column] = false
          
          data[column].forEach(value => {
            initialFilters[column][value] = false
          })
        })
        
        setFilters(initialFilters)
        setSearchTerms(initialSearchTerms)
        setShowFilters(initialShowFilters)
        
        console.log(`✅ Încărcate filtre pentru ${Object.keys(data).length} coloane din all-filters.json`)
      } else {
        console.warn('⚠️ Nu s-a putut încărca all-filters.json, folosesc CSV-ul')
        loadFiltersFromCSV()
      }
    } catch (error) {
      console.error('❌ Eroare la încărcarea all-filters.json:', error)
      loadFiltersFromCSV()
    }
  }

  // Fallback pentru a încărca filtrele din CSV
  const loadFiltersFromCSV = () => {
    console.log('🔄 Încarc filtrele din CSV...')
    if (medicines.length === 0) {
      console.warn('⚠️ Nu există medicamente încărcate pentru filtre')
      return
    }
    
    const allColumns = Object.keys(medicines[0])
    console.log('📋 Coloane găsite:', allColumns.length)
    const initialFilters = {}
    const initialSearchTerms = {}
    const initialShowFilters = {}
    
    allColumns.forEach(column => {
      if (column !== 'Denumire medicament') {
        const uniqueValues = [...new Set(medicines.map(medicine => medicine[column]).filter(val => val && val.trim() !== ''))]
        initialFilters[column] = {}
        initialSearchTerms[column] = ''
        initialShowFilters[column] = false
        
        uniqueValues.forEach(value => {
          initialFilters[column][value] = false
        })
      }
    })
    
    setFilters(initialFilters)
    setSearchTerms(initialSearchTerms)
    setShowFilters(initialShowFilters)
    console.log(`✅ Filtre încărcate din CSV pentru ${Object.keys(initialFilters).length} coloane`)
  }

  // Inițializează coloanele vizibile când se încarcă datele
  useEffect(() => {
    if (medicines.length > 0) {
      const allColumns = Object.keys(medicines[0])
      
      // Inițializează doar primele 4 coloane ca fiind vizibile implicit
      const initialVisibleColumns = {}
      allColumns.forEach(col => {
        initialVisibleColumns[col] = defaultVisibleColumns.includes(col)
      })
      setVisibleColumns(initialVisibleColumns)

      // Încarcă filtrele din all-filters.json
      loadAllFiltersFromJSON()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicines.length])

  // useEffect pentru încărcarea inițială
  useEffect(() => {
    fetchDiseases()
    fetchMedicines()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Funcție pentru afișarea bolilor asociate unui medicament
  const getDiseasesForMedicine = (coduriBoli) => {
    if (!coduriBoli || !diseases || Object.keys(diseases).length === 0) {
      return []
    }
    
    const coduri = coduriBoli.replace(/"/g, '').split(',').map(cod => cod.trim())
    return coduri.map(cod => ({
      cod: cod,
      nume: diseases[cod] || `Boală necunoscută (${cod})`
    })).filter(disease => disease.cod)
  }

  const handleSort = useCallback((key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }, [sortConfig])

  const getSortedData = (data) => {
    if (!sortConfig.key) return data

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key] || ''
      const bValue = b[sortConfig.key] || ''
      
      // Verifică dacă valorile sunt numere
      const aNum = parseFloat(aValue)
      const bNum = parseFloat(bValue)
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum
      }
      
      // Pentru text, face sortare case-insensitive
      const aStr = aValue.toString().toLowerCase()
      const bStr = bValue.toString().toLowerCase()
      
      if (aStr < bStr) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (aStr > bStr) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })
  }

  // Memoize filtered data pentru performanță
  const filteredMedicines = useMemo(() => {
    let filtered = medicines

    // Aplică filtrarea pe bază de categorie de vârstă folosind coloana CategorieVarsta
    if (ageCategory && ageCategory !== 'toate') {
      filtered = filtered.filter(medicine => {
        const categorieVarsta = medicine['CategorieVarsta'] || ''
        
        // Mapare între ID-ul categoriei și valoarea din CSV
        const categoryMap = {
          'copii': 'Copii',
          'adolescenti': 'Adolescenți',
          'tineri': 'Tineri',
          'adulti': 'Adulți',
          'batrani': 'Bătrâni'
        }
        
        const categoryValue = categoryMap[ageCategory]
        if (!categoryValue) return false
        
        // Verifică dacă categoria selectată apare în CategorieVarsta
        // (poate fi "Copii", "Adolescenți+Tineri", "Adulți+Bătrâni", etc.)
        return categorieVarsta.includes(categoryValue)
      })
    }

    // Aplică filtrarea pe bază de categorie de compensare folosind coloana Lista de compensare
    if (selectedCompensationCategory && selectedCompensationCategory !== 'toate') {
      filtered = filtered.filter(medicine => {
        const listaCompensare = medicine['Lista de compensare'] || ''
        return listaCompensare.includes(selectedCompensationCategory)
      })
    }

    // Aplică căutarea globală
    if (searchTerm) {
      filtered = filtered.filter(medicine => 
        Object.values(medicine).some(value => 
          value.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    // Aplică filtrele pentru toate coloanele
    Object.keys(filters).forEach(column => {
      const selectedValues = Object.keys(filters[column] || {}).filter(value => filters[column][value])
      
      if (selectedValues.length > 0) {
        filtered = filtered.filter(medicine => 
          selectedValues.includes(medicine[column])
        )
      }
    })

    return filtered
  }, [medicines, searchTerm, filters, ageCategory, ageCategoryData, selectedCompensationCategory])

  // Memoize sorted data
  const sortedMedicines = useMemo(() => {
    return getSortedData(filteredMedicines)
  }, [filteredMedicines, sortConfig])

  // Calculează paginarea
  const totalPages = itemsPerPage === 'All' ? 1 : Math.ceil(sortedMedicines.length / itemsPerPage)
  const startIndex = itemsPerPage === 'All' ? 0 : (currentPage - 1) * itemsPerPage
  const endIndex = itemsPerPage === 'All' ? sortedMedicines.length : startIndex + itemsPerPage
  const currentMedicines = sortedMedicines.slice(startIndex, endIndex)

  // Reset la pagina 1 când se schimbă itemsPerPage
  useEffect(() => {
    setCurrentPage(1)
  }, [itemsPerPage])

  // Toate hook-urile TREBUIE să fie înainte de orice return condiționat!
  const handleColumnToggle = useCallback((columnName) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnName]: !prev[columnName]
    }))
  }, [])

  const handleItemsPerPageChange = useCallback((value) => {
    setItemsPerPage(value)
  }, [])

  // Funcții generice pentru filtre
  const handleFilterToggle = useCallback((filterKey, value) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: {
        ...prev[filterKey],
        [value]: !prev[filterKey][value]
      }
    }))
  }, [])

  const clearFilters = useCallback((filterKey) => {
    const clearedFilters = {}
    Object.keys(filters[filterKey] || {}).forEach(value => {
      clearedFilters[value] = false
    })
    setFilters(prev => ({
      ...prev,
      [filterKey]: clearedFilters
    }))
  }, [filters])

  const clearAllFilters = useCallback(() => {
    const clearedFilters = {}
    Object.keys(filters).forEach(column => {
      clearedFilters[column] = {}
      Object.keys(filters[column] || {}).forEach(value => {
        clearedFilters[column][value] = false
      })
    })
    setFilters(clearedFilters)
  }, [filters])

  const handleContextMenuClick = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setContextMenuPosition({
      x: rect.left,
      y: rect.bottom + 5
    })
    setShowContextMenu(true)
  }, [])

  const handleContextMenuClose = useCallback(() => {
    setShowContextMenu(false)
  }, [])

  const handleFilterClick = useCallback((filterKey) => {
    setShowFilters(prev => ({
      ...prev,
      [filterKey]: true
    }))
    setShowContextMenu(false)
  }, [])

  const handleSearchTermChange = useCallback((filterKey, value) => {
    setSearchTerms(prev => ({
      ...prev,
      [filterKey]: value
    }))
  }, [])

  // Filtrează valorile pe baza termenului de căutare
  const getFilteredValues = (filterKey) => {
    return Object.keys(filters[filterKey] || {}).filter(value =>
      value.toLowerCase().includes(searchTerms[filterKey]?.toLowerCase() || '')
    )
  }

  // Obține coloanele care au filtre active
  const getActiveFilterColumns = () => {
    return Object.keys(filters).filter(column => {
      const selectedValues = Object.keys(filters[column] || {}).filter(value => filters[column][value])
      return selectedValues.length > 0
    })
  }

  const activeFilterColumns = getActiveFilterColumns()

  // Obține coloanele vizibile
  const getVisibleHeaders = () => {
    if (medicines.length === 0) return []
    const allColumns = Object.keys(medicines[0])
    return allColumns.filter(col => visibleColumns[col])
  }

  const headers = getVisibleHeaders()

  // Obține toate coloanele pentru modal
  const getAllColumns = () => {
    if (medicines.length === 0) return []
    return Object.keys(medicines[0])
  }

  const allColumns = getAllColumns()

  // Loading și Error states DUPĂ toate hook-urile
  if (loading) {
    return (
      <div className="medicines-container">
        <div className="loading">Se încarcă datele...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="medicines-container">
        <div className="error">Eroare: {error}</div>
      </div>
    )
  }

  return (
    <div className="medicines-container">
      <div className="search-container">
        <input
          type="text"
          placeholder="Caută..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        
        <button 
          className="column-toggle-button"
          onClick={() => setShowColumnModal(true)}
          title="Filtrează coloanele"
        >
          ⚙️
        </button>
        <button 
          className="substance-filter-toggle-button"
          onClick={handleContextMenuClick}
          title="Meniu filtre"
        >
          🔬
        </button>
        {activeFilterColumns.length > 0 && (
          <button 
            className="clear-all-filters-button"
            onClick={clearAllFilters}
            title="Șterge toate filtrele"
          >
            🗑️ Șterge filtrele
          </button>
        )}
        <div className="items-per-page">
          <label htmlFor="itemsPerPage">Elemente pe pagină:</label>
          <select
            id="itemsPerPage"
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(e.target.value === 'All' ? 'All' : parseInt(e.target.value))}
            className="items-per-page-select"
          >
            <option value={10}>10</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value="All">Toate</option>
          </select>
        </div>
      </div>

      {/* Layout cu două coloane */}
      <div className="main-content-layout">
        {/* Coloana stângă - Filtre */}
        <div className="filters-column">
          {/* Categorii de vârstă și compensare */}
          {ageCategories.length > 0 && (
            <div className="categories-section">
              {/* Categorii de vârstă */}
              <div className="age-categories-column">
                <h4 className="filter-section-title">📋 Categorii de vârstă</h4>
                <div className="categories-grid">
                  {ageCategories.map(category => (
                    <button
                      key={category.id}
                      className={`category-btn age-category-btn ${ageCategory === category.id ? 'active' : ''}`}
                      onClick={() => onCategoryChange(category.id)}
                    >
                      <span className="category-icon">{category.icon}</span>
                      <div className="category-info">
                        <span className="category-label">{category.label}</span>
                        <span className="category-description">{category.description}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Categorii de compensare */}
              <div className="compensation-categories-column">
                <h4 className="filter-section-title">💰 Categorii de compensare</h4>
                <div className="categories-grid">
                  {compensationCategories.map(category => (
                    <button
                      key={category.id}
                      className={`category-btn compensation-category-btn ${selectedCompensationCategory === category.id ? 'active' : ''}`}
                      onClick={() => setSelectedCompensationCategory(category.id)}
                    >
                      <div className="category-info">
                        <span className="category-label">{category.label}</span>
                        <span className="category-description">{category.description}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Coloana dreaptă - Tabelul de medicamente */}
        <div className="table-column">
          <div className={`table-container items-${itemsPerPage}`}>
            <table className="medicines-table">
              <thead>
                <tr>
                  <th className="row-number-header">#</th>
                  {headers.map((header, index) => (
                    <th 
                      key={index} 
                      className="sortable-header"
                      onClick={() => handleSort(header)}
                    >
                      <div className="header-content">
                        <span>{header}</span>
                        <div className="sort-indicators">
                          {sortConfig.key === header && (
                            <span className={`sort-arrow ${sortConfig.direction}`}>
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentMedicines.map((medicine, index) => (
                  <tr key={index}>
                    <td className="row-number">
                      {itemsPerPage === 'All' 
                        ? startIndex + index + 1 
                        : (currentPage - 1) * itemsPerPage + index + 1
                      }
                    </td>
                    {headers.map((header, headerIndex) => (
                      <td key={headerIndex}>
                        {header === 'Coduri_Boli' ? (
                          <div className="diseases-cell">
                            {getDiseasesForMedicine(medicine[header]).map((disease, idx) => (
                              <span key={idx} className="disease-tag" title={`${disease.cod}: ${disease.nume}`}>
                                {disease.cod}
                              </span>
                            ))}
                          </div>
                        ) : (
                          medicine[header]
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {itemsPerPage !== 'All' && (
            <div className="pagination">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="pagination-button"
              >
                Anterior
              </button>
              
              <span className="pagination-info">
                {currentPage}/{totalPages}
              </span>
              
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="pagination-button"
              >
                Următor
              </button>
            </div>
          )}

          {itemsPerPage === 'All' && (
            <div className="pagination">
              <span className="pagination-info">
                Afișate toate {sortedMedicines.length} elemente
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Template pentru modalele de filtre */}
      {Object.entries(showFilters).map(([filterKey, isVisible]) => {
        if (!isVisible) return null
        
        const filteredValues = getFilteredValues(filterKey)
        
        return (
          <div key={filterKey} className="filter-modal-overlay" onClick={() => setShowFilters(prev => ({ ...prev, [filterKey]: false }))}>
            <div className="filter-modal-section show" onClick={(e) => e.stopPropagation()}>
              <div className="filter-modal-header">
                <h3>{filterKey}</h3>
                <div className="filter-modal-header-buttons">
                  <button className="clear-filters-btn" onClick={() => clearFilters(filterKey)}>
                    Șterge filtrele
                  </button>
                  <button className="close-filters-btn" onClick={() => setShowFilters(prev => ({ ...prev, [filterKey]: false }))}>
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="filter-modal-content">
                <div className="filter-search-container">
                  <input
                    type="text"
                    placeholder={`Caută în ${filterKey}...`}
                    value={searchTerms[filterKey] || ''}
                    onChange={(e) => handleSearchTermChange(filterKey, e.target.value)}
                    className="filter-search-input"
                  />
                  <button className="clear-filters-inline-btn" onClick={() => clearFilters(filterKey)}>
                    Șterge filtrele
                  </button>
                </div>
                
                <div className="filter-options-grid">
                  {filteredValues.slice(0, 50).map(value => (
                    <label key={value} className="filter-option">
                      <input
                        type="checkbox"
                        checked={filters[filterKey]?.[value] || false}
                        onChange={() => handleFilterToggle(filterKey, value)}
                      />
                      <span>{value}</span>
                    </label>
                  ))}
                  {filteredValues.length === 0 && searchTerms[filterKey] && (
                    <div className="filter-no-results">
                      Nu s-au găsit rezultate care să conțină "{searchTerms[filterKey]}"
                    </div>
                  )}
                  {filteredValues.length > 50 && (
                    <div className="filter-more">
                      ... și încă {filteredValues.length - 50} rezultate
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {/* Meniu de filtre centrat */}
      {showContextMenu && (
        <div className="filter-menu-overlay" onClick={handleContextMenuClose}>
          <div className="filter-menu-modal" onClick={(e) => e.stopPropagation()}>
            <div className="filter-menu-header">
              <h3>🔬 Meniu Filtre</h3>
              <button className="filter-menu-close" onClick={handleContextMenuClose}>
                ✕
              </button>
            </div>
            <div className="filter-menu-content">
              <p className="filter-menu-description">
                Selectează o coloană pentru a filtra medicamentele:
              </p>
              <div className="filter-menu-grid">
                {Object.keys(filters).map(column => (
                  <div 
                    key={column} 
                    className="filter-menu-item" 
                    onClick={() => handleFilterClick(column)}
                  >
                    <div className="filter-menu-item-icon">🔬</div>
                    <div className="filter-menu-item-content">
                      <span className="filter-menu-item-title">{column}</span>
                      <span className="filter-menu-item-count">
                        {Object.keys(filters[column] || {}).length} opțiuni
                      </span>
                    </div>
                    <div className="filter-menu-item-arrow">→</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Modal pentru selecția coloanelor */}
      {showColumnModal && (
        <div className="modal-overlay" onClick={() => setShowColumnModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Selectează coloanele de afișat</h3>
              <button 
                className="modal-close"
                onClick={() => setShowColumnModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="column-list">
                {allColumns.map(column => (
                  <label key={column} className="column-checkbox">
                    <input
                      type="checkbox"
                      checked={visibleColumns[column] || false}
                      onChange={() => handleColumnToggle(column)}
                    />
                    <span>{column}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="modal-button"
                onClick={() => setShowColumnModal(false)}
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MedicinesTable