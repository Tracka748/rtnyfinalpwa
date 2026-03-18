export type WeatherData = {
  temp: string
  description: string
  emoji: string
}

export async function getRochesterWeather(): Promise<WeatherData | null> {
  try {
    const res = await fetch('https://wttr.in/Rochester+NY?format=j1')
    const data = await res.json()
    return {
      temp: data.current_condition[0].temp_F + '°F',
      description: data.current_condition[0].weatherDesc[0].value,
      emoji: getWeatherEmoji(data.current_condition[0].weatherCode),
    }
  } catch {
    return null
  }
}

function getWeatherEmoji(code: string): string {
  const n = parseInt(code)
  if (n === 113) return '☀️'
  if (n <= 119) return '⛅'
  if (n <= 143) return '🌫️'
  if (n <= 176) return '🌦️'
  if (n <= 260) return '🌧️'
  if (n <= 350) return '🌨️'
  if (n <= 395) return '❄️'
  return '🌤️'
}
