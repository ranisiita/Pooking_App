import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { FlightService } from '../services/flights.service';
import { Colors, BorderRadius, Shadow } from '../constants/theme';

interface AirportAutocompleteProps {
  value: string;
  onSelect: (iataCode: string, displayName: string) => void;
  placeholder?: string;
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
  hasError?: boolean;
}

export default function AirportAutocomplete({
  value,
  onSelect,
  placeholder = 'Ciudad o aeropuerto',
  icon = 'flight',
  hasError,
}: AirportAutocompleteProps) {
  // All airports loaded once at mount — union of all 3 providers via cargarTodosAeropuertos()
  const [allAirports, setAllAirports] = useState<any[]>([]);
  // Server-side search results while user types (union across providers via buscarAeropuertos)
  const [liveResults, setLiveResults] = useState<any[]>([]);

  const [query, setQuery] = useState(value || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    FlightService.cargarTodosAeropuertos()
      .then(data => setAllAirports(data))
      .catch(err => console.warn('AirportAutocomplete: error loading airports', err));
  }, []);

  useEffect(() => {
    if (value !== query) setQuery(value || '');
  }, [value]);

  // When user types ≥2 chars, fetch server-side results (union across all providers)
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setLiveResults([]);
      return;
    }
    const timer = setTimeout(() => {
      FlightService.buscarAeropuertos(query.trim())
        .then(data => setLiveResults(data))
        .catch(() => setLiveResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Show server results when typing (already a full union), otherwise show initial list
  const suggestions = query.trim().length >= 2 ? liveResults : allAirports.slice(0, 8);

  return (
    <View style={s.wrap}>
      <View style={[s.inputWrap, focused && s.inputFocused, hasError && s.inputError]}>
        <MaterialIcons name={icon} size={18} color="rgba(255,255,255,0.9)" style={s.icon} />
        <TextInput
          style={s.input}
          value={query}
          onChangeText={v => {
            setQuery(v);
            setShowDropdown(true);
          }}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.45)"
          onFocus={() => { setFocused(true); setShowDropdown(true); }}
          onBlur={() => {
            setFocused(false);
            setTimeout(() => setShowDropdown(false), 250);
          }}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); onSelect('', ''); }}>
            <MaterialIcons name="clear" size={18} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        )}
      </View>

      {showDropdown && suggestions.length > 0 && (
        <View style={s.dropdown}>
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={{ maxHeight: 210 }}>
            {suggestions.map(item => {
              const display = item.display || `${item.nombre} (${item.codigoIata})`;
              return (
                <TouchableOpacity
                  key={item.codigoIata}
                  style={s.item}
                  onPress={() => {
                    setQuery(display);
                    onSelect(item.codigoIata, display);
                    setShowDropdown(false);
                  }}
                >
                  <MaterialIcons name="flight" size={16} color={Colors.titulo} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemName}>{item.nombre}</Text>
                    <Text style={s.itemCode}>{item.codigoIata}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'relative',
    zIndex: 10,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  inputFocused: {
    borderColor: 'rgba(255,255,255,0.65)',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  inputError: {
    borderColor: Colors.error,
  },
  icon: { marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
  },
  dropdown: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(198,177,125,0.35)',
    borderRadius: BorderRadius.md,
    zIndex: 999,
    overflow: 'hidden',
    ...Shadow.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198,177,125,0.12)',
    gap: 10,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.extra1,
  },
  itemCode: {
    fontSize: 11,
    color: Colors.subtitulo,
  },
});
