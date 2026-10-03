import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { env } from '$amplify/env/catalogue';

import type { Schema } from '../../data/resource';
import { fail, text, unwrap, type ResolverEvent } from '../shared/data';
import { facilityView, listAll, sectionOf, statusOf } from '../shared/facilities';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();

// Customer reads of the dynamic catalogue. Model rules cannot filter rows by a field value, so customers never
// read Section or Gym directly: these queries return only visible sections and approved facilities of visible
// sections (docs/ENG-REVIEW-multi-section-v2.md §2).

const listSections = () => listAll((nextToken) => client.models.Section.list({ nextToken, limit: 100 }));

async function hiddenSections() {
  return new Set((await listSections()).filter((s) => s.status !== 'visible').map((s) => s.slug));
}

async function visibleSections() {
  const [sections, categories] = await Promise.all([
    listSections(),
    listAll((nextToken) => client.models.SectionCategory.list({ nextToken, limit: 500 })),
  ]);
  return sections
    .filter((s) => s.status === 'visible')
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      slug: s.slug,
      nameAr: s.nameAr,
      nameEn: s.nameEn ?? null,
      descAr: s.descAr ?? null,
      descEn: s.descEn ?? null,
      icon: s.icon,
      colorKey: s.colorKey,
      order: s.order,
      bookingMode: s.bookingMode,
      hasPractitioners: s.hasPractitioners,
      hasServices: s.hasServices,
      hasDepartments: s.hasDepartments,
      hasPackages: s.hasPackages,
      hasGallery: s.hasGallery,
      practitionerLabelAr: s.practitionerLabelAr ?? null,
      practitionerLabelEn: s.practitionerLabelEn ?? null,
      presetType: s.presetType,
      categories: categories
        .filter((c) => c.sectionId === s.slug)
        .sort((a, b) => a.order - b.order)
        .map((c) => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn ?? null, order: c.order })),
    }));
}

async function approvedFacilities(sectionId: string | null) {
  const [hidden, gyms] = await Promise.all([hiddenSections(), listAll((nextToken) => client.models.Gym.list({ nextToken, limit: 100 }))]);
  return gyms
    .filter((g) => statusOf(g) === 'approved' && !hidden.has(sectionOf(g)) && (!sectionId || sectionOf(g) === sectionId))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(facilityView);
}

async function approvedFacility(id: string) {
  const gym = await unwrap(client.models.Gym.get({ id }));
  if (!gym || statusOf(gym) !== 'approved' || (await hiddenSections()).has(sectionOf(gym))) return null;
  return facilityView(gym);
}

export const handler = async (event: ResolverEvent) => {
  const args = event.arguments;
  switch (event.fieldName) {
    case 'listVisibleSections':
      return visibleSections();
    case 'listApprovedFacilities':
      return approvedFacilities(args.sectionId == null ? null : (text(args.sectionId, 64) ?? fail('VALIDATION')));
    case 'getApprovedFacility':
      return approvedFacility(text(args.id, 64) ?? fail('VALIDATION'));
    default:
      throw new Error('UNSUPPORTED_OPERATION');
  }
};
