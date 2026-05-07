export function useWeatherState(condition: string, tempF: number) {
  const hour = new Date().getHours()
  const isNight = hour < 6 || hour >= 20
  const isDawn = hour >= 5 && hour < 8
  const isDusk = hour >= 18 && hour < 20

  const condLower = condition.toLowerCase()
  const isRain = condLower.includes('rain') || condLower.includes('drizzle') || condLower.includes('shower')
  const isSnow = condLower.includes('snow') || condLower.includes('blizzard') || condLower.includes('sleet')
  const isClear = condLower.includes('clear') || condLower.includes('sunny')
  const isCloud = condLower.includes('cloud') || condLower.includes('overcast')

  return { isNight, isDawn, isDusk, isRain, isSnow, isClear, isCloud, tempF }
}
