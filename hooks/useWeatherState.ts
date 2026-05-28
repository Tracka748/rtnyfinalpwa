export function useWeatherState(condition: string, tempF: number) {
  const now = new Date()
  const hour = now.getHours()
  const minute = now.getMinutes()
  const isNight = hour < 6 || hour >= 20
  const isDawn = hour >= 5 && hour < 8
  const isDusk = hour >= 18 && hour < 20
  // Day background: 8:00am until 8:30pm
  const isDayBackground = hour >= 8 && (hour < 20 || (hour === 20 && minute < 30))

  const condLower = condition.toLowerCase()
  const isRain = condLower.includes('rain') || condLower.includes('drizzle') || condLower.includes('shower')
  const isSnow = condLower.includes('snow') || condLower.includes('blizzard') || condLower.includes('sleet')
  const isClear = condLower.includes('clear') || condLower.includes('sunny')
  const isCloud = condLower.includes('cloud') || condLower.includes('overcast')

  return { isNight, isDawn, isDusk, isRain, isSnow, isClear, isCloud, isDayBackground, tempF }
}
