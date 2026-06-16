import React from 'react';
import {
  View, Text, StyleSheet, Platform, Pressable,
} from 'react-native';
import { Colors, Spacing } from '../constants/theme';

interface FooterLink {
  label: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

const DEFAULT_SECTIONS: FooterSection[] = [
  {
    title: 'Asistencia',
    links: [
      { label: 'Centro de ayuda' },
      { label: 'Cómo funciona' },
      { label: 'Contáctanos' },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { label: 'Sobre nosotros' },
      { label: 'Términos y condiciones' },
      { label: 'Privacidad' },
    ],
  },
];

interface FooterProps {
  brandName?: string;
  copyrightText?: string;
  sections?: FooterSection[];
}

export default function Footer({
  brandName = 'Pooking.com',
  copyrightText = 'Todos los derechos reservados.',
  sections = DEFAULT_SECTIONS,
}: FooterProps) {
  return (
    <View style={s.footer}>
      <View style={s.inner}>
        {/* Brand */}
        <View style={s.brand}>
          <Text style={s.brandName}>{brandName}</Text>
          <Text style={s.brandCopy}>{copyrightText}</Text>
        </View>

        {/* Links Grid */}
        <View style={s.linksGrid}>
          {sections.map((section) => (
            <View key={section.title} style={s.section}>
              <Text style={s.sectionTitle}>{section.title}</Text>
              {section.links.map((link) => (
                <Pressable
                  key={link.label}
                  style={({ hovered }: any) => [s.linkRow, hovered && s.linkRowHovered]}
                >
                  {({ hovered }: any) => (
                    <Text style={[s.linkText, hovered && s.linkTextHovered]}>
                      {link.label}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>
          ))}
        </View>
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
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: Spacing.lg,
  },

  // Brand column
  brand: {
    flexDirection: 'column',
    gap: 4,
    minWidth: 200,
    maxWidth: 280,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.titulo,
    letterSpacing: 0.5,
  },
  brandCopy: {
    fontSize: 13,
    color: Colors.subtitulo,
  },

  // Links grid
  linksGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
  },
  section: {
    flexDirection: 'column',
    gap: 6,
    minWidth: 120,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: Colors.extra1,
    marginBottom: 2,
  },
  linkRow: {
    paddingVertical: 2,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  linkRowHovered: {},
  linkText: {
    fontSize: 14,
    color: Colors.subtitulo,
  },
  linkTextHovered: {
    color: Colors.titulo,
  },
});
