import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, FlatList,
  RefreshControl, Modal,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../constants/Theme';
import { agroAPI, CropPlan, DayEntry, TaskItem } from '../services/agroAI';
import { useLanguage } from '../context/LanguageContext';

const C = Theme.Colors;

// ── Task priority colours ─────────────────────────────────────────
const PRIORITY_COLOR: Record<string, string> = {
  critical: C.error,
  high: C.warning,
  medium: C.primary,
  low: C.textSecondary,
};

const PRIORITY_BG: Record<string, string> = {
  critical: '#FEF2F2',
  high: '#FFFBEB',
  medium: C.primaryLight,
  low: '#F1F5F9',
};

// ── Task type icons ───────────────────────────────────────────────
const TYPE_ICON: Record<string, string> = {
  irrigation: 'water',
  monitoring: 'magnify-scan',
  crop_management: 'sprout',
  weather_alert: 'weather-lightning',
  stage_milestone: 'flag',
};

// ── Status icons ──────────────────────────────────────────────────
const STATUS_ICON: Record<string, string> = {
  pending: 'circle-outline',
  completed: 'check-circle',
  skipped: 'close-circle-outline',
  postponed: 'clock-outline',
};
const STATUS_COLOR: Record<string, string> = {
  pending: C.textMuted,
  completed: C.success,
  skipped: C.error,
  postponed: C.warning,
};

// ── Task Card ─────────────────────────────────────────────────────
// ── Task Card ─────────────────────────────────────────────────────
function TaskCard({
  task, isHi, onStatusChange
}: {
  task: TaskItem;
  isHi: boolean;
  onStatusChange: (taskId: string, status: 'completed' | 'skipped' | 'postponed' | 'pending', rescheduleReason?: 'skip' | 'rain' | 'user') => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isDone = task.completionStatus === 'completed';
  const bg = PRIORITY_BG[task.priority] || C.primaryLight;
  const color = PRIORITY_COLOR[task.priority] || C.primary;
  const icon = TYPE_ICON[task.type] || 'circle';

  return (
    <View style={[tCard.container, { borderLeftColor: color, opacity: isDone ? 0.7 : 1 }]}>
      <TouchableOpacity onPress={() => setExpanded(e => !e)} activeOpacity={0.85}>
        <View style={tCard.header}>
          <View style={[tCard.iconBox, { backgroundColor: bg }]}>
            <MaterialCommunityIcons name={icon as any} size={18} color={color} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[tCard.title, isDone && tCard.titleDone]}>
              {isHi && task.titleHi ? task.titleHi : task.title}
            </Text>
            {Boolean(task.dataType) && (
              <Text style={tCard.dataType}>{task.dataType}</Text>
            )}
            {/* Rescheduled indicators */}
            {Boolean(task.rescheduledFromDay) && (
              <View style={tCard.rescheduledBadge}>
                <MaterialCommunityIcons name="update" size={12} color="#D97706" />
                <Text style={tCard.rescheduledBadgeText}>
                  {isHi ? `दिन ${task.rescheduledFromDay} से रीशेड्यूल` : `From Day ${task.rescheduledFromDay}`}
                </Text>
              </View>
            )}
            {Boolean(task.rescheduledToDay) && (
              <View style={tCard.rescheduledToBadge}>
                <MaterialCommunityIcons name="arrow-right-circle" size={12} color="#2563EB" />
                <Text style={tCard.rescheduledToBadgeText}>
                  {isHi ? `दिन ${task.rescheduledToDay} को स्थानांतरित` : `Moved to Day ${task.rescheduledToDay}`}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={tCard.statusBtn}
            onPress={() => onStatusChange(
              task.id,
              task.completionStatus === 'completed' ? 'pending' : 'completed'
            )}
          >
            <MaterialCommunityIcons
              name={STATUS_ICON[task.completionStatus] as any}
              size={24}
              color={STATUS_COLOR[task.completionStatus]}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={tCard.body}>
          <Text style={tCard.action}>{task.action}</Text>
          {Boolean(task.reason && task.reason !== task.action) && (
            <Text style={tCard.reason}>💡 {task.reason}</Text>
          )}
          {Boolean(task.isForecastDriven) && (
            <View style={tCard.forecastTag}>
              <MaterialCommunityIcons name="weather-partly-cloudy" size={12} color={C.weatherBlue} />
              <Text style={tCard.forecastTagText}>{isHi ? 'मौसम पूर्वानुमान आधारित' : 'Weather forecast–driven'}</Text>
            </View>
          )}
          {Boolean(task.source) && (
            <Text style={tCard.source}>Source: {task.source}</Text>
          )}

          {/* Quick Rain Reschedule button for Irrigation tasks */}
          {task.type === 'irrigation' && task.completionStatus !== 'completed' && (
            <TouchableOpacity
              style={tCard.rainBtn}
              onPress={() => onStatusChange(task.id, 'postponed', 'rain')}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="weather-pouring" size={16} color="#0284C7" />
              <Text style={tCard.rainBtnText}>
                {isHi ? '🌧️ बारिश हुई? सिंचाई टालें (मौसम अनुसार)' : '🌧️ Rain occurred? Reschedule for dry day'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Action Status Row */}
          <View style={tCard.statusRow}>
            <TouchableOpacity
              style={[tCard.statusChip, task.completionStatus === 'completed' && { borderColor: STATUS_COLOR['completed'], backgroundColor: STATUS_COLOR['completed'] + '22' }]}
              onPress={() => onStatusChange(task.id, 'completed')}
            >
              <Text style={[tCard.statusChipText, task.completionStatus === 'completed' && { color: STATUS_COLOR['completed'], fontWeight: '700' }]}>
                {isHi ? '✓ पूरा हुआ' : 'Done'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[tCard.statusChip, task.completionStatus === 'skipped' && { borderColor: STATUS_COLOR['skipped'], backgroundColor: STATUS_COLOR['skipped'] + '22' }]}
              onPress={() => onStatusChange(task.id, 'skipped', 'skip')}
            >
              <Text style={[tCard.statusChipText, task.completionStatus === 'skipped' && { color: STATUS_COLOR['skipped'], fontWeight: '700' }]}>
                {isHi ? '⏭️ छोड़ें (कल होगा)' : 'Skip (Next Day)'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[tCard.statusChip, task.completionStatus === 'postponed' && { borderColor: STATUS_COLOR['postponed'], backgroundColor: STATUS_COLOR['postponed'] + '22' }]}
              onPress={() => onStatusChange(task.id, 'postponed')}
            >
              <Text style={[tCard.statusChipText, task.completionStatus === 'postponed' && { color: STATUS_COLOR['postponed'], fontWeight: '700' }]}>
                {isHi ? 'स्थगित' : 'Postponed'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[tCard.statusChip, task.completionStatus === 'pending' && { borderColor: STATUS_COLOR['pending'], backgroundColor: STATUS_COLOR['pending'] + '22' }]}
              onPress={() => onStatusChange(task.id, 'pending')}
            >
              <Text style={[tCard.statusChipText, task.completionStatus === 'pending' && { color: STATUS_COLOR['pending'], fontWeight: '700' }]}>
                {isHi ? 'लंबित' : 'Pending'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
const tCard = StyleSheet.create({
  container: {
    backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    borderLeftWidth: 4, marginBottom: 8, overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  iconBox: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 13, fontWeight: '600', color: C.text },
  titleDone: { textDecorationLine: 'line-through', color: C.textMuted },
  dataType: { fontSize: 10, color: C.textMuted, marginTop: 2 },
  statusBtn: { paddingLeft: 8 },
  rescheduledBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6, alignSelf: 'flex-start', marginTop: 4,
  },
  rescheduledBadgeText: { fontSize: 10, color: '#B45309', fontWeight: '600' },
  rescheduledToBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6, alignSelf: 'flex-start', marginTop: 4,
  },
  rescheduledToBadgeText: { fontSize: 10, color: '#1D4ED8', fontWeight: '600' },
  body: { padding: 12, paddingTop: 0, borderTopWidth: 1, borderTopColor: C.border },
  action: { fontSize: 12, color: C.text, lineHeight: 17, marginBottom: 6 },
  reason: { fontSize: 12, color: C.textSecondary, lineHeight: 16, marginBottom: 6 },
  forecastTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EFF6FF', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start', marginBottom: 6,
  },
  forecastTagText: { fontSize: 10, color: C.weatherBlue, fontWeight: '600' },
  source: { fontSize: 10, color: C.textMuted, fontStyle: 'italic', marginBottom: 8 },
  rainBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E0F2FE', borderColor: '#7DD3FC', borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    marginBottom: 10, alignSelf: 'flex-start',
  },
  rainBtnText: { fontSize: 11, color: '#0369A1', fontWeight: '600' },
  statusRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  statusChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    borderWidth: 1, borderColor: C.border,
  },
  statusChipText: { fontSize: 11, color: C.textSecondary },
});

// ── Day Card ──────────────────────────────────────────────────────
function DayCard({
  day, isHi, onTaskStatusChange, isToday
}: {
  day: DayEntry;
  isHi: boolean;
  onTaskStatusChange: (dayNum: number, taskId: string, status: any, rescheduleReason?: 'skip' | 'rain' | 'user') => void;
  isToday: boolean;
}) {
  const [expanded, setExpanded] = useState(isToday);
  const completedCount = day.tasks.filter(t => t.completionStatus === 'completed').length;
  const totalTasks = day.tasks.length;
  const allDone = totalTasks > 0 && completedCount === totalTasks;

  const stageColor = day.stage?.includes('Germination') || day.stage?.includes('Sowing') ? '#10B981'
    : day.stage?.includes('Harvest') ? '#F59E0B' : C.primary;

  return (
    <View style={[dCard.container, isToday && dCard.todayContainer]}>
      <TouchableOpacity onPress={() => setExpanded(e => !e)} activeOpacity={0.85}>
        <View style={dCard.header}>
          <View style={[dCard.dayBadge, isToday && { backgroundColor: C.primary }]}>
            <Text style={[dCard.dayNum, isToday && { color: '#FFF' }]}>D{day.dayNumber}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={dCard.dateLabel}>{day.dateLabel}</Text>
            <Text style={[dCard.stage, { color: stageColor }]}>{day.stage}</Text>
          </View>
          {totalTasks > 0 && (
            <View style={dCard.taskCount}>
              <MaterialCommunityIcons
                name={allDone ? 'check-circle' : 'circle-outline'}
                size={16}
                color={allDone ? C.success : C.textMuted}
              />
              <Text style={[dCard.taskCountText, allDone && { color: C.success }]}>
                {completedCount}/{totalTasks}
              </Text>
            </View>
          )}
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18} color={C.textSecondary}
            style={{ marginLeft: 6 }}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={dCard.body}>
          {/* Weather context */}
          {day.weatherContext && (
            <View style={[dCard.weatherCtx,
              day.weatherContext.dataType === 'Historical climate estimate' && dCard.weatherCtxEstimate]}>
              <MaterialCommunityIcons
                name={day.weatherContext.dataType?.includes('Observed') ? 'weather-partly-cloudy'
                  : day.weatherContext.dataType?.includes('forecast') ? 'weather-cloudy-alert'
                  : 'cloud-question'}
                size={14}
                color={day.weatherContext.dataType?.includes('estimate') ? C.warning : C.weatherBlue}
              />
              <Text style={dCard.weatherCtxText}>
                {day.weatherContext.dataType}
                {day.weatherContext.temperature ? `: ${day.weatherContext.temperature}°C` : ''}
                {day.weatherContext.rainProbability ? `, ${day.weatherContext.rainProbability}% rain` : ''}
              </Text>
            </View>
          )}

          {/* Tasks */}
          {day.tasks.length === 0 ? (
            <Text style={dCard.noTasks}>
              {isHi ? 'इस दिन के लिए कोई विशेष कार्य नहीं' : 'No specific tasks for this day'}
            </Text>
          ) : (
            day.tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                isHi={isHi}
                onStatusChange={(taskId, status, reason) => onTaskStatusChange(day.dayNumber, taskId, status, reason)}
              />
            ))
          )}
        </View>
      )}
    </View>
  );
}
const dCard = StyleSheet.create({
  container: {
    backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, marginBottom: 10,
  },
  todayContainer: { borderColor: C.primary, borderWidth: 2 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  dayBadge: {
    width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.primaryLight,
  },
  dayNum: { fontSize: 11, fontWeight: '800', color: C.primary },
  dateLabel: { fontSize: 13, fontWeight: '600', color: C.text },
  stage: { fontSize: 11, marginTop: 2 },
  taskCount: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  taskCountText: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  body: { padding: 12, paddingTop: 0, borderTopWidth: 1, borderTopColor: C.border },
  weatherCtx: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#EFF6FF', borderRadius: 8, padding: 8, marginBottom: 10,
  },
  weatherCtxEstimate: { backgroundColor: '#FFFBEB' },
  weatherCtxText: { fontSize: 11, color: C.text, flex: 1 },
  noTasks: { fontSize: 12, color: C.textMuted, fontStyle: 'italic', paddingVertical: 8 },
});

// ── View Mode Toggle ──────────────────────────────────────────────
type ViewMode = 'today' | 'week' | 'stage' | 'all';

// ── Main Screen ───────────────────────────────────────────────────
export default function AgroPlanDetail() {
  const { language } = useLanguage();
  const isHi = language === 'hi';
  const { planId } = useLocalSearchParams();

  const [plan, setPlan] = useState<CropPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [refreshingWeather, setRefreshingWeather] = useState(false);
  const [reschedulingWeather, setReschedulingWeather] = useState(false);

  const loadPlan = useCallback(async () => {
    if (!planId) return;
    try {
      const res = await agroAPI.getPlan(planId as string);
      setPlan(res.plan);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load plan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [planId]);

  useEffect(() => { loadPlan(); }, [loadPlan]);

  const handleRefreshWeather = async () => {
    if (!plan) return;
    setRefreshingWeather(true);
    try {
      const res = await agroAPI.refreshWeather(plan._id);
      setPlan(res.plan);
      Alert.alert(
        isHi ? 'मौसम अपडेट हुआ ✓' : 'Weather Refreshed ✓',
        isHi
          ? `भविष्य के कार्य अपडेट हो गए हैं। पूर्ण किए गए कार्य सुरक्षित हैं।\n${res.weatherSummary?.isLive ? 'लाइव मौसम डेटा' : '⚠️ ऐतिहासिक अनुमान'}`
          : `Future tasks updated. Completed tasks preserved.\n${res.weatherSummary?.isLive ? 'Live weather data used' : '⚠️ Historical estimate (live unavailable)'}`,
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to refresh weather');
    } finally {
      setRefreshingWeather(false);
    }
  };

  const handleAutoRescheduleWeather = async () => {
    if (!plan) return;
    setReschedulingWeather(true);
    try {
      const res = await agroAPI.autoRescheduleWeather(plan._id);
      if (res.plan) {
        setPlan(res.plan);
      }
      Alert.alert(
        isHi ? 'मौसम अनुसार रीशेड्यूल' : 'Weather Reschedule',
        res.message || (isHi ? 'मौसम के अनुसार योजना जाँची गई।' : 'Plan updated with live weather forecast.')
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to auto-reschedule');
    } finally {
      setReschedulingWeather(false);
    }
  };

  const handleTaskStatusChange = async (
    dayNum: number,
    taskId: string,
    status: any,
    rescheduleReason?: 'skip' | 'rain' | 'user'
  ) => {
    if (!plan) return;
    try {
      const res = await agroAPI.updateTaskStatus(plan._id, dayNum, taskId, status, undefined, rescheduleReason);
      if (res.plan) {
        setPlan(res.plan);
      } else {
        // Fallback optimistic update
        setPlan(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            dailyTasks: prev.dailyTasks.map(d => {
              if (d.dayNumber !== dayNum) return d;
              return {
                ...d,
                tasks: d.tasks.map(t => {
                  if (t.id !== taskId) return t;
                  return { ...t, completionStatus: status, completedAt: status === 'completed' ? new Date().toISOString() : null };
                }),
              };
            }),
          };
        });
      }

      if (res.rescheduledToDay) {
        Alert.alert(
          isHi ? 'कार्य रीशेड्यूल हुआ ✓' : 'Task Rescheduled ✓',
          res.message || (isHi
            ? `यह कार्य दिन ${res.rescheduledToDay} के लिए रीशेड्यूल कर दिया गया है।`
            : `This task has been rescheduled to Day ${res.rescheduledToDay}.`)
        );
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not update task');
    }
  };

  // Compute today's day number
  const todayDayNum = plan ? Math.max(1, Math.min(90,
    Math.floor((new Date().getTime() - new Date(plan.sowingDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
  )) : 1;

  // Filter days based on view mode
  const filteredDays = plan ? plan.dailyTasks.filter(d => {
    if (viewMode === 'today') return d.dayNumber === todayDayNum || d.dayNumber === todayDayNum - 1 || d.dayNumber === todayDayNum + 1;
    if (viewMode === 'week') return d.dayNumber >= todayDayNum - 1 && d.dayNumber <= todayDayNum + 7;
    if (viewMode === 'stage') {
      const currentDay = plan.dailyTasks.find(x => x.dayNumber === todayDayNum);
      return currentDay ? d.stage === currentDay.stage : true;
    }
    return true; // 'all'
  }) : [];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>{isHi ? 'योजना लोड हो रही है...' : 'Loading your plan...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!plan) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={C.error} />
          <Text style={styles.loadingText}>{isHi ? 'योजना नहीं मिली' : 'Plan not found'}</Text>
          <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/agro-ai'))}>
            <Text style={{ color: C.primary, marginTop: 12 }}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentStage = plan.dailyTasks.find(d => d.dayNumber === todayDayNum)?.stage || '';
  const completedDays = plan.dailyTasks.filter(d => d.completionStatus === 'completed').length;
  const progressPct = Math.round((completedDays / 90) * 100);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => (router.canGoBack() ? router.back() : router.replace('/agro-ai'))}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{plan.nameEn} · {plan.nameHi}</Text>
          <Text style={styles.headerSub}>
            {isHi ? 'बुआई:' : 'Sown:'} {new Date(plan.sowingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            {' · '}{isHi ? 'आज दिन' : 'Day'} {todayDayNum}/90
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={handleRefreshWeather}
          disabled={refreshingWeather}
        >
          {refreshingWeather
            ? <ActivityIndicator size="small" color={C.primary} />
            : <MaterialCommunityIcons name="weather-cloudy-arrow-right" size={22} color={C.primary} />
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPlan(); }} />}
      >
        {/* Suitability warning banner */}
        {(plan.isUnsuitable || plan.isRisky) && (
          <View style={[styles.warningBanner, plan.isUnsuitable && styles.unsuitableBanner]}>
            <MaterialCommunityIcons
              name={plan.isUnsuitable ? 'alert-circle' : 'alert'}
              size={18} color={plan.isUnsuitable ? C.error : C.warning}
            />
            <Text style={[styles.warningText, plan.isUnsuitable && { color: C.error }]}>
              {plan.isUnsuitable
                ? (isHi ? '⚠️ यह फसल आपकी स्थितियों के लिए उपयुक्त नहीं थी। योजना केवल संदर्भ के लिए है।' : '⚠️ This crop was flagged as unsuitable for your conditions. Plan is for reference only.')
                : (isHi ? '⚠️ इस फसल में कुछ जोखिम हैं। सावधानी से आगे बढ़ें।' : '⚠️ This crop has noted risks for your conditions. Proceed with caution.')}
            </Text>
          </View>
        )}

        {/* Season Plan Banner */}
        <View style={[
          styles.planSeasonBadge,
          {
            backgroundColor: plan.cropSeason === 'Rabi' ? '#EFF6FF' : '#ECFDF5',
            borderColor: plan.cropSeason === 'Rabi' ? '#93C5FD' : '#86EFAC',
          }
        ]}>
          <MaterialCommunityIcons
            name={plan.cropSeason === 'Rabi' ? 'snowflake' : 'weather-pouring'}
            size={20}
            color={plan.cropSeason === 'Rabi' ? '#2563EB' : '#059669'}
          />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.planSeasonTitle, { color: plan.cropSeason === 'Rabi' ? '#1D4ED8' : '#047857' }]}>
              {plan.cropSeason === 'Rabi'
                ? (isHi ? '❄️ रबी 90-दिन फसल कैलेंडर' : '❄️ Rabi 90-Day Seasonal Plan')
                : (isHi ? '🌾 खरीफ 90-दिन फसल कैलेंडर' : '🌾 Kharif 90-Day Seasonal Plan')}
            </Text>
            <Text style={styles.planSeasonDesc}>
              {plan.cropSeason === 'Rabi'
                ? (isHi ? 'शीतकालीन नमी प्रबंधन, पाला सुरक्षा एवं ओस रोग निगरानी' : 'Winter nodal irrigation, frost guard & morning dew blight monitoring')
                : (isHi ? 'मानसून जल निकासी, जलजमाव रोकथाम एवं आर्द्रता कीट नियंत्रण' : 'Monsoon drainage, waterlogging guard & humidity disease management')}
            </Text>
          </View>
          {Boolean(plan.mlConfidence && plan.mlConfidence > 0) ? (
            <View style={styles.planMlBadge}>
              <Text style={styles.planMlText}>{plan.mlConfidence?.toFixed(0)}% AI</Text>
            </View>
          ) : null}
        </View>

        {/* Progress overview */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>
              {isHi ? 'फसल प्रगति' : 'Crop Progress'}
            </Text>
            <Text style={styles.progressDays}>
              {isHi ? `${todayDayNum}/90 दिन` : `Day ${todayDayNum} of 90`}
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.round((todayDayNum / 90) * 100)}%` as any }]} />
          </View>
          <Text style={styles.progressStage}>
            {isHi ? 'वर्तमान अवस्था:' : 'Current Stage:'} <Text style={{ fontWeight: '700', color: C.primary }}>{currentStage}</Text>
          </Text>

          {/* Weather snapshot */}
          {plan.weatherSnapshot && (
            <View style={styles.weatherSnap}>
              <MaterialCommunityIcons
                name={(plan.weatherSnapshot as any).isLive ? 'weather-partly-cloudy' : 'cloud-question'}
                size={14}
                color={(plan.weatherSnapshot as any).isLive ? C.weatherBlue : C.warning}
              />
              <Text style={styles.weatherSnapText}>
                {(plan.weatherSnapshot as any).isLive ? 'Live' : '⚠️ Estimate'}: {(plan.weatherSnapshot as any).temperature?.toFixed(0)}°C · {(plan.weatherSnapshot as any).condition}
              </Text>
              {plan.weatherLastUpdated && (
                <Text style={styles.weatherSnapTime}>
                  {isHi ? 'अपडेट:' : 'Updated:'} {new Date(plan.weatherLastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Suitability score */}
        <View style={styles.scoreRow}>
          <View style={[styles.scorePill,
            { backgroundColor: plan.suitabilityScore >= 60 ? C.primaryLight : C.warningLight,
              borderColor: plan.suitabilityScore >= 60 ? C.primary : C.warning }]}>
            <Text style={[styles.scoreVal, { color: plan.suitabilityScore >= 60 ? C.primary : C.warning }]}>
              {plan.suitabilityScore}/100
            </Text>
            <Text style={[styles.scoreCat, { color: plan.suitabilityScore >= 60 ? C.primary : C.warning }]}>
              {plan.suitabilityCategory}
            </Text>
          </View>
          <Text style={styles.scoreDis}>
            {isHi
              ? 'यह स्कोर फसल की दस्तावेजी आवश्यकताओं और आपकी खेत की स्थितियों की अनुकूलता दर्शाता है — यह हार्वेस्ट की सफलता की संभावना नहीं है।'
              : 'Score reflects documented crop–farm condition compatibility — not a harvest success probability.'}
          </Text>
        </View>

        {/* Live Weather Auto-Reschedule Action Banner */}
        <TouchableOpacity
          style={styles.weatherRescheduleBanner}
          onPress={handleAutoRescheduleWeather}
          disabled={reschedulingWeather}
          activeOpacity={0.8}
        >
          <View style={styles.weatherRescheduleIcon}>
            {reschedulingWeather ? (
              <ActivityIndicator size="small" color="#0284C7" />
            ) : (
              <MaterialCommunityIcons name="weather-cloudy-clock" size={24} color="#0284C7" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.weatherRescheduleTitle}>
              {isHi ? '🌦️ मौसम अनुसार सिंचाई रीशेड्यूल करें' : '🌦️ Live Weather Auto-Reschedule'}
            </Text>
            <Text style={styles.weatherRescheduleSub}>
              {isHi
                ? 'यदि आने वाले दिनों में बारिश है, तो सिंचाई अपने आप अगले शुष्क दिन पर स्थानांतरित हो जाएगी।'
                : 'If rain is forecast in upcoming days, irrigation automatically shifts to the next dry day.'}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#0284C7" />
        </TouchableOpacity>

        {/* View Mode Tabs */}
        <View style={styles.tabRow}>
          {(['today', 'week', 'stage', 'all'] as ViewMode[]).map(mode => (
            <TouchableOpacity
              key={mode}
              style={[styles.tab, viewMode === mode && styles.tabActive]}
              onPress={() => setViewMode(mode)}
            >
              <Text style={[styles.tabText, viewMode === mode && styles.tabTextActive]}>
                {mode === 'today' ? (isHi ? 'आज' : 'Today')
                  : mode === 'week' ? (isHi ? 'सप्ताह' : 'Week')
                  : mode === 'stage' ? (isHi ? 'अवस्था' : 'Stage')
                  : (isHi ? 'सभी' : 'All 90')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Days list */}
        {filteredDays.map(day => (
          <DayCard
            key={day.dayNumber}
            day={day}
            isHi={isHi}
            onTaskStatusChange={handleTaskStatusChange}
            isToday={day.dayNumber === todayDayNum}
          />
        ))}

        {filteredDays.length === 0 && (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="calendar-blank" size={40} color={C.textMuted} />
            <Text style={styles.emptyText}>
              {isHi ? 'इस अवधि के लिए कोई दिन नहीं मिला' : 'No days found for this period'}
            </Text>
          </View>
        )}

        {/* Data source note */}
        <View style={styles.sourceBox}>
          <MaterialCommunityIcons name="information-outline" size={14} color={C.textMuted} />
          <Text style={styles.sourceText}>
            {isHi
              ? 'कार्य UK कृषि विभाग, ICAR, और FAO के दिशानिर्देशों पर आधारित हैं। मौसम पूर्वानुमान Open-Meteo से है। 7 दिनों से परे मौसम अनुमान (historical) है।'
              : 'Tasks are based on UK Agriculture Dept, ICAR & FAO guidelines. Weather forecast from Open-Meteo. Beyond 7 days: historical climate estimates are used and labelled.'}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: C.textSecondary },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.primaryLight, marginRight: 10,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  headerSub: { fontSize: 11, color: C.textSecondary },
  refreshBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.primaryLight,
  },

  scroll: { padding: 16, paddingBottom: 60 },

  warningBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFFBEB', borderRadius: 10, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  unsuitableBanner: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  warningText: { flex: 1, fontSize: 12, color: C.warning, lineHeight: 16 },

  planSeasonBadge: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5,
    padding: 12, marginBottom: 12,
  },
  planSeasonTitle: { fontSize: 13, fontWeight: '700' },
  planSeasonDesc: { fontSize: 11, color: C.textSecondary, marginTop: 2, lineHeight: 15 },
  planMlBadge: {
    backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: '#86EFAC', marginLeft: 8,
  },
  planMlText: { fontSize: 11, fontWeight: '800', color: '#059669' },

  progressCard: {
    backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border,
    padding: 14, marginBottom: 12,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  progressDays: { fontSize: 13, fontWeight: '700', color: C.primary },
  progressBarBg: { height: 8, borderRadius: 4, backgroundColor: C.border, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: 8, borderRadius: 4, backgroundColor: C.primary },
  progressStage: { fontSize: 12, color: C.textSecondary },

  weatherSnap: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F0FDF4', borderRadius: 8, padding: 8, marginTop: 10,
  },
  weatherSnapText: { flex: 1, fontSize: 11, color: C.text },
  weatherSnapTime: { fontSize: 10, color: C.textMuted },

  scoreRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginBottom: 14,
  },
  scorePill: {
    borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, minWidth: 72,
  },
  scoreVal: { fontSize: 18, fontWeight: '800' },
  scoreCat: { fontSize: 9, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  scoreDis: { flex: 1, fontSize: 10, color: C.textMuted, fontStyle: 'italic', lineHeight: 14 },

  tabRow: {
    flexDirection: 'row', gap: 8, marginBottom: 14,
  },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: 'center',
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
  },
  tabActive: { backgroundColor: C.primary, borderColor: C.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  tabTextActive: { color: '#FFFFFF' },

  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: C.textMuted, marginTop: 10 },

  sourceBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#F8FAF8', borderRadius: 10, padding: 10, marginTop: 16,
    borderWidth: 1, borderColor: C.border,
  },
  sourceText: { flex: 1, fontSize: 10, color: C.textMuted, lineHeight: 14 },

  weatherRescheduleBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F0F9FF', borderRadius: 14, borderWidth: 1.5, borderColor: '#BAE6FD',
    padding: 12, marginBottom: 14,
  },
  weatherRescheduleIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#E0F2FE',
    alignItems: 'center', justifyContent: 'center',
  },
  weatherRescheduleTitle: { fontSize: 13, fontWeight: '700', color: '#0369A1' },
  weatherRescheduleSub: { fontSize: 11, color: '#0284C7', marginTop: 2, lineHeight: 15 },
});
