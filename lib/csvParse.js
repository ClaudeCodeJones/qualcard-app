// Minimal RFC-4180 compatible CSV parser.
// - Strips UTF-8 BOM
// - Tolerates \r\n or \n line endings
// - Handles quoted cells and escaped quotes ("")
// - Returns rows as objects keyed by the header row
// - Trims header names (but not cell values — caller decides)

export function parseCsv(text) {
  if (typeof text !== "string") return { rows: [], headers: [] }

  // Strip BOM
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)

  const records = []
  let field = ""
  let row = []
  let inQuotes = false
  let i = 0
  const len = text.length

  while (i < len) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          // Escaped quote
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += ch
      i++
      continue
    }

    if (ch === '"') {
      inQuotes = true
      i++
      continue
    }

    if (ch === ",") {
      row.push(field)
      field = ""
      i++
      continue
    }

    if (ch === "\r") {
      // Accept \r\n and lone \r
      if (text[i + 1] === "\n") i++
      row.push(field)
      records.push(row)
      field = ""
      row = []
      i++
      continue
    }

    if (ch === "\n") {
      row.push(field)
      records.push(row)
      field = ""
      row = []
      i++
      continue
    }

    field += ch
    i++
  }

  // Flush last field/row if file didn't end with newline
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    records.push(row)
  }

  // Drop trailing blank records (empty line at EOF)
  while (records.length > 0) {
    const last = records[records.length - 1]
    if (last.length === 0 || (last.length === 1 && last[0] === "")) {
      records.pop()
    } else {
      break
    }
  }

  if (records.length === 0) return { rows: [], headers: [] }

  const headers = records[0].map((h) => h.trim())
  const rows = records.slice(1).map((record) => {
    const obj = {}
    headers.forEach((h, idx) => {
      obj[h] = record[idx] ?? ""
    })
    return obj
  })

  return { rows, headers }
}
