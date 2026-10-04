import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import type { AdminFacilityInput, FacilityStatus, FacilitySummary, ServiceMode } from '@/domain/dashboard';
import { isValidEmail, isValidFullName, isValidQatarMobile, toQatarE164 } from '@/domain/validation';
import { localized } from '@/features/dashboard/FacilityDashboard';
import { QueryState } from '@/features/dashboard/shared';
import { Badge, ChipRow, EmptyRow, ListRow, PageHeader, Panel } from '@/features/dashboard/ui';
import { makeStyles, space, useTheme } from '@/theme';
import { errorMessage } from '@/utils/errorMessage';

import { useAdminSaveFacility, useConsoleFacilities, useConsoleSections, useCreateOwner, useOwners, useSetFacilityStatus } from '../hooks';

const STATUS_TONE = { pending: 'warning', approved: 'success', suspended: 'danger' } as const;

// All facilities: filters by section, status and area, search, add (with an existing or a new owner account),
// approve / reject with a reason / suspend / reactivate / move to another section / change owner.
export function FacilitiesScreen() {
  const { t } = useTranslation();
  const { isRTL } = useTheme();
  const styles = useStyles();
  const facilities = useConsoleFacilities();
  const sections = useConsoleSections();
  const [section, setSection] = useState('all');
  const [status, setStatus] = useState<FacilityStatus | 'all'>('all');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (facilities.data ?? []).filter(
      (f) => (section === 'all' || f.sectionId === section) && (status === 'all' || f.status === status) && (!q || f.name.toLowerCase().includes(q) || f.area.toLowerCase().includes(q)),
    );
  }, [facilities.data, section, status, query]);
  const sectionName = (slug: string) => {
    const s = sections.data?.find((x) => x.slug === slug);
    return s ? localized(s.nameAr, s.nameEn, isRTL) : slug;
  };

  return (
    <>
      <PageHeader title={t('console.menu.facilities')} subtitle={t('console.facilities.count', { count: rows.length })} right={<Button label={t('console.facilities.add')} onPress={() => setAdding(true)} />} />
      {adding ? <FacilityForm onDone={() => setAdding(false)} /> : null}
      <Panel>
        <TextField label={t('console.facilities.search')} value={query} onChangeText={setQuery} />
        <ChipRow>
          <Chip label={t('dashboard.all')} selected={section === 'all'} onPress={() => setSection('all')} />
          {(sections.data ?? []).map((s) => (
            <Chip key={s.slug} label={localized(s.nameAr, s.nameEn, isRTL)} selected={section === s.slug} onPress={() => setSection(s.slug)} />
          ))}
        </ChipRow>
        <ChipRow>
          {(['all', 'pending', 'approved', 'suspended'] as const).map((s) => (
            <Chip key={s} label={s === 'all' ? t('dashboard.all') : t(`dashboard.facilityStatus.${s}`)} selected={status === s} onPress={() => setStatus(s)} />
          ))}
        </ChipRow>
      </Panel>
      <Panel>
        {!facilities.data ? <QueryState query={facilities} /> : null}
        {facilities.data && rows.length === 0 ? <EmptyRow text={t('console.facilities.empty')} /> : null}
        {rows.map((f) => (
          <View key={f.id} style={styles.item}>
            <ListRow
              title={f.name}
              subtitle={`${sectionName(f.sectionId)} · ${f.area}${f.statusReason && f.statusReason !== 'sample' ? ` · ${f.statusReason}` : ''}`}
              end={<Badge label={t(`dashboard.facilityStatus.${f.status}`)} tone={STATUS_TONE[f.status]} />}
              onPress={() => setOpen(open === f.id ? null : f.id)}
            />
            {open === f.id ? <FacilityActions facility={f} /> : null}
          </View>
        ))}
      </Panel>
    </>
  );
}

export function FacilityActions({ facility }: { facility: FacilitySummary }) {
  const { t } = useTranslation();
  const { colors, isRTL } = useTheme();
  const styles = useStyles();
  const toast = useToast();
  const setStatus = useSetFacilityStatus();
  const save = useAdminSaveFacility();
  const sections = useConsoleSections();
  const owners = useOwners();
  const [mode, setMode] = useState<'reject' | 'suspend' | 'move' | 'owner' | null>(null);
  const [reason, setReason] = useState('');

  const change = (status: FacilityStatus, why: string | null) =>
    setStatus.mutate(
      { id: facility.id, status, reason: why },
      {
        onSuccess: () => {
          toast(t('dashboard.saved'));
          setMode(null);
          setReason('');
        },
        onError: (e) => toast(errorMessage(e)),
      },
    );
  const update = (patch: Partial<AdminFacilityInput>) => {
    const owner = patch.ownerId ?? facility.ownerId;
    if (!owner) return toast(t('console.facilities.ownerRequired'));
    save.mutate(
      {
        id: facility.id,
        input: {
          ownerId: owner,
          sectionId: facility.sectionId,
          name: facility.name,
          area: facility.area,
          address: facility.address,
          description: facility.description,
          phone: facility.phone,
          whatsapp: facility.whatsapp,
          region: facility.region,
          monthlyPrice: 0,
          serviceMode: facility.serviceMode,
          ...patch,
        },
      },
      {
        onSuccess: () => {
          toast(t('dashboard.saved'));
          setMode(null);
        },
        onError: (e) => toast(errorMessage(e)),
      },
    );
  };

  return (
    <View style={styles.actions}>
      <View style={styles.buttons}>
        {facility.status !== 'approved' ? <Button variant="text" label={t('console.facilities.approve')} onPress={() => change('approved', null)} /> : null}
        {facility.status === 'pending' ? <Button variant="text" label={t('console.facilities.reject')} onPress={() => setMode('reject')} /> : null}
        {facility.status === 'approved' ? <Button variant="text" label={t('console.facilities.suspend')} onPress={() => setMode('suspend')} /> : null}
        <Button variant="text" label={t('console.facilities.move')} onPress={() => setMode('move')} />
        <Button variant="text" label={t('console.facilities.changeOwner')} onPress={() => setMode('owner')} />
        <Button variant="text" label={t('console.facilities.openDashboard')} onPress={() => router.push(`/dashboard/${facility.id}` as Href)} />
      </View>
      {mode === 'reject' || mode === 'suspend' ? (
        <View style={styles.inline}>
          <TextField label={t('console.facilities.reason')} value={reason} onChangeText={setReason} />
          <Button
            label={mode === 'reject' ? t('console.facilities.reject') : t('console.facilities.suspend')}
            disabled={!reason.trim()}
            loading={setStatus.isPending}
            onPress={() => change('suspended', `${mode === 'reject' ? t('console.facilities.rejectedPrefix') : ''}${reason.trim()}`)}
          />
        </View>
      ) : null}
      {mode === 'move' ? (
        <ChipRow>
          {(sections.data ?? []).map((s) => (
            <Chip key={s.slug} label={localized(s.nameAr, s.nameEn, isRTL)} selected={facility.sectionId === s.slug} onPress={() => update({ sectionId: s.slug })} />
          ))}
        </ChipRow>
      ) : null}
      {mode === 'owner' ? (
        <View style={styles.inline}>
          {!owners.data ? <QueryState query={owners} /> : null}
          {owners.data && owners.data.length === 0 ? (
            <AppText variant="bodyS" color={colors.textSecondary}>
              {t('console.facilities.noOwners')}
            </AppText>
          ) : null}
          <ChipRow>
            {(owners.data ?? []).map((o) => (
              <Chip key={o.ownerKey} label={o.fullName || o.email} selected={facility.ownerId === o.ownerKey} onPress={() => update({ ownerId: o.ownerKey })} />
            ))}
          </ChipRow>
        </View>
      ) : null}
    </View>
  );
}

// New facility by an admin: approved directly, and never without an owner (existing account or a new invitation).
function FacilityForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const { colors, isRTL } = useTheme();
  const styles = useStyles();
  const toast = useToast();
  const sections = useConsoleSections();
  const owners = useOwners();
  const createOwner = useCreateOwner();
  const save = useAdminSaveFacility();
  const [ownerMode, setOwnerMode] = useState<'existing' | 'new'>('existing');
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [owner, setOwner] = useState({ fullName: '', email: '', phone: '' });
  const [f, setF] = useState({ sectionId: '', name: '', area: '', address: '', description: '', phone: '', whatsapp: '', region: '', monthlyPrice: '', serviceMode: 'inShop' as ServiceMode });
  const [submitted, setSubmitted] = useState(false);
  const preset = sections.data?.find((s) => s.slug === f.sectionId)?.presetType;
  const ownerOk = ownerMode === 'existing' ? !!ownerId : isValidFullName(owner.fullName) && isValidEmail(owner.email) && isValidQatarMobile(owner.phone);
  const fieldsOk = !!f.sectionId && !!f.name.trim() && !!f.area.trim() && !!f.address.trim() && !!f.description.trim();
  const phoneOk = (v: string) => !v || isValidQatarMobile(v);

  const onSave = async () => {
    setSubmitted(true);
    if (!ownerOk || !fieldsOk || !phoneOk(f.phone) || !phoneOk(f.whatsapp)) return;
    try {
      const key = ownerMode === 'existing' ? ownerId! : (await createOwner.mutateAsync({ ...owner, phone: toQatarE164(owner.phone)! })).ownerKey;
      await save.mutateAsync({
        id: null,
        input: {
          ownerId: key,
          sectionId: f.sectionId,
          name: f.name.trim(),
          area: f.area.trim(),
          address: f.address.trim(),
          description: f.description.trim(),
          phone: f.phone ? toQatarE164(f.phone) : null,
          whatsapp: f.whatsapp ? toQatarE164(f.whatsapp) : null,
          region: f.region.trim() || null,
          monthlyPrice: /^\d{1,6}$/.test(f.monthlyPrice) ? Number(f.monthlyPrice) : 0,
          serviceMode: preset === 'salon' ? f.serviceMode : null,
        },
      });
      toast(t('console.facilities.created'));
      onDone();
    } catch (e) {
      toast(errorMessage(e));
    }
  };
  const req = (bad: boolean) => (submitted && bad ? t('dashboard.required') : undefined);

  return (
    <Panel title={t('console.facilities.newTitle')}>
      <AppText variant="label">{t('console.facilities.ownerQuestion')}</AppText>
      <ChipRow>
        <Chip label={t('console.facilities.existingOwner')} selected={ownerMode === 'existing'} onPress={() => setOwnerMode('existing')} />
        <Chip label={t('console.facilities.newOwner')} selected={ownerMode === 'new'} onPress={() => setOwnerMode('new')} />
      </ChipRow>
      {ownerMode === 'existing' ? (
        <>
          {owners.data && owners.data.length === 0 ? (
            <AppText variant="bodyS" color={colors.textSecondary}>
              {t('console.facilities.noOwners')}
            </AppText>
          ) : null}
          <ChipRow>
            {(owners.data ?? []).map((o) => (
              <Chip key={o.ownerKey} label={o.fullName || o.email} selected={ownerId === o.ownerKey} onPress={() => setOwnerId(o.ownerKey)} />
            ))}
          </ChipRow>
          {submitted && !ownerId ? (
            <AppText variant="bodyS" color={colors.error}>
              {t('console.facilities.ownerRequired')}
            </AppText>
          ) : null}
        </>
      ) : (
        <>
          <TextField label={t('console.accounts.fullName')} value={owner.fullName} onChangeText={(v) => setOwner((o) => ({ ...o, fullName: v }))} error={req(!isValidFullName(owner.fullName))} />
          <TextField label={t('console.accounts.email')} value={owner.email} onChangeText={(v) => setOwner((o) => ({ ...o, email: v }))} keyboardType="email-address" autoCapitalize="none" error={req(!isValidEmail(owner.email))} />
          <TextField label={t('console.accounts.phone')} value={owner.phone} onChangeText={(v) => setOwner((o) => ({ ...o, phone: v }))} keyboardType="phone-pad" prefix="+974" error={req(!isValidQatarMobile(owner.phone))} />
          <AppText variant="bodyS" color={colors.textTertiary}>
            {t('console.accounts.inviteHint')}
          </AppText>
        </>
      )}
      <AppText variant="label">{t('console.facilities.section')}</AppText>
      <ChipRow>
        {(sections.data ?? []).map((s) => (
          <Chip key={s.slug} label={localized(s.nameAr, s.nameEn, isRTL)} selected={f.sectionId === s.slug} onPress={() => setF((x) => ({ ...x, sectionId: s.slug }))} />
        ))}
      </ChipRow>
      <TextField label={t('console.facilities.name')} value={f.name} onChangeText={(v) => setF((x) => ({ ...x, name: v }))} error={req(!f.name.trim())} />
      <View style={styles.pair}>
        <View style={styles.flex}>
          <TextField label={t('console.facilities.area')} value={f.area} onChangeText={(v) => setF((x) => ({ ...x, area: v }))} error={req(!f.area.trim())} />
        </View>
        <View style={styles.flex}>
          <TextField label={t('console.facilities.region')} value={f.region} onChangeText={(v) => setF((x) => ({ ...x, region: v }))} />
        </View>
      </View>
      <TextField label={t('console.facilities.address')} value={f.address} onChangeText={(v) => setF((x) => ({ ...x, address: v }))} error={req(!f.address.trim())} />
      <TextField label={t('console.facilities.description')} value={f.description} onChangeText={(v) => setF((x) => ({ ...x, description: v }))} multiline error={req(!f.description.trim())} />
      <View style={styles.pair}>
        <View style={styles.flex}>
          <TextField label={t('console.facilities.phone')} value={f.phone} onChangeText={(v) => setF((x) => ({ ...x, phone: v }))} keyboardType="phone-pad" prefix="+974" error={submitted && !phoneOk(f.phone) ? t('validation.phone') : undefined} />
        </View>
        <View style={styles.flex}>
          <TextField label={t('console.facilities.whatsapp')} value={f.whatsapp} onChangeText={(v) => setF((x) => ({ ...x, whatsapp: v }))} keyboardType="phone-pad" prefix="+974" error={submitted && !phoneOk(f.whatsapp) ? t('validation.phone') : undefined} />
        </View>
      </View>
      {preset === 'gym' ? <TextField label={t('console.facilities.monthlyPrice')} value={f.monthlyPrice} onChangeText={(v) => setF((x) => ({ ...x, monthlyPrice: v }))} keyboardType="number-pad" /> : null}
      {preset === 'salon' ? (
        <>
          <AppText variant="label">{t('console.facilities.serviceMode')}</AppText>
          <ChipRow>
            {(['inShop', 'home', 'both'] as const).map((m) => (
              <Chip key={m} label={t(`console.serviceMode.${m}`)} selected={f.serviceMode === m} onPress={() => setF((x) => ({ ...x, serviceMode: m }))} />
            ))}
          </ChipRow>
        </>
      ) : null}
      <AppText variant="bodyS" color={colors.textTertiary}>
        {t('console.facilities.approvedHint')}
      </AppText>
      <View style={styles.pair}>
        <Button label={t('dashboard.save')} onPress={onSave} loading={save.isPending || createOwner.isPending} style={styles.flex} />
        <Button variant="outlined" label={t('dashboard.cancel')} onPress={onDone} style={styles.flex} />
      </View>
    </Panel>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  flex: { flex: 1 },
  item: { borderBottomWidth: 1, borderBottomColor: colors.surfaceVariant },
  actions: { gap: space.sm, paddingBottom: space.md },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  inline: { gap: space.sm },
  pair: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
}));
