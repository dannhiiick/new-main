import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminFetch } from '../../lib/api'
import type { AnalyticsResult } from '../../lib/types'

const PERIODS = [
  { label: '7 дней', days: 7 },
  { label: '30 дней', days: 30 },
  { label: '90 дней', days: 90 },
]

export function AnalyticsPage(): React.ReactElement {
  const [days, setDays] = useState(30)

  const { data, isLoading, isError } = useQuery<AnalyticsResult>({
    queryKey: ['admin', 'analytics', days],
    queryFn: () => adminFetch<AnalyticsResult>(`/api/admin/analytics?days=${days}`),
    staleTime: 60_000,
  })

  const maxPlays = data ? Math.max(...data.topTracks.map(t => t.plays), 1) : 1
  const maxGenrePlays = data ? Math.max(...data.byGenre.map(g => g.plays), 1) : 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-bold">Аналитика</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Статистика прослушиваний и активности</p>
        </div>
        {/* Period tabs */}
        <div className="flex gap-1 bg-surface-2 rounded-lg p-1 border border-border-default">
          {PERIODS.map(p => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${days === p.days ? 'bg-accent/20 text-accent font-medium' : 'text-zinc-400 hover:text-white'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map(i => <div key={i} className="bg-surface border border-border-default rounded-xl p-5 h-24 animate-pulse" />)}
        </div>
      )}

      {isError && (
        <div className="bg-surface border border-border-default rounded-xl p-8 text-center text-zinc-500">
          Нет данных о прослушиваниях за выбранный период
        </div>
      )}

      {data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface border border-border-default rounded-xl p-5">
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Всего прослушиваний</p>
              <p className="text-white text-2xl font-bold">{data.totalPlays.toLocaleString()}</p>
            </div>
            <div className="bg-surface border border-border-default rounded-xl p-5">
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Уникальных треков</p>
              <p className="text-white text-2xl font-bold">{data.uniqueTracksPlayed.toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top tracks table */}
            <div className="bg-surface border border-border-default rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border-default">
                <h2 className="text-white font-semibold">Топ треков</h2>
              </div>
              <div className="divide-y divide-border-default">
                {data.topTracks.map((track, i) => (
                  <div key={track.trackId} className="px-5 py-3 flex items-center gap-3">
                    <span className="text-zinc-600 text-xs w-5 text-right tabular-nums">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{track.title}</p>
                      <p className="text-zinc-500 text-xs">{track.genre ?? '—'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-20 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full"
                          style={{ width: `${(track.plays / maxPlays) * 100}%` }}
                        />
                      </div>
                      <span className="text-zinc-400 text-xs tabular-nums w-8 text-right">{track.plays}</span>
                    </div>
                  </div>
                ))}
                {data.topTracks.length === 0 && (
                  <div className="px-5 py-8 text-center text-zinc-500 text-sm">Нет данных</div>
                )}
              </div>
            </div>

            {/* By genre */}
            <div className="bg-surface border border-border-default rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border-default">
                <h2 className="text-white font-semibold">По жанрам</h2>
              </div>
              <div className="divide-y divide-border-default">
                {data.byGenre.map(item => (
                  <div key={item.genre} className="px-5 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{item.genre}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-24 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent/70 rounded-full"
                          style={{ width: `${(item.plays / maxGenrePlays) * 100}%` }}
                        />
                      </div>
                      <span className="text-zinc-400 text-xs tabular-nums w-8 text-right">{item.plays}</span>
                    </div>
                  </div>
                ))}
                {data.byGenre.length === 0 && (
                  <div className="px-5 py-8 text-center text-zinc-500 text-sm">Нет данных</div>
                )}
              </div>
            </div>
          </div>

          {/* Recent days */}
          {data.recentDays.length > 0 && (
            <div className="bg-surface border border-border-default rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border-default">
                <h2 className="text-white font-semibold">По дням</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-default bg-surface-2/50">
                      <th className="px-5 py-2.5 text-left text-zinc-500 text-xs uppercase tracking-wider">Дата</th>
                      <th className="px-5 py-2.5 text-left text-zinc-500 text-xs uppercase tracking-wider">Прослушиваний</th>
                      <th className="px-5 py-2.5 text-left text-zinc-500 text-xs uppercase tracking-wider w-48">График</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentDays.map(d => {
                      const maxDay = Math.max(...data.recentDays.map(x => x.plays), 1)
                      return (
                        <tr key={d.date} className="border-b border-border-default">
                          <td className="px-5 py-2.5 text-zinc-300 text-sm tabular-nums">{d.date}</td>
                          <td className="px-5 py-2.5 text-white font-medium tabular-nums">{d.plays}</td>
                          <td className="px-5 py-2.5">
                            <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                              <div className="h-full bg-accent/50 rounded-full" style={{ width: `${(d.plays / maxDay) * 100}%` }} />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
