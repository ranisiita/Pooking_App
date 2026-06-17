import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  Pressable, Platform, useWindowDimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadow } from '../constants/theme';

interface CalendarModalProps {
  visible: boolean;
  value: string; // YYYY-MM-DD
  onClose: () => void;
  onSelect: (date: string) => void;
  minDate?: string; // YYYY-MM-DD
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

export default function CalendarModal({
  visible,
  value,
  onClose,
  onSelect,
  minDate = new Date().toISOString().split('T')[0]
}: CalendarModalProps) {
  const { width } = useWindowDimensions();
  
  // Parse initial state date or fallback to today
  const initialDate = value ? new Date(value + 'T12:00:00') : new Date();
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth()); // 0-11

  // Handle month navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Generate days array
  const generateDays = () => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const days = [];
    
    // Day of week offset (0 = Sunday, 1 = Monday...)
    let startDayOfWeek = firstDayOfMonth.getDay();
    
    // Align so Monday is index 0, Sunday is index 6
    let offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    
    // Fill empty cells
    for (let i = 0; i < offset; i++) {
      days.push(null);
    }
    
    // Fill days of the month
    const dateTemp = new Date(currentYear, currentMonth, 1);
    while (dateTemp.getMonth() === currentMonth) {
      days.push(new Date(dateTemp));
      dateTemp.setDate(dateTemp.getDate() + 1);
    }
    
    return days;
  };

  const days = generateDays();

  const handleSelectDay = (day: Date) => {
    const y = day.getFullYear();
    const m = String(day.getMonth() + 1).padStart(2, '0');
    const d = String(day.getDate()).padStart(2, '0');
    const formatted = `${y}-${m}-${d}`;
    onSelect(formatted);
    onClose();
  };

  const isSelected = (day: Date) => {
    if (!value) return false;
    const [vy, vm, vd] = value.split('-').map(Number);
    return day.getFullYear() === vy && day.getMonth() === (vm - 1) && day.getDate() === vd;
  };

  const isPast = (day: Date) => {
    if (!minDate) return false;
    const [my, mm, md] = minDate.split('-').map(Number);
    const minD = new Date(my, mm - 1, md);
    
    // Compare dates ignoring time
    const dayCompare = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    return dayCompare < minD;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={[s.content, { width: width > 350 ? 300 : '92%', maxWidth: 320 }]}>
          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>Seleccionar Fecha</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <MaterialIcons name="close" size={20} color={Colors.subtitulo} />
            </TouchableOpacity>
          </View>

          {/* Month Selector */}
          <View style={s.monthSelector}>
            <TouchableOpacity onPress={prevMonth} style={s.navBtn}>
              <MaterialIcons name="chevron-left" size={24} color={Colors.titulo} />
            </TouchableOpacity>
            <Text style={s.monthText}>{`${MONTH_NAMES[currentMonth]} ${currentYear}`}</Text>
            <TouchableOpacity onPress={nextMonth} style={s.navBtn}>
              <MaterialIcons name="chevron-right" size={24} color={Colors.titulo} />
            </TouchableOpacity>
          </View>

          {/* Weekday labels */}
          <View style={s.weekDays}>
            {WEEKDAYS.map((wd, idx) => (
              <Text key={idx} style={s.weekDayText}>{wd}</Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={s.daysGrid}>
            {days.map((day, idx) => {
              if (day === null) {
                return <View key={`empty-${idx}`} style={s.dayCell} />;
              }

              const selected = isSelected(day);
              const disabled = isPast(day);

              return (
                <TouchableOpacity
                  key={`day-${day.getDate()}`}
                  style={[
                    s.dayCell,
                    selected && s.dayCellSelected,
                    disabled && s.dayCellDisabled
                  ]}
                  disabled={disabled}
                  onPress={() => handleSelectDay(day)}
                >
                  <Text style={[
                    s.dayText,
                    selected && s.dayTextSelected,
                    disabled && s.dayTextDisabled
                  ]}>
                    {day.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer close button */}
          <TouchableOpacity style={s.confirmBtn} onPress={onClose}>
            <Text style={s.confirmBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(70, 64, 60, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#fbf8ea',
    borderRadius: BorderRadius.md,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(198,177,125,0.4)',
    ...Shadow.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198,177,125,0.15)',
    paddingBottom: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.titulo,
    fontFamily: 'PlayfairDisplay-Bold',
  },
  closeBtn: {
    padding: 4,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  navBtn: {
    padding: 3,
    borderRadius: 99,
    backgroundColor: 'rgba(198, 177, 125, 0.15)',
  },
  monthText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.extra1,
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  weekDayText: {
    width: 32,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: Colors.subtitulo,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 2,
    paddingHorizontal: 4,
  },
  dayCell: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    marginBottom: 2,
  },
  dayCellSelected: {
    backgroundColor: Colors.titulo,
  },
  dayCellDisabled: {
    backgroundColor: 'transparent',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.extra1,
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  dayTextDisabled: {
    color: 'rgba(96, 98, 86, 0.25)',
  },
  confirmBtn: {
    marginTop: 10,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(198,177,125,0.4)',
  },
  confirmBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.titulo,
  }
});
