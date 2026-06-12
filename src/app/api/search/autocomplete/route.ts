import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()

  if (q.length < 1) {
    return NextResponse.json({ suggestions: [] })
  }

  const supabase = createServerClient()

  // Fetch distinct makes matching the query
  const { data: makeRows } = await supabase
    .from('listings')
    .select('make')
    .eq('status', 'active')
    .ilike('make', `%${q}%`)
    .limit(50)

  // Fetch make+model combos matching the query
  const { data: modelRows } = await supabase
    .from('listings')
    .select('make, model')
    .eq('status', 'active')
    .or(`make.ilike.%${q}%,model.ilike.%${q}%`)
    .limit(50)

  const suggestions: Array<{ type: string; label: string; value: string; count?: number }> = []
  const seen = new Set<string>()

  // Distinct makes — count occurrences for ordering
  const makeCounts: Record<string, number> = {}
  for (const row of makeRows ?? []) {
    makeCounts[row.make] = (makeCounts[row.make] || 0) + 1
  }

  Object.entries(makeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .forEach(([make, count]) => {
      const key = `make:${make}`
      if (!seen.has(key)) {
        seen.add(key)
        suggestions.push({ type: 'make', label: make, value: make, count })
      }
    })

  // Distinct make+model combos — count occurrences
  const modelCounts: Record<string, { make: string; model: string; count: number }> = {}
  for (const row of modelRows ?? []) {
    const key = `${row.make}|${row.model}`
    if (!modelCounts[key]) modelCounts[key] = { make: row.make, model: row.model, count: 0 }
    modelCounts[key].count++
  }

  Object.values(modelCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .forEach(({ make, model, count }) => {
      const key = `model:${make}|${model}`
      if (!seen.has(key)) {
        seen.add(key)
        suggestions.push({
          type: 'model',
          label: `${make} ${model}`,
          value: `${make} ${model}`,
          count,
        })
      }
    })

  return NextResponse.json({ suggestions: suggestions.slice(0, 8) })
}
