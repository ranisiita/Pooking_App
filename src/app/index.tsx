import React, { useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Platform, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Colors, Spacing, BorderRadius } from '../constants/theme';

// Breakpoints (matching Angular project's media queries)
const BP_SM = 480;   // small mobile
const BP_MD = 768;   // tablet
const BP_LG = 1024;  // desktop

const CATEGORIES = [
  { icon: 'hotel' as const,               label: 'Alojamiento', tab: 'alojamiento' },
  { icon: 'flight' as const,              label: 'Vuelos',       tab: 'vuelos'       },
  { icon: 'directions-car' as const,      label: 'Coches',       tab: 'coches'       },
  { icon: 'confirmation-number' as const, label: 'Atracciones',  tab: 'atracciones'  },
];

const videoSource = require('../../public/videos/Fondo_Pooking.mp4');

export default function HomeScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const nav = (tab: string) => router.push({ pathname: '/buscar', params: { tab } });

  const isMobile = width < BP_MD;
  const isTablet = width >= BP_MD && width < BP_LG;
  const isDesktop = width >= BP_LG;

  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    player.play();
  }, [player]);

  // ─── Responsive font sizes ────────────────────────────────────────────────
  // Mirrors Angular's: clamp(3.5rem, 8vw, 6rem) and clamp(1rem, 2.5vw, 1.4rem)
  const titleSize  = isMobile ? 36  : isTablet ? 52  : Math.min(72, width * 0.08);
  const subtitleSize = isMobile ? 14 : isTablet ? 18  : 22;
  const catIconSize  = isMobile ? 28 : 32;
  const heroPadH     = isMobile ? Spacing.md : Spacing.xl;

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ── HERO ── */}
        <View style={[s.hero, { height: Platform.OS === 'web' ? '100vh' as any : height }]}>
          <VideoView
            style={s.video}
            player={player}
            fullscreenOptions={{ enable: false }}
            allowsPictureInPicture={false}
            nativeControls={false}
            contentFit="cover"
            pointerEvents="none"
          />

          {/* Dark gradient overlay */}
          <LinearGradient
            colors={['rgba(70,64,60,0.35)', 'rgba(70,64,60,0.60)', 'rgba(70,64,60,0.80)']}
            style={s.heroOverlay}
          />

          {/* Transparent navbar — lives inside the hero so it overlays the video */}
          <Navbar transparent />

          {/* Hero content */}
          <View style={[s.heroContent, { paddingHorizontal: heroPadH }]}>
            <Text style={[s.heroTitle, { fontSize: titleSize }]}>
              ¿A dónde vamos hoy?
            </Text>
            <Text style={[s.heroSub, { fontSize: subtitleSize }]}>
              Pooking.com
            </Text>

            {/* Category grid — 2×2 on mobile, 1×4 on tablet/desktop */}
            <View style={[s.categories, isMobile && s.categoriesMobile]}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.tab}
                  style={[
                    s.catBtn,
                    isMobile
                      ? s.catBtnMobile          // 2-per-row on mobile
                      : { minWidth: 110 },
                  ]}
                  onPress={() => nav(cat.tab)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name={cat.icon} size={catIconSize} color="#fff" />
                  <Text style={s.catLabel}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <Footer />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1 },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  video: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    width: '100%', height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    width: '100%', height: '100%',
  },

  // Hero content — centred, sits above overlay
  heroContent: {
    position: 'relative',
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    maxWidth: 960,   // cap width on ultra-wide screens
    alignSelf: 'center',
  },

  heroTitle: {
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 20,
    marginBottom: Spacing.xs,
    // fontFamily: 'PlayfairDisplay-Bold',  // uncomment once fonts load
  },
  heroSub: {
    color: '#fff',
    fontWeight: '600',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: Spacing.lg,
  },

  // ── Category buttons ──────────────────────────────────────────────────────
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  // On mobile, allow 2 columns by constraining each button to ~45% width
  categoriesMobile: {
    gap: Spacing.sm,
  },
  catBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    backgroundColor: 'rgba(251,248,234,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(198,177,125,0.5)',
    borderRadius: BorderRadius.lg,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), background 0.3s ease, box-shadow 0.3s ease',
        backdropFilter: 'blur(6px)',
      } as any,
    }),
  },
  // On mobile: 2 per row — width = ~45% of screen
  catBtnMobile: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    minWidth: 130,
    flex: 1,
  },
  catLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
