import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import type { DepartmentRow } from '@/domain/dashboard';
import { makeStyles, space, useTheme } from '@/theme';
import { errorMessage } from '@/utils/errorMessage';

import { localized, useCurrentFacility } from '../FacilityDashboard';
import { useFacilityDepartments, useFacilityTrainers, useSaveDepartment } from '../hooks';
import { QueryState } from '../shared';
import { EmptyRow, ListRow, PageHeader, Panel } from '../ui';

type DepartmentInput = { id: string | null; nameAr: string; nameEn: string; sortOrder: number };

// Sub-departments of a clinic or hospital; doctors are linked to them from their profile.
export function DepartmentsScreen() {
  const { t } = useTranslation();
  const { isRTL } = useTheme();
  const { facility } = useCurrentFacility();
  const departments = useFacilityDepartments(facility.id);
  const doctors = useFacilityTrainers(facility.id);
  const [editing, setEditing] = useState<DepartmentInput | null>(null);
  const list = [...(departments.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const edit = (d: DepartmentRow) => setEditing({ id: d.id, nameAr: d.nameAr, nameEn: d.nameEn ?? '', sortOrder: d.sortOrder });

  return (
    <>
      <PageHeader
        title={t('dashboard.menu.departments')}
        right={<Button label={t('dashboard.departments.add')} onPress={() => setEditing({ id: null, nameAr: '', nameEn: '', sortOrder: list.length })} />}
      />
      {editing ? <DepartmentEditor facilityId={facility.id} initial={editing} onDone={() => setEditing(null)} /> : null}
      <Panel>
        {!departments.data ? <QueryState query={departments} /> : null}
        {departments.data && list.length === 0 ? <EmptyRow text={t('dashboard.empty.departments')} /> : null}
        {list.map((d) => (
          <ListRow
            key={d.id}
            title={localized(d.nameAr, d.nameEn, isRTL)}
            subtitle={t('dashboard.departments.doctors', { count: (doctors.data ?? []).filter((x) => x.departmentId === d.id).length })}
            end={<Button variant="text" label={t('dashboard.edit')} onPress={() => edit(d)} />}
          />
        ))}
      </Panel>
    </>
  );
}

function DepartmentEditor({ facilityId, initial, onDone }: { facilityId: string; initial: DepartmentInput; onDone: () => void }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const toast = useToast();
  const save = useSaveDepartment(facilityId);
  const [d, setD] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const onSave = () => {
    setSubmitted(true);
    if (!d.nameAr.trim()) return;
    save.mutate(
      { id: d.id, nameAr: d.nameAr.trim(), nameEn: d.nameEn.trim() || null, sortOrder: d.sortOrder },
      {
        onSuccess: () => {
          toast(t('dashboard.saved'));
          onDone();
        },
        onError: (e) => toast(errorMessage(e)),
      },
    );
  };
  return (
    <Panel title={d.id ? t('dashboard.departments.editTitle') : t('dashboard.departments.newTitle')}>
      <TextField label={t('dashboard.services.nameAr')} value={d.nameAr} onChangeText={(v) => setD((x) => ({ ...x, nameAr: v }))} error={submitted && !d.nameAr.trim() ? t('dashboard.required') : undefined} />
      <TextField label={t('dashboard.services.nameEn')} value={d.nameEn} onChangeText={(v) => setD((x) => ({ ...x, nameEn: v }))} />
      <View style={styles.pair}>
        <Button label={t('dashboard.save')} onPress={onSave} loading={save.isPending} style={styles.flex} />
        <Button variant="outlined" label={t('dashboard.cancel')} onPress={onDone} style={styles.flex} />
      </View>
    </Panel>
  );
}

const useStyles = makeStyles(() => ({
  flex: { flex: 1 },
  pair: { flexDirection: 'row', gap: space.md },
}));
