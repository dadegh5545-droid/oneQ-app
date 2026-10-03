import { router, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { setLanguage, type Language } from '@/i18n';
import { makeStyles, radius, space, useTheme } from '@/theme';

export type ShellItem = { key: string; label: string; icon: IconName; href: Href };

type Props = {
  title: string;
  subtitle?: string;
  items: ShellItem[];
  activeKey: string;
  // "My facilities" (owners with several facilities, admins).
  switchHref?: Href;
  children: ReactNode;
};

const WIDE = 900;

// Dashboard frame: a dark burgundy side menu on wide screens, a top bar with a collapsible menu on phones.
// Rows follow the reading direction, so the menu sits on the right in Arabic.
export function DashboardShell({ title, subtitle, items, activeKey, switchHref, children }: Props) {
  const { width } = useWindowDimensions();
  const styles = useStyles();
  const wide = width >= WIDE;
  const [menuOpen, setMenuOpen] = useState(false);

  if (wide) {
    return (
      <View style={styles.root}>
        <SafeAreaView edges={['top', 'bottom']} style={styles.sidebar}>
          <Menu title={title} subtitle={subtitle} items={items} activeKey={activeKey} switchHref={switchHref} />
        </SafeAreaView>
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
          <View style={styles.page}>{children}</View>
        </ScrollView>
      </View>
    );
  }
  return (
    <SafeAreaView edges={['top']} style={styles.column}>
      <TopBar title={title} open={menuOpen} onToggle={() => setMenuOpen((o) => !o)} />
      {menuOpen ? (
        <View style={styles.dropdown}>
          <Menu title={title} subtitle={subtitle} items={items} activeKey={activeKey} switchHref={switchHref} onNavigate={() => setMenuOpen(false)} compact />
        </View>
      ) : null}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInnerNarrow}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

function TopBar({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.topBar}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('dashboard.shell.menu')} accessibilityState={{ expanded: open }} hitSlop={8} onPress={onToggle}>
        <Icon name={open ? 'close' : 'menu'} size={24} color={colors.sidebarText} />
      </Pressable>
      <AppText variant="headline" color={colors.sidebarText} numberOfLines={1} style={styles.flex}>
        {title}
      </AppText>
      <AppText variant="titleM" color={colors.sidebarText} lang="en" style={styles.brandSmall}>
        OneQ
      </AppText>
    </View>
  );
}

function Menu({ title, subtitle, items, activeKey, switchHref, onNavigate, compact }: Omit<Props, 'children'> & { onNavigate?: () => void; compact?: boolean }) {
  const { t, i18n } = useTranslation();
  const { colors, sectionAccent } = useTheme();
  const styles = useStyles();
  const go = (href: Href) => {
    onNavigate?.();
    router.navigate(href);
  };
  const language = (i18n.language === 'ar' ? 'ar' : 'en') as Language;
  return (
    <View style={[styles.menu, compact && styles.menuCompact]}>
      {!compact ? (
        <>
          <AppText variant="titleM" color={colors.sidebarText} lang="en" style={styles.brand}>
            OneQ
          </AppText>
          <View style={styles.facility}>
            <View style={[styles.dot, { backgroundColor: sectionAccent.accentSoft }]} />
            <View style={styles.flex}>
              <AppText variant="label" color={colors.sidebarText} numberOfLines={2}>
                {title}
              </AppText>
              {subtitle ? (
                <AppText variant="bodyS" color={colors.sidebarMuted} numberOfLines={1}>
                  {subtitle}
                </AppText>
              ) : null}
            </View>
          </View>
        </>
      ) : null}
      <View style={styles.items}>
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="link"
              accessibilityState={{ selected: active }}
              onPress={() => go(item.href)}
              style={({ pressed }) => [styles.item, active && styles.itemActive, pressed && !active && styles.itemPressed]}
            >
              <Icon name={item.icon} size={20} color={active ? colors.sidebarText : colors.sidebarMuted} />
              <AppText variant="label" color={active ? colors.sidebarText : colors.sidebarMuted} numberOfLines={1} style={styles.flex}>
                {item.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.footer}>
        <View style={styles.languages}>
          {(['ar', 'en'] as const).map((lang) => (
            <Pressable
              key={lang}
              accessibilityRole="button"
              accessibilityState={{ selected: language === lang }}
              onPress={() => language !== lang && setLanguage(lang)}
              style={[styles.lang, language === lang && styles.langActive]}
            >
              <AppText variant="bodyS" color={colors.sidebarText} lang={lang}>
                {lang === 'ar' ? 'العربية' : 'English'}
              </AppText>
            </Pressable>
          ))}
        </View>
        <Pressable accessibilityRole="button" onPress={() => go('/home')} style={styles.footerButton}>
          <Icon name="cellphone" size={18} color={colors.sidebarText} />
          <AppText variant="label" color={colors.sidebarText}>
            {t('dashboard.shell.customerView')}
          </AppText>
        </Pressable>
        {switchHref ? (
          <Pressable accessibilityRole="button" onPress={() => go(switchHref)} style={styles.footerButton}>
            <Icon name="swap-horizontal" size={18} color={colors.sidebarMuted} />
            <AppText variant="bodyS" color={colors.sidebarMuted}>
              {t('dashboard.shell.myFacilities')}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  flex: { flex: 1 },
  root: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
  column: { flex: 1, backgroundColor: colors.sidebar },
  sidebar: { width: 264, backgroundColor: colors.sidebar },
  content: { flex: 1, backgroundColor: colors.background },
  contentInner: { padding: space.xxl, alignItems: 'center' },
  contentInnerNarrow: { padding: space.lg, gap: space.lg, paddingBottom: space.xxxl },
  page: { width: '100%', maxWidth: 1180, gap: space.xl },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, backgroundColor: colors.sidebar },
  brandSmall: { fontSize: 18 },
  dropdown: { backgroundColor: colors.sidebar, paddingBottom: space.md },
  menu: { flex: 1, padding: space.lg, gap: space.lg },
  menuCompact: { flex: 0, paddingTop: 0 },
  brand: { fontSize: 26 },
  facility: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: colors.sidebarActive },
  dot: { width: 10, height: 10, borderRadius: 5 },
  items: { gap: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, minHeight: 44, borderRadius: radius.sm },
  itemActive: { backgroundColor: colors.sidebarActive },
  itemPressed: { opacity: 0.7 },
  footer: { marginTop: 'auto', gap: space.sm },
  languages: { flexDirection: 'row', gap: space.xs, padding: space.xs, borderRadius: radius.pill, backgroundColor: colors.sidebarActive, alignSelf: 'flex-start' },
  lang: { paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.pill },
  langActive: { backgroundColor: colors.sidebar },
  footerButton: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 40 },
}));
