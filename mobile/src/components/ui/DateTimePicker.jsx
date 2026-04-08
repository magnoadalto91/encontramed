/**
 * DateTimePicker — custom modal calendar/time selector.
 * No native modules required — works in Expo Go.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_SEMANA = ['D','S','T','Q','Q','S','S'];

function pad(n) { return String(n).padStart(2,'0'); }

function formatDisplay(date) {
  if (!date) return '';
  return `${pad(date.getDate())}/${pad(date.getMonth()+1)}/${date.getFullYear()}  ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildCalendar(year, month) {
  // month: 0-11
  const firstDay = new Date(year, month, 1).getDay(); // 0=sun
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export default function DateTimePicker({ label, value, onChange, error, minDate }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value || new Date());
  const [selected, setSelected] = useState(value || null);
  const [hour, setHour] = useState(value ? value.getHours() : 8);
  const [minute, setMinute] = useState(value ? value.getMinutes() : 0);

  useEffect(() => {
    if (value) {
      setViewDate(value);
      setSelected(value);
      setHour(value.getHours());
      setMinute(value.getMinutes());
    }
  }, [value]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const cells = buildCalendar(year, month);
  const today = new Date();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const selectDay = (day) => {
    if (!day) return;
    const d = new Date(year, month, day, hour, minute);
    if (minDate && d < minDate) return;
    setSelected(d);
  };

  const changeHour = (delta) => {
    const h = ((hour + delta) + 24) % 24;
    setHour(h);
    if (selected) setSelected(new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), h, minute));
  };

  const changeMinute = (delta) => {
    const m = ((minute + delta) + 60) % 60;
    setMinute(m);
    if (selected) setSelected(new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), hour, m));
  };

  const confirm = () => {
    if (!selected) return;
    const final = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), hour, minute);
    onChange(final);
    setOpen(false);
  };

  const isSelected = (day) => {
    if (!day || !selected) return false;
    return selected.getDate() === day && selected.getMonth() === month && selected.getFullYear() === year;
  };

  const isDisabled = (day) => {
    if (!day || !minDate) return false;
    const d = new Date(year, month, day);
    return d < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
  };

  return (
    <>
      <View style={styles.fieldWrap}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity style={[styles.field, error && styles.fieldError]} onPress={() => setOpen(true)} activeOpacity={0.7}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.textMuted} style={{ marginRight: 8 }} />
          <Text style={[styles.fieldText, !value && styles.placeholder]}>
            {value ? formatDisplay(value) : 'DD/MM/AAAA  HH:MM'}
          </Text>
          <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} />
        </TouchableOpacity>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Month nav */}
            <View style={styles.monthRow}>
              <TouchableOpacity onPress={prevMonth} style={styles.monthBtn}>
                <Ionicons name="chevron-back" size={20} color={COLORS.accent} />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>{MESES[month]} {year}</Text>
              <TouchableOpacity onPress={nextMonth} style={styles.monthBtn}>
                <Ionicons name="chevron-forward" size={20} color={COLORS.accent} />
              </TouchableOpacity>
            </View>

            {/* Day headers */}
            <View style={styles.weekRow}>
              {DIAS_SEMANA.map((d, i) => (
                <Text key={i} style={styles.weekDay}>{d}</Text>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={styles.grid}>
              {cells.map((day, i) => {
                const sel = isSelected(day);
                const dis = isDisabled(day);
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.cell, sel && styles.cellSelected, !day && styles.cellEmpty]}
                    onPress={() => !dis && selectDay(day)}
                    activeOpacity={day && !dis ? 0.7 : 1}
                  >
                    <Text style={[styles.cellText, sel && styles.cellTextSelected, dis && styles.cellTextDisabled]}>
                      {day || ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Time selector */}
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={16} color={COLORS.textMuted} style={{ marginRight: 8 }} />
              <Text style={styles.timeLabel}>Horário:</Text>

              <View style={styles.timeUnit}>
                <TouchableOpacity onPress={() => changeHour(1)}><Ionicons name="chevron-up" size={16} color={COLORS.accent} /></TouchableOpacity>
                <Text style={styles.timeValue}>{pad(hour)}</Text>
                <TouchableOpacity onPress={() => changeHour(-1)}><Ionicons name="chevron-down" size={16} color={COLORS.accent} /></TouchableOpacity>
              </View>
              <Text style={styles.timeSep}>:</Text>
              <View style={styles.timeUnit}>
                <TouchableOpacity onPress={() => changeMinute(15)}><Ionicons name="chevron-up" size={16} color={COLORS.accent} /></TouchableOpacity>
                <Text style={styles.timeValue}>{pad(minute)}</Text>
                <TouchableOpacity onPress={() => changeMinute(-15)}><Ionicons name="chevron-down" size={16} color={COLORS.accent} /></TouchableOpacity>
              </View>
            </View>

            {/* Confirm */}
            <TouchableOpacity
              style={[styles.confirmBtn, !selected && styles.confirmDisabled]}
              onPress={confirm}
              activeOpacity={selected ? 0.8 : 1}
            >
              <Text style={styles.confirmText}>
                {selected ? `Confirmar — ${formatDisplay(new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), hour, minute))}` : 'Selecione uma data'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fieldWrap: { marginBottom: 16 },
  label: { color: '#C9D4E8', fontSize: 13, fontWeight: '500', marginBottom: 6 },
  field: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14, paddingVertical: 13,
  },
  fieldError: { borderColor: '#FF6B6B' },
  fieldText: { flex: 1, color: '#fff', fontSize: 15 },
  placeholder: { color: COLORS.textMuted },
  errorText: { color: '#FF6B6B', fontSize: 12, marginTop: 4 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#112240', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },

  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  monthBtn: { padding: 6 },
  monthLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },

  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekDay: { flex: 1, textAlign: 'center', color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  cell: { width: `${100/7}%`, aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  cellEmpty: {},
  cellSelected: { backgroundColor: COLORS.accent, borderRadius: 20 },
  cellText: { color: COLORS.textSecondary, fontSize: 14 },
  cellTextSelected: { color: '#0A1628', fontWeight: '700' },
  cellTextDisabled: { color: COLORS.border },

  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  timeLabel: { color: COLORS.textMuted, fontSize: 13, marginRight: 8 },
  timeUnit: { alignItems: 'center', gap: 2 },
  timeValue: { color: '#fff', fontSize: 22, fontWeight: '700', minWidth: 36, textAlign: 'center' },
  timeSep: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: -4 },

  confirmBtn: { backgroundColor: COLORS.accent, borderRadius: 12, padding: 16, alignItems: 'center' },
  confirmDisabled: { backgroundColor: COLORS.border },
  confirmText: { color: '#0A1628', fontSize: 15, fontWeight: '700' },
});
