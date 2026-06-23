import type { MetricDef, Aggregation, ChartKind } from '@/types/health'

// Health Auto Export metric name → normalized metric_type.
// Anything not listed here passes through under its own (snake_case) name so
// all 100+ exported metrics still land in the DB.
export const NAME_MAP: Record<string, string> = {
  step_count: 'steps',
  heart_rate: 'heart_rate',
  resting_heart_rate: 'resting_heart_rate',
  walking_heart_rate_average: 'walking_heart_rate',
  heart_rate_variability_sdnn: 'hrv',
  heart_rate_variability: 'hrv',
  active_energy_burned: 'active_calories',
  active_energy: 'active_calories',
  basal_energy_burned: 'resting_calories',
  apple_exercise_time: 'exercise_minutes',
  apple_stand_time: 'stand_minutes',
  apple_stand_hour: 'stand_hours',
  sleep_analysis: 'sleep_duration',
  respiratory_rate: 'respiratory_rate',
  blood_oxygen_saturation: 'spo2',
  oxygen_saturation: 'spo2',
  distance_walking_running: 'distance',
  distance_cycling: 'distance_cycling',
  flights_climbed: 'flights_climbed',
  vo2_max: 'vo2max',
  body_mass: 'weight',
  weight_body_mass: 'weight',
  body_fat_percentage: 'body_fat',
  body_mass_index: 'bmi',
  walking_speed: 'walking_speed',
  walking_step_length: 'step_length',
  walking_asymmetry_percentage: 'walking_asymmetry',
  walking_double_support_percentage: 'double_support',
  six_minute_walking_test_distance: 'six_min_walk',
  stair_speed_up: 'stair_speed_up',
  stair_speed_down: 'stair_speed_down',
  environmental_audio_exposure: 'env_audio_exposure',
  headphone_audio_exposure: 'headphone_audio_exposure',
  blood_pressure_systolic: 'bp_systolic',
  blood_pressure_diastolic: 'bp_diastolic',
  blood_glucose: 'blood_glucose',
  dietary_water: 'water',
  dietary_energy: 'dietary_calories',
  mindful_minutes: 'mindful_minutes',
}

export function normalizeMetricName(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/\s+/g, '_')
  return NAME_MAP[key] ?? key
}

// Registry of known metrics with charting hints. Used by the dashboard's
// featured charts, the search bar, and the generic auto-chart. Metrics that
// arrive but aren't registered fall back to inferDef() below.
const DEFS: MetricDef[] = [
  // Movement
  def('steps', 'Steps', 'count', 'Movement', 'sum', 'bar'),
  def('distance', 'Walking + Running Distance', 'mi', 'Movement', 'sum', 'bar'),
  def('distance_cycling', 'Cycling Distance', 'mi', 'Movement', 'sum', 'bar'),
  def('flights_climbed', 'Flights Climbed', 'count', 'Movement', 'sum', 'bar'),
  def('exercise_minutes', 'Exercise Minutes', 'min', 'Movement', 'sum', 'bar'),
  def('stand_minutes', 'Stand Minutes', 'min', 'Movement', 'sum', 'bar'),
  def('stand_hours', 'Stand Hours', 'hr', 'Movement', 'sum', 'bar'),
  def('walking_speed', 'Walking Speed', 'mi/hr', 'Movement', 'avg', 'line'),
  def('step_length', 'Step Length', 'cm', 'Movement', 'avg', 'line'),
  def('walking_asymmetry', 'Walking Asymmetry', '%', 'Movement', 'avg', 'line'),
  def('double_support', 'Double Support', '%', 'Movement', 'avg', 'line'),
  def('six_min_walk', '6-Minute Walk Distance', 'm', 'Movement', 'last', 'line'),
  def('stair_speed_up', 'Stair Speed Up', 'ft/s', 'Movement', 'avg', 'line'),
  def('stair_speed_down', 'Stair Speed Down', 'ft/s', 'Movement', 'avg', 'line'),
  // Cardiac
  def('heart_rate', 'Heart Rate', 'bpm', 'Cardiac', 'avg', 'line'),
  def('resting_heart_rate', 'Resting Heart Rate', 'bpm', 'Cardiac', 'avg', 'line'),
  def('walking_heart_rate', 'Walking Heart Rate', 'bpm', 'Cardiac', 'avg', 'line'),
  def('hrv', 'Heart Rate Variability', 'ms', 'Recovery', 'avg', 'line'),
  def('vo2max', 'VO₂ Max', 'ml/kg/min', 'Cardiac', 'last', 'line'),
  def('bp_systolic', 'Blood Pressure (Systolic)', 'mmHg', 'Cardiac', 'avg', 'line'),
  def('bp_diastolic', 'Blood Pressure (Diastolic)', 'mmHg', 'Cardiac', 'avg', 'line'),
  // Energy
  def('active_calories', 'Active Calories', 'kcal', 'Energy', 'sum', 'bar'),
  def('resting_calories', 'Resting Calories', 'kcal', 'Energy', 'sum', 'bar'),
  def('dietary_calories', 'Dietary Calories', 'kcal', 'Energy', 'sum', 'bar'),
  // Rest
  def('sleep_duration', 'Sleep Duration', 'hr', 'Rest', 'sum', 'bar'),
  def('mindful_minutes', 'Mindful Minutes', 'min', 'Rest', 'sum', 'bar'),
  // Respiratory
  def('respiratory_rate', 'Respiratory Rate', 'br/min', 'Respiratory', 'avg', 'line'),
  def('spo2', 'Blood Oxygen', '%', 'Respiratory', 'avg', 'line'),
  // Body
  def('weight', 'Weight', 'lb', 'Body', 'last', 'line'),
  def('body_fat', 'Body Fat', '%', 'Body', 'last', 'line'),
  def('bmi', 'BMI', '', 'Body', 'last', 'line'),
  def('blood_glucose', 'Blood Glucose', 'mg/dL', 'Body', 'avg', 'line'),
  def('water', 'Water', 'fl oz', 'Body', 'sum', 'bar'),
  // Audio
  def('env_audio_exposure', 'Environmental Audio', 'dB', 'Audio', 'avg', 'line'),
  def('headphone_audio_exposure', 'Headphone Audio', 'dB', 'Audio', 'avg', 'line'),
]

export const METRIC_DEFS: Record<string, MetricDef> = Object.fromEntries(
  DEFS.map(d => [d.type, d])
)

// The 5 hero charts that get bespoke rendering on the dashboard.
export const FEATURED_METRICS = [
  'steps',
  'resting_heart_rate',
  'hrv',
  'sleep_duration',
  'active_calories',
] as const

export function getMetricDef(type: string): MetricDef {
  return METRIC_DEFS[type] ?? inferDef(type)
}

// Fallback for unregistered metrics: guess aggregation/chart from the name.
function inferDef(type: string): MetricDef {
  const countish = /count|steps|calorie|energy|distance|minutes|flights|water/.test(type)
  const aggregation: Aggregation = countish ? 'sum' : 'avg'
  const chart: ChartKind = countish ? 'bar' : 'line'
  return {
    type,
    label: titleCase(type),
    unit: '',
    category: 'Other',
    aggregation,
    chart,
  }
}

function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function def(
  type: string,
  label: string,
  unit: string,
  category: string,
  aggregation: Aggregation,
  chart: ChartKind
): MetricDef {
  return { type, label, unit, category, aggregation, chart }
}
