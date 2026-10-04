import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { isValidEmail, isValidFullName, isValidQatarMobile, toQatarE164 } from '@/domain/validation';
import { localized } from '@/features/dashboard/FacilityDashboard';
import { QueryState, shortDay, Stars } from '@/features/dashboard/shared';
import { Badge, ChipRow, EmptyRow, ListRow, PageHeader, Panel } from '@/features/dashboard/ui';
import { ltr } from '@/i18n';
import { makeStyles, space, useTheme } from '@/theme';
import { confirmAction } from '@/utils/confirm';
import { errorMessage } from '@/utils/errorMessage';
import { formatDate, localizeTime, qar } from '@/utils/format';

import { useAllBookings, useAllReviews, useCancelBooking, useConsoleFacilities, useConsoleSections, useCreateOwner, useOwners, useRemoveReview, useSuspendAccount } from '../hooks';
import { FacilityActions } from './FacilitiesScreen';

// ── Requests: facilities waiting for approval, oldest first ──
export function RequestsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();
  const facilities = useConsoleFacilities();
  const pending = (facilities.data ?? []).filter((f) => f.status === 'pending');
  return (
    <>
      <PageHeader title={t('console.menu.requests')} subtitle={t('console.requests.subtitle')} />
      <Panel>
        {!facilities.data ? <QueryState query={facilities} /> : null}
        {facilities.data && pending.length === 0 ? <EmptyRow text={t('console.overview.nothing')} /> : null}
        {pending.map((f) => (
          <View key={f.id} style={styles.item}>
            <ListRow title={f.name} subtitle={`${f.area} · ${f.address}`} />
            <AppText variant="bodyS" color={colors.textSecondary} numberOfLines={2}>
              {f.description}
            </AppText>
            <FacilityActions facility={f} />
          </View>
        ))}
      </Panel>
    </>
  );
}

// ── Bookings: every booking, filtered by section, facility and status; cancel with a reason ──
export function ConsoleBookingsScreen() {
  const { t } = useTranslation();
  const { colors, isRTL } = useTheme();
  const styles = useStyles();
  const toast = useToast();
  const bookings = useAllBookings();
  const sections = useConsoleSections();
  const cancel = useCancelBooking();
  const [section, setSection] = useState('all');
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (bookings.data ?? []).filter(
      (b) => (section === 'all' || (b.sectionId ?? 'gym') === section) && (status === 'all' || b.status === status) && (!q || b.gymName.toLowerCase().includes(q) || b.guest.fullName.toLowerCase().includes(q)),
    );
  }, [bookings.data, section, status, query]);
  const when = (b: (typeof rows)[number]) =>
    b.date ? `${formatDate(`${b.date.slice(0, 10)}T00:00:00`, 'd MMM y')} · ${b.timeLabel ? localizeTime(b.timeLabel) : ''}` : `${shortDay(b.membershipStart)} → ${shortDay(b.membershipEnd)}`;

  return (
    <>
      <PageHeader title={t('console.menu.bookings')} subtitle={t('dashboard.bookings.count', { count: rows.length })} />
      <Panel>
        <TextField label={t('console.bookings.search')} value={query} onChangeText={setQuery} />
        <ChipRow>
          <Chip label={t('dashboard.all')} selected={section === 'all'} onPress={() => setSection('all')} />
          {(sections.data ?? []).map((s) => (
            <Chip key={s.slug} label={localized(s.nameAr, s.nameEn, isRTL)} selected={section === s.slug} onPress={() => setSection(s.slug)} />
          ))}
        </ChipRow>
        <ChipRow>
          {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((s) => (
            <Chip key={s} label={s === 'all' ? t('dashboard.all') : t(`console.bookingStatus.${s}`)} selected={status === s} onPress={() => setStatus(s)} />
          ))}
        </ChipRow>
      </Panel>
      <Panel>
        {!bookings.data ? <QueryState query={bookings} /> : null}
        {bookings.data && rows.length === 0 ? <EmptyRow text={t('dashboard.empty.bookings')} /> : null}
        {rows.slice(0, 200).map((b) => (
          <View key={b.id} style={styles.item}>
            <ListRow
              title={`${b.gymName} · ${b.guest.fullName}`}
              subtitle={`${b.trainerName ?? b.planName ?? ''} · ${when(b)} · ${qar(b.priceQar)}${b.cancelReason ? ` · ${b.cancelReason}` : ''}`}
              end={<Badge label={t(`console.bookingStatus.${b.status}`)} tone={b.status === 'cancelled' ? 'danger' : b.status === 'confirmed' ? 'success' : 'neutral'} />}
            />
            {b.status === 'confirmed' || (b.status as string) === 'pending' ? (
              cancelling === b.id ? (
                <View style={styles.inline}>
                  <TextField label={t('console.facilities.reason')} value={reason} onChangeText={setReason} />
                  <View style={styles.pair}>
                    <Button
                      label={t('admin.cancelBooking')}
                      disabled={!reason.trim()}
                      loading={cancel.isPending}
                      style={styles.flex}
                      onPress={() =>
                        cancel.mutate(
                          { id: b.id, reason: reason.trim() },
                          {
                            onSuccess: () => {
                              toast(t('dashboard.saved'));
                              setCancelling(null);
                              setReason('');
                            },
                            onError: (e) => toast(errorMessage(e)),
                          },
                        )
                      }
                    />
                    <Button variant="outlined" label={t('dashboard.cancel')} onPress={() => setCancelling(null)} style={styles.flex} />
                  </View>
                </View>
              ) : (
                <Button variant="text" label={t('admin.cancelBooking')} onPress={() => setCancelling(b.id)} />
              )
            ) : null}
          </View>
        ))}
        {rows.length > 200 ? (
          <AppText variant="bodyS" color={colors.textTertiary}>
            {t('console.bookings.limited')}
          </AppText>
        ) : null}
      </Panel>
    </>
  );
}

// ── Accounts: facility owner accounts (invite by email only), suspend / enable ──
export function AccountsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();
  const toast = useToast();
  const owners = useOwners();
  const create = useCreateOwner();
  const suspend = useSuspendAccount();
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ fullName: '', email: '', phone: '' });
  const [submitted, setSubmitted] = useState(false);
  const ok = isValidFullName(f.fullName) && isValidEmail(f.email) && isValidQatarMobile(f.phone);

  const onCreate = () => {
    setSubmitted(true);
    if (!ok) return;
    create.mutate(
      { fullName: f.fullName.trim(), email: f.email.trim(), phone: toQatarE164(f.phone)! },
      {
        onSuccess: () => {
          toast(t('console.accounts.invited'));
          setAdding(false);
          setF({ fullName: '', email: '', phone: '' });
          setSubmitted(false);
        },
        onError: (e) => toast(errorMessage(e)),
      },
    );
  };
  const toggle = (username: string, enabled: boolean) =>
    confirmAction(enabled ? t('console.accounts.confirmSuspend') : t('console.accounts.confirmEnable'), enabled ? t('console.accounts.suspend') : t('console.accounts.enable'), () =>
      suspend.mutate(
        { username, suspended: enabled },
        {
          onSuccess: (n) => toast(enabled ? t('console.accounts.suspended', { count: n }) : t('dashboard.saved')),
          onError: (e) => toast(errorMessage(e)),
        },
      ),
    );

  return (
    <>
      <PageHeader title={t('console.menu.accounts')} subtitle={t('console.accounts.subtitle')} right={<Button label={t('console.accounts.add')} onPress={() => setAdding(true)} />} />
      {adding ? (
        <Panel title={t('console.accounts.add')}>
          <TextField label={t('console.accounts.fullName')} value={f.fullName} onChangeText={(v) => setF((x) => ({ ...x, fullName: v }))} error={submitted && !isValidFullName(f.fullName) ? t('validation.fullName') : undefined} />
          <TextField label={t('console.accounts.email')} value={f.email} onChangeText={(v) => setF((x) => ({ ...x, email: v }))} keyboardType="email-address" autoCapitalize="none" error={submitted && !isValidEmail(f.email) ? t('validation.email') : undefined} />
          <TextField label={t('console.accounts.phone')} value={f.phone} onChangeText={(v) => setF((x) => ({ ...x, phone: v }))} keyboardType="phone-pad" prefix="+974" error={submitted && !isValidQatarMobile(f.phone) ? t('validation.phone') : undefined} />
          <AppText variant="bodyS" color={colors.textTertiary}>
            {t('console.accounts.inviteHint')}
          </AppText>
          <View style={styles.pair}>
            <Button label={t('console.accounts.invite')} onPress={onCreate} loading={create.isPending} style={styles.flex} />
            <Button variant="outlined" label={t('dashboard.cancel')} onPress={() => setAdding(false)} style={styles.flex} />
          </View>
        </Panel>
      ) : null}
      <Panel>
        {!owners.data ? <QueryState query={owners} /> : null}
        {owners.data && owners.data.length === 0 ? <EmptyRow text={t('console.accounts.empty')} /> : null}
        {(owners.data ?? []).map((o) => (
          <ListRow
            key={o.username}
            title={o.fullName || o.email}
            subtitle={`${o.email}${o.phone ? ` · ${ltr(o.phone)}` : ''} · ${t('console.sections.facilities', { count: o.facilities })}`}
            end={
              <View style={styles.end}>
                <Badge label={o.enabled ? t('console.accounts.active') : t('console.accounts.disabled')} tone={o.enabled ? 'success' : 'danger'} />
                <Button variant="text" label={o.enabled ? t('console.accounts.suspend') : t('console.accounts.enable')} onPress={() => toggle(o.username, o.enabled)} />
              </View>
            }
          />
        ))}
      </Panel>
    </>
  );
}

// ── Reviews: moderation (remove); reviews are never edited ──
export function ConsoleReviewsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();
  const toast = useToast();
  const reviews = useAllReviews();
  const remove = useRemoveReview();
  return (
    <>
      <PageHeader title={t('console.menu.reviews')} subtitle={t('dashboard.reviews.count', { count: reviews.data?.length ?? 0 })} />
      <Panel>
        {!reviews.data ? <QueryState query={reviews} /> : null}
        {reviews.data && reviews.data.length === 0 ? <EmptyRow text={t('dashboard.empty.reviews')} /> : null}
        {(reviews.data ?? []).slice(0, 300).map((r) => (
          <View key={r.id} style={styles.item}>
            <View style={styles.pair}>
              <Stars rating={r.rating} />
              <AppText variant="bodyS" color={colors.textTertiary}>{`${r.authorName} · ${shortDay(r.date)} · ${r.gymId ?? r.trainerId ?? ''}`}</AppText>
            </View>
            {r.text ? <AppText>{r.text}</AppText> : null}
            <Button
              variant="text"
              label={t('admin.removeReview')}
              onPress={() =>
                confirmAction(t('admin.confirmRemoveReview'), t('admin.removeReview'), () =>
                  remove.mutate(r.id, { onSuccess: () => toast(t('dashboard.saved')), onError: (e) => toast(errorMessage(e)) }),
                )
              }
            />
          </View>
        ))}
      </Panel>
    </>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  flex: { flex: 1 },
  item: { gap: space.xs, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.surfaceVariant },
  inline: { gap: space.sm },
  pair: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm },
  end: { alignItems: 'flex-end', gap: 2 },
}));
