import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../constants/theme';

interface FooterProps {
  brandName?: string;
  copyrightText?: string;
}

export default function Footer({
  brandName = 'Pooking.com',
  copyrightText = 'Todos los derechos reservados.',
}: FooterProps) {
  return (
    <View style={s.footer}>
      <View style={s.inner}>
        <Text style={s.brandName}>{brandName}</Text>
        <Text style={s.brandCopy}>{copyrightText}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  footer: {
    marginTop: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: 'rgba(198,177,125,0.35)',
    backgroundColor: 'rgba(251,248,234,0.96)',
  },
  inner: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.titulo,
    letterSpacing: 0.5,
  },
  brandCopy: {
    fontSize: 13,
    color: Colors.subtitulo,
  },
});
