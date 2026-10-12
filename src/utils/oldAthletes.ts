import { supabase } from '../../supabase';
import { buildIndemnityPdf, indemnityPdfFileName } from './indemnityPdf';
import { TERMS_VERSION } from './indemnityText';
import { FROZEN_TEXTS } from './frozenTexts';
import { documentsKeepUntil, profileDeleteAfter } from './retention';

/**
 * OLD ATHLETES
 * When the owner removes a child, the record is not deleted. It moves to the
 * old_athletes table (owner only), split in two so the privacy notice can be kept:
 *
 *   documents  the signed forms (Terms, privacy notice, photo consent, signature and a
 *              saved PDF). Kept until documents_keep_until: the child's 19th birthday,
 *              or 5 years after an adult leaves.
 *   profile    everything else (contact details, health notes, class and attendance
 *              links). Deleted from 12 months after the child left.
 *
 * Financial records (invoices and payments) are not moved: they stay where they are
 * and are kept 7 years.
 */

export { documentsKeepUntil, profileDeleteAfter };

/** True when the app still holds the wording this record was signed under. */
export function canBuildPack(rec: any): boolean {
  const v = String(rec?.version || '');
  return v === TERMS_VERSION || !!FROZEN_TEXTS.terms?.[v];
}

/** The signed registration pack for a child, from their record and their consent records. */
export function buildPackFor(student: any, consents: any[]): { doc: ReturnType<typeof buildIndemnityPdf>; fileName: string } | null {
  const rec = student?.indemnity_record;
  if (!canBuildPack(rec)) return null;
  const general = (consents || []).find(c => c.kind === 'general' && c.status !== 'pending');
  const photo = (consents || []).find(c => c.kind === 'media' && c.status !== 'pending');
  const doc = buildIndemnityPdf({
    privacyVersion: general?.form_version || null,
    media: photo ? { version: photo.form_version, choices: photo.choices, status: photo.status, signedAt: photo.signed_at, history: photo.history } : null,
    studentName: student.name, dob: student.dob, age: student.age, className: student.class_name,
    audience: rec.audience === 'adult' ? 'adult' : 'minor',
    parentName: student.parent1_name || '', relationship: rec.relationship || '',
    phone: student.parent1_phone, email: student.parent1_email,
    parent2Name: student.parent2_name, parent2Phone: student.parent2_phone,
    emergency: rec.emergency_contact || null, medicalNotes: student.medical_notes,
    young: student.young_athlete || null, signature: student.signature_data,
    signedAt: student.indemnity_date, version: rec.version
  });
  return { doc, fileName: indemnityPdfFileName(student.name, student.indemnity_date) };
}

export interface OldAthleteRow {
  id: string; user_id: string; original_id: string; source_table: 'tumbling_students' | 'team_athletes';
  name: string | null; left_at: string;
  documents: any; documents_keep_until: string | null;
  profile: any; profile_delete_after: string | null; profile_deleted_at: string | null;
}

const DOCUMENT_FIELDS = ['signature_data', 'indemnity_signed', 'indemnity_date', 'indemnity_record'] as const;

/**
 * Copy a child into old_athletes. Nothing is removed yet: the caller deletes the live
 * record next and then calls removeArchivedConsents (or undoArchive if the delete failed).
 * Returns an error message (or null) and the ids of the consent records that were copied.
 */
export async function archiveAthlete(opts: {
  ownerId: string; student: any; table: 'tumbling_students' | 'team_athletes';
  sessionIds: string[]; classIds: string[];
}): Promise<{ error: string | null; consentIds: string[] }> {
  const { ownerId, student, table } = opts;
  const leftAt = new Date();
  const { is_gym_member, ...row } = student;
  const documents: any = {};
  DOCUMENT_FIELDS.forEach(f => { if (row[f] !== undefined) documents[f] = row[f]; });
  const profileRow: any = { ...row };
  DOCUMENT_FIELDS.forEach(f => { delete profileRow[f]; });

  // The privacy and photo records belong to this child alone when their key is the child's id.
  let consents: any[] = [];
  if (table === 'tumbling_students') {
    const { data } = await supabase.from('consent_records').select('*').eq('user_id', ownerId).eq('family_key', String(student.id));
    consents = data || [];
  }
  documents.consent_records = consents;

  try {
    const pack = buildPackFor(student, consents);
    if (pack) {
      documents.signed_pdf = pack.doc.output('datauristring');
      documents.signed_pdf_file_name = pack.fileName;
      documents.signed_pdf_terms_version = student.indemnity_record?.version;
    }
  } catch (e) {
    console.error('Could not save the signed PDF with the archive', e);
  }

  const { error } = await supabase.from('old_athletes').upsert({
    user_id: ownerId, original_id: String(student.id), source_table: table, name: student.name || null,
    left_at: leftAt.toISOString(),
    documents,
    documents_keep_until: table === 'tumbling_students' ? documentsKeepUntil(student.dob, leftAt) : null,
    profile: { row: profileRow, removed_from: { sessions: opts.sessionIds, classes: opts.classIds } },
    profile_delete_after: profileDeleteAfter(leftAt),
    profile_deleted_at: null
  }, { onConflict: 'user_id,original_id' });
  if (error) return { error: error.message, consentIds: [] };
  return { error: null, consentIds: consents.map(c => c.id) };
}

/** The signed records now live in the archive: take them out of the live list. */
export async function removeArchivedConsents(ownerId: string, ids: string[]): Promise<void> {
  if (ids.length > 0) await supabase.from('consent_records').delete().in('id', ids).eq('user_id', ownerId);
}

/** The live delete failed: remove the archive copy so nothing is listed twice. */
export async function undoArchive(ownerId: string, originalId: string): Promise<void> {
  await supabase.from('old_athletes').delete().eq('user_id', ownerId).eq('original_id', String(originalId));
}

/** Put a child back exactly as they were. Returns an error message, or null. */
export async function restoreAthlete(row: OldAthleteRow): Promise<string | null> {
  if (row.profile_deleted_at || !row.profile?.row) {
    return 'Their other details were already deleted, so this child cannot be put back.';
  }
  const docs = row.documents || {};
  const record: any = { ...row.profile.row };
  DOCUMENT_FIELDS.forEach(f => { if (docs[f] !== undefined) record[f] = docs[f]; });
  const { error } = await supabase.from(row.source_table).insert(record);
  if (error) return error.message;

  if (Array.isArray(docs.consent_records) && docs.consent_records.length > 0) {
    await supabase.from('consent_records').upsert(docs.consent_records, { onConflict: 'id' });
  }

  // Best effort: put them back into the classes and sessions they were taken out of.
  const removed = row.profile.removed_from || {};
  const addTo = async (table: string, column: string, ids: string[]) => {
    for (const id of ids || []) {
      const { data } = await supabase.from(table).select(column).eq('id', id).maybeSingle();
      if (!data) continue;
      const current: string[] = (data as any)[column] || [];
      if (current.includes(row.original_id)) continue;
      await supabase.from(table).update({ [column]: [...current, row.original_id] }).eq('id', id);
    }
  };
  await addTo('class_types', 'enrolled_student_ids', removed.classes);
  await addTo('sessions', 'student_ids', removed.sessions);

  await supabase.from('old_athletes').delete().eq('id', row.id);
  return null;
}

/** Delete everything except the signed forms (due 12 months after leaving). */
export async function deleteOtherDetails(id: string): Promise<string | null> {
  const { error } = await supabase.from('old_athletes').update({ profile: {}, profile_deleted_at: new Date().toISOString() }).eq('id', id);
  return error ? error.message : null;
}

/** Delete the whole archive entry, signed forms included. */
export async function deleteOldAthlete(id: string): Promise<string | null> {
  const { error } = await supabase.from('old_athletes').delete().eq('id', id);
  return error ? error.message : null;
}
